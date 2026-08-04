import uuid
from django.conf import settings
from django.db import models

from apps.customers.models import Customer
from apps.products.models import Product


def generate_order_number():
    return f"ORD-{uuid.uuid4().hex[:8].upper()}"


class Order(models.Model):
    class FulfillmentStatus(models.TextChoices):
        RECEIVED = "received", "Received"
        PACKED = "packed", "Packed"
        OUT_FOR_DELIVERY = "out_for_delivery", "Out for Delivery"
        DELIVERED = "delivered", "Delivered"
        CANCELLED = "cancelled", "Cancelled"

    class PaymentStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        PAID = "paid", "Paid"
        FAILED = "failed", "Failed"
        REFUNDED = "refunded", "Refunded"

    order_number = models.CharField(max_length=20, unique=True, default=generate_order_number, editable=False)
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name="orders")

    # denormalized "current" fields for fast list/filter — full timeline lives in OrderStatusHistory
    current_status = models.CharField(max_length=20, choices=FulfillmentStatus.choices, default=FulfillmentStatus.RECEIVED)
    payment_status = models.CharField(max_length=20, choices=PaymentStatus.choices, default=PaymentStatus.PENDING)

    subtotal_amount = models.DecimalField(max_digits=10, decimal_places=2)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)

    delivery_address = models.TextField(blank=True)
    applied_offers_summary = models.TextField(
        blank=True, help_text="Human-readable snapshot of which offers applied, for record-keeping."
    )
    admin_notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.order_number


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="order_items")
    product_name = models.CharField(max_length=200)  # snapshot, in case product is later renamed
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    is_free_item = models.BooleanField(default=False, help_text="True if this line was granted free by an offer.")
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.quantity} x {self.product_name}"


class OrderStatusHistory(models.Model):
    """
    One row per status change (fulfillment OR payment), with a timestamp.
    This is the table that powers the 'received -> packed -> out for delivery
    -> delivered' timeline shown to the customer.
    """
    class StatusType(models.TextChoices):
        FULFILLMENT = "fulfillment", "Order Status"
        PAYMENT = "payment", "Payment Status"

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="status_history")
    status_type = models.CharField(max_length=20, choices=StatusType.choices)
    status = models.CharField(max_length=20)
    note = models.CharField(max_length=255, blank=True)
    changed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["timestamp"]
        verbose_name_plural = "order status history"

    def __str__(self):
        return f"{self.order.order_number} · {self.status_type}={self.status} @ {self.timestamp}"
