from decimal import Decimal

from django.db import transaction
from django.db.models import F
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.accounts.permissions import IsAdminCRMUser
from apps.customers.models import Customer
from apps.products.models import Product
from apps.offers.services import evaluate_cart_offers

from .models import Order, OrderItem, OrderStatusHistory
from .serializers import (
    OrderListSerializer, OrderDetailSerializer, CheckoutSerializer, MyOrdersLookupSerializer,
)


class OrderViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Admin CRM order dashboard.
    List view stays lean (see OrderListSerializer) so it loads fast;
    the full breakdown (items, customer, timeline) only loads on retrieve.
    """
    queryset = Order.objects.select_related("customer").prefetch_related("items", "status_history")
    permission_classes = [IsAdminCRMUser]
    filterset_fields = ["current_status", "payment_status"]
    search_fields = ["order_number", "customer__name", "customer__phone"]
    ordering_fields = ["created_at", "total_amount"]

    def get_serializer_class(self):
        if self.action == "list":
            return OrderListSerializer
        return OrderDetailSerializer

    @action(detail=True, methods=["post"], url_path="update-status")
    def update_status(self, request, pk=None):
        """
        POST /api/orders/{id}/update-status/
        body: { "status_type": "fulfillment" | "payment", "status": "packed", "note": "optional" }
        Order status and payment status are updated independently, each logged
        with a timestamp in OrderStatusHistory.
        """
        order = self.get_object()
        status_type = request.data.get("status_type")
        new_status = request.data.get("status")
        note = request.data.get("note", "")

        if status_type not in ("fulfillment", "payment"):
            return Response({"detail": "status_type must be 'fulfillment' or 'payment'."}, status=400)

        valid_values = dict(Order.FulfillmentStatus.choices) if status_type == "fulfillment" else dict(Order.PaymentStatus.choices)
        if new_status not in valid_values:
            return Response({"detail": f"Invalid status '{new_status}' for {status_type}."}, status=400)

        with transaction.atomic():
            if status_type == "fulfillment":
                order.current_status = new_status
            else:
                order.payment_status = new_status
            order.save(update_fields=["current_status", "payment_status", "updated_at"])
            OrderStatusHistory.objects.create(
                order=order, status_type=status_type, status=new_status,
                note=note, changed_by=request.user,
            )
        return Response(OrderDetailSerializer(order, context={"request": request}).data)


@api_view(["POST"])
@permission_classes([AllowAny])
def checkout(request):
    """
    POST /api/orders/checkout/
    Public — no login needed. The cart itself lives in browser localStorage
    until this call; this is what turns it into a real Order.
    """
    serializer = CheckoutSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data
    free_selection_lines = data.get("free_product_selections") or []

    product_ids = [i["product_id"] for i in data["items"]]
    free_product_ids = [i["product_id"] for i in free_selection_lines]
    products = {p.id: p for p in Product.objects.filter(id__in=set(product_ids) | set(free_product_ids))}

    missing = (set(product_ids) | set(free_product_ids)) - set(products.keys())
    if missing:
        return Response({"detail": f"Unknown product ids: {sorted(missing)}"}, status=400)

    cart_items = [
        {"product": products[line["product_id"]], "quantity": line["quantity"], "unit_price": products[line["product_id"]].price}
        for line in data["items"]
    ]
    free_selections = [
        {"product": products[line["product_id"]], "quantity": line["quantity"]}
        for line in free_selection_lines
    ]

    try:
        offer_result = evaluate_cart_offers(cart_items, free_selections=free_selections)
    except ValueError as e:
        return Response({"detail": str(e)}, status=400)

    # Buy X Get Y can grant a product that was never in the cart or the
    # customer's free picks (e.g. the offer's free product differs from what
    # they're buying) — fetch it now so stock can be checked and the order
    # item can reference it.
    free_qty_by_product = {}
    for fl in offer_result["free_lines"]:
        free_qty_by_product[fl["product_id"]] = free_qty_by_product.get(fl["product_id"], 0) + fl["quantity"]
    unresolved_ids = set(free_qty_by_product) - set(products.keys())
    if unresolved_ids:
        products.update({p.id: p for p in Product.objects.filter(id__in=unresolved_ids)})

    # Every free grant is an ADDITION to the order, never carved out of what's
    # already in the paid cart — "buy 3 get 1 free" means 3 paid + 1 separate
    # free unit (4 total), so stock has to cover paid + free combined.
    total_qty_needed = dict(free_qty_by_product)
    for ci in cart_items:
        total_qty_needed[ci["product"].id] = total_qty_needed.get(ci["product"].id, 0) + ci["quantity"]

    for product_id, needed_qty in total_qty_needed.items():
        product = products[product_id]
        if not product.in_stock or product.stock_quantity < needed_qty:
            free_note = " (including free units from an active offer)" if free_qty_by_product.get(product_id) else ""
            return Response(
                {"detail": f"'{product.name}' doesn't have enough stock{free_note} (need {needed_qty}, available {product.stock_quantity})."},
                status=400,
            )

    cart_subtotal = sum((ci["unit_price"] * ci["quantity"] for ci in cart_items), Decimal("0.00"))
    subtotal = cart_subtotal + offer_result["free_value"]
    discount_amount = offer_result["discount_amount"]
    total_amount = subtotal - discount_amount

    with transaction.atomic():
        customer, _ = Customer.objects.update_or_create(
            phone=data["phone"],
            defaults={
                "name": data["name"],
                "address": data.get("address", ""),
                "city": data.get("city", ""),
                "pincode": data.get("pincode", ""),
            },
        )

        order = Order.objects.create(
            customer=customer,
            subtotal_amount=subtotal,
            discount_amount=discount_amount,
            total_amount=total_amount,
            delivery_address=data.get("address", ""),
            applied_offers_summary="; ".join(offer_result["applied_summary"]),
        )

        for ci in cart_items:
            product = ci["product"]
            OrderItem.objects.create(
                order=order, product=product, product_name=product.name,
                quantity=ci["quantity"], unit_price=product.price, is_free_item=False,
                subtotal=product.price * ci["quantity"],
            )

        for product_id, qty in free_qty_by_product.items():
            product = products[product_id]
            OrderItem.objects.create(
                order=order, product=product, product_name=product.name,
                quantity=qty, unit_price=product.price, is_free_item=True,
                subtotal=Decimal("0.00"),
            )

        for product_id, needed_qty in total_qty_needed.items():
            Product.objects.filter(id=product_id).update(stock_quantity=F("stock_quantity") - needed_qty)

        OrderStatusHistory.objects.create(
            order=order, status_type="fulfillment", status=Order.FulfillmentStatus.RECEIVED,
        )
        OrderStatusHistory.objects.create(
            order=order, status_type="payment", status=Order.PaymentStatus.PENDING,
        )

    return Response(OrderDetailSerializer(order, context={"request": request}).data, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@permission_classes([AllowAny])
def my_orders(request):
    """
    GET /api/orders/my-orders/?phone=9876543210
    Powers 'My Orders' on the storefront — looked up by the phone number
    the customer gave at checkout, no login required.
    """
    phone = request.query_params.get("phone", "").strip()
    if not phone:
        return Response({"detail": "phone query param is required."}, status=400)

    customer = Customer.objects.filter(phone=phone).first()
    if not customer:
        return Response([])

    orders = Order.objects.filter(customer=customer).select_related("customer").prefetch_related(
        "items", "status_history"
    )
    return Response(OrderDetailSerializer(orders, many=True, context={"request": request}).data)
