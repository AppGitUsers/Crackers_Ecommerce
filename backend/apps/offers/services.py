"""
Offer evaluation engine.

Used in two places:
  1. apps.offers.views.active_banner_offers  -> what to show in the top banner
  2. apps.orders.views checkout               -> what discount to actually apply

MVP design decisions (documented here so they're easy to revisit):
  - Buy X Get Y: once the buy_quantity threshold is met, the get_quantity is
    granted as an EXTRA line added to the order — never carved out of the
    quantity the customer already put in their cart. "Buy 3 get 1 free"
    means the order ends up with 3 paid units + 1 separate free unit (4
    total), not 3 units total with 1 of them marked free. If the rule lists
    multiple eligible free_products, the whole free_qty_owed goes to the
    first one in that list (no per-offer way to ask the customer to choose,
    unlike free_products_worth below). If free_products is empty, the buy
    product itself is what's granted free.
  - Amount discount, flat_discount: applies as a flat rupee discount off the
    order total once the qualifying subtotal is reached.
  - Amount discount, percentage_discount: no minimum/threshold at all — an
    unconditional %-off on whatever's in applicable_products (or the whole
    cart if empty), applied to every matching cart line whenever it's in the
    cart. min_purchase_amount is unused (stays 0) for this variant.
  - Amount discount, free_products_worth: does NOT auto-apply a discount.
    Instead it opens up a ₹ "free product budget" that the customer redeems
    by picking their own products at checkout (any product, not restricted
    to a per-offer list — see free_selections below). Like Buy X Get Y
    above, these picks are always EXTRA lines on the order, even if the
    customer happens to also be buying that same product elsewhere in
    their cart — the two never get merged.
  - Because every free grant is now a pure addition, "subtotal" for the
    order is the full retail value of everything in it (paid + free), and
    "discount" is the retail value of the free portion — they cancel out to
    exactly what the customer is actually charged.
"""
from decimal import Decimal
from django.utils import timezone
from .models import Offer


def get_active_offers():
    now = timezone.now()
    qs = Offer.objects.filter(is_active=True).select_related(
        "buy_x_get_y", "amount_discount"
    ).prefetch_related(
        "buy_x_get_y__buy_products", "buy_x_get_y__free_products", "amount_discount__applicable_products"
    )
    active = []
    for offer in qs:
        if offer.start_date and offer.start_date > now:
            continue
        if offer.end_date and offer.end_date < now:
            continue
        active.append(offer)
    return active


def evaluate_cart_offers(cart_items, free_selections=None):
    """
    cart_items: list of dicts {product: Product, quantity: int, unit_price: Decimal}
    free_selections: list of dicts {product: Product, quantity: int} — products the
        customer picked to redeem an active "free products worth ₹Y" offer.

    Returns: {
        "discount_amount": Decimal,
        "free_lines": [{"product_id": int, "quantity": int, "offer_name": str}],
        "applied_summary": [str, ...],
        "applied_offer_ids": [int, ...],
        "free_value": Decimal,   # retail value of every free line (buy-x-get-y + picked)
    }

    Raises ValueError if free_selections' total value exceeds the ₹ budget
    made available by qualifying free_products_worth offers.
    """
    free_selections = free_selections or []
    discount_amount = Decimal("0.00")
    free_lines = []
    applied_summary = []
    applied_offer_ids = []
    free_worth_budget = Decimal("0.00")
    free_worth_offer_name = None
    free_value = Decimal("0.00")

    qty_by_product = {ci["product"].id: ci["quantity"] for ci in cart_items}
    price_by_product = {ci["product"].id: ci["unit_price"] for ci in cart_items}
    cart_subtotal = sum((ci["unit_price"] * ci["quantity"] for ci in cart_items), Decimal("0.00"))
    free_selections_value = sum(
        (fs["product"].price * fs["quantity"] for fs in free_selections), Decimal("0.00")
    )

    for offer in get_active_offers():
        if offer.offer_type == Offer.OfferType.BUY_X_GET_Y:
            rule = getattr(offer, "buy_x_get_y", None)
            if not rule:
                continue
            buy_ids = set(p.id for p in rule.buy_products.all())
            total_buy_qty = sum(q for pid, q in qty_by_product.items() if pid in buy_ids)
            if rule.buy_quantity <= 0 or total_buy_qty < rule.buy_quantity:
                continue
            multiples = total_buy_qty // rule.buy_quantity
            free_qty_owed = int(multiples * rule.get_quantity)
            if free_qty_owed <= 0:
                continue

            free_products_list = list(rule.free_products.all()) or list(rule.buy_products.all())
            if not free_products_list:
                continue
            target = free_products_list[0]
            grant_value = free_qty_owed * target.price
            discount_amount += grant_value
            free_value += grant_value
            free_lines.append({"product_id": target.id, "quantity": free_qty_owed, "offer_name": offer.name})
            applied_summary.append(
                f"{offer.name}: buy {rule.buy_quantity} get {rule.get_quantity} free applied"
            )
            applied_offer_ids.append(offer.id)

        elif offer.offer_type == Offer.OfferType.AMOUNT_DISCOUNT:
            rule = getattr(offer, "amount_discount", None)
            if not rule:
                continue
            applicable_ids = set(rule.applicable_products.values_list("id", flat=True))
            if applicable_ids:
                relevant_subtotal = sum(
                    price_by_product[pid] * qty for pid, qty in qty_by_product.items() if pid in applicable_ids
                )
            else:
                relevant_subtotal = cart_subtotal

            if rule.discount_type == rule.DiscountType.PERCENTAGE_DISCOUNT:
                # Unconditional — no min_purchase_amount gate. Only "applies"
                # (shows up in the summary) if something in scope is actually
                # in the cart, same spirit as the other two staying silent
                # when they don't qualify.
                if relevant_subtotal > 0:
                    pct_discount = (relevant_subtotal * rule.discount_value / Decimal("100")).quantize(Decimal("0.01"))
                    discount_amount += pct_discount
                    applied_offer_ids.append(offer.id)
                    applied_summary.append(f"{offer.name}: {rule.discount_value}% off applicable products")
                continue

            if relevant_subtotal >= rule.min_purchase_amount:
                applied_offer_ids.append(offer.id)
                if rule.discount_type == rule.DiscountType.FLAT_DISCOUNT:
                    discount_amount += rule.discount_value
                    applied_summary.append(
                        f"{offer.name}: spend ₹{rule.min_purchase_amount}, get ₹{rule.discount_value} off"
                    )
                else:
                    free_worth_budget += rule.discount_value
                    if free_worth_offer_name is None:
                        free_worth_offer_name = offer.name
                    applied_summary.append(
                        f"{offer.name}: spend ₹{rule.min_purchase_amount}, get ₹{rule.discount_value} worth of products free"
                    )

    if free_selections:
        if free_selections_value > free_worth_budget:
            raise ValueError(
                f"Selected free products total ₹{free_selections_value}, which exceeds the "
                f"₹{free_worth_budget} available from active offers."
            )
        discount_amount += free_selections_value
        free_value += free_selections_value
        for fs in free_selections:
            free_lines.append({
                "product_id": fs["product"].id,
                "quantity": fs["quantity"],
                "offer_name": free_worth_offer_name or "Free product offer",
            })

    # never discount below the full value of what's actually in the order
    full_subtotal = cart_subtotal + free_value
    discount_amount = min(discount_amount, full_subtotal)

    return {
        "discount_amount": discount_amount,
        "free_lines": free_lines,
        "applied_summary": applied_summary,
        "applied_offer_ids": applied_offer_ids,
        "free_value": free_value,
    }


def get_product_discount_percentages():
    """
    {product_id: Decimal percentage} for every product covered by an active
    percentage_discount offer — used to show a struck-through discounted
    price directly on the storefront's product cards (informational only;
    the cart still stores the full price and the actual discount is computed
    and shown separately at checkout via evaluate_cart_offers above).

    get_active_offers() is already ordered highest-priority first, so the
    first offer seen covering a given product is kept and later ones are
    ignored for that product — same priority semantics used everywhere else.
    Key `None` holds the percentage for "applies to all products" offers
    (empty applicable_products), checked by callers as the fallback.
    """
    result = {}
    for offer in get_active_offers():
        if offer.offer_type != Offer.OfferType.AMOUNT_DISCOUNT:
            continue
        rule = getattr(offer, "amount_discount", None)
        if not rule or rule.discount_type != rule.DiscountType.PERCENTAGE_DISCOUNT:
            continue
        applicable_ids = list(rule.applicable_products.values_list("id", flat=True))
        keys = applicable_ids or [None]
        for key in keys:
            if key not in result:
                result[key] = rule.discount_value
    return result
