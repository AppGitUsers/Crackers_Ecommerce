from rest_framework import serializers
from apps.customers.serializers import CustomerSerializer
from apps.customers.models import Customer
from .models import Order, OrderItem, OrderStatusHistory


class OrderStatusHistorySerializer(serializers.ModelSerializer):
    changed_by_name = serializers.CharField(source="changed_by.username", read_only=True, default=None)

    class Meta:
        model = OrderStatusHistory
        fields = ["id", "status_type", "status", "note", "changed_by_name", "timestamp"]


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ["id", "product", "product_name", "quantity", "unit_price", "is_free_item", "subtotal"]


class OrderListSerializer(serializers.ModelSerializer):
    """Lean — for the admin orders list & the customer's 'My Orders' list. Keeps the payload light and fast."""
    customer_name = serializers.CharField(source="customer.name", read_only=True)
    customer_phone = serializers.CharField(source="customer.phone", read_only=True)
    item_count = serializers.IntegerField(source="items.count", read_only=True)

    class Meta:
        model = Order
        fields = [
            "id", "order_number", "customer_name", "customer_phone",
            "current_status", "payment_status", "total_amount", "item_count", "created_at",
        ]


class OrderDetailSerializer(serializers.ModelSerializer):
    """Full — only fetched when an order is actually opened (admin detail view / customer tracking view)."""
    customer = CustomerSerializer(read_only=True)
    items = OrderItemSerializer(many=True, read_only=True)
    status_history = OrderStatusHistorySerializer(many=True, read_only=True)
    has_paid_transaction = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id", "order_number", "share_token", "customer", "items", "status_history",
            "current_status", "payment_status", "subtotal_amount", "discount_amount",
            "total_amount", "delivery_address", "applied_offers_summary", "admin_notes",
            "created_at", "updated_at", "has_paid_transaction",
        ]

    def get_has_paid_transaction(self, obj):
        # Whether this order actually has an income row in the Finance table —
        # the admin UI uses this to decide whether "Refunded" is even a
        # meaningful option (only makes sense if money was actually collected).
        return obj.transactions.filter(transaction_type="income").exists()


class CheckoutItemSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)


class CheckoutSerializer(serializers.Serializer):
    """Payload from the storefront's cart (built from browser localStorage) at checkout time."""
    name = serializers.CharField(max_length=150)
    phone = serializers.CharField(max_length=15)
    address = serializers.CharField(allow_blank=True, required=False)
    city = serializers.CharField(max_length=100, required=False, allow_blank=True)
    pincode = serializers.CharField(max_length=10, required=False, allow_blank=True)
    items = CheckoutItemSerializer(many=True)
    # Products the customer picked to redeem an active "spend ₹X, get ₹Y worth
    # of products free" offer — validated against that offer's ₹ budget in the
    # checkout view (see apps.offers.services.evaluate_cart_offers).
    free_product_selections = CheckoutItemSerializer(many=True, required=False, default=list)


class MyOrdersLookupSerializer(serializers.Serializer):
    phone = serializers.CharField(max_length=15)
