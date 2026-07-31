"""
Offer evaluation engine.

Used in two places:
  1. apps.offers.views.active_banner_offers  -> what to show in the top banner
  2. apps.orders.views checkout               -> what discount to actually apply

MVP design decisions (documented here so they're easy to revisit):
  - Buy X Get Y: the "free" quantity is only granted for units of the eligible
    free_products that are ALREADY in the cart (we don't auto-add items the
    customer didn't pick). If free_products is empty on the rule, the buy
    product itself becomes free for that quantity.
  - Amount discount ("spend ₹X get ₹Y off/free"): applies as a flat rupee
    discount off the order total once the qualifying subtotal is reached,
    for both discount_type variants. "Free products worth ₹Y" is recorded
    distinctly (discount_type) purely for the admin's/customer's own
    bookkeeping — letting the customer *pick* which free products to redeem
    is a frontend enhancement on top of this discount amount.
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


def evaluate_cart_offers(cart_items):
    """
    cart_items: list of dicts {product: Product, quantity: int, unit_price: Decimal}
    Returns: {
        "discount_amount": Decimal,
        "free_lines": [{"product_id": int, "quantity": int, "offer_name": str}],
        "applied_summary": [str, ...],
        "applied_offer_ids": [int, ...],
    }
    """
    discount_amount = Decimal("0.00")
    free_lines = []
    applied_summary = []
    applied_offer_ids = []

    qty_by_product = {ci["product"].id: ci["quantity"] for ci in cart_items}
    price_by_product = {ci["product"].id: ci["unit_price"] for ci in cart_items}
    subtotal = sum((ci["unit_price"] * ci["quantity"] for ci in cart_items), Decimal("0.00"))

    for offer in get_active_offers():
        if offer.offer_type == Offer.OfferType.BUY_X_GET_Y:
            rule = getattr(offer, "buy_x_get_y", None)
            if not rule:
                continue
            buy_ids = set(rule.buy_products.values_list("id", flat=True))
            total_buy_qty = sum(q for pid, q in qty_by_product.items() if pid in buy_ids)
            if rule.buy_quantity <= 0 or total_buy_qty < rule.buy_quantity:
                continue
            multiples = total_buy_qty // rule.buy_quantity
            free_qty_owed = int(multiples * rule.get_quantity)

            free_ids = list(rule.free_products.values_list("id", flat=True)) or list(buy_ids)
            for pid in free_ids:
                if free_qty_owed <= 0:
                    break
                available_in_cart = qty_by_product.get(pid, 0)
                grant = min(available_in_cart, free_qty_owed)
                if grant > 0:
                    discount_amount += grant * price_by_product[pid]
                    free_lines.append({"product_id": pid, "quantity": grant, "offer_name": offer.name})
                    free_qty_owed -= grant
            if free_lines and free_lines[-1]["offer_name"] == offer.name:
                applied_summary.append(f"{offer.name}: buy {rule.buy_quantity} get {rule.get_quantity} applied")
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
                relevant_subtotal = subtotal
            if relevant_subtotal >= rule.min_purchase_amount:
                discount_amount += rule.discount_value
                label = "off" if rule.discount_type == rule.DiscountType.FLAT_DISCOUNT else "worth of products free"
                applied_summary.append(f"{offer.name}: spend ₹{rule.min_purchase_amount}, get ₹{rule.discount_value} {label}")
                applied_offer_ids.append(offer.id)

    # never discount below zero
    discount_amount = min(discount_amount, subtotal)

    return {
        "discount_amount": discount_amount,
        "free_lines": free_lines,
        "applied_summary": applied_summary,
        "applied_offer_ids": applied_offer_ids,
    }
