from django.conf import settings
from django.db import models

from apps.customers.models import Customer
from apps.orders.models import Order


class CallLog(models.Model):
    """
    Tracks the sales-follow-up call flow for an order/customer:
    did we call, did they answer, are they interested, did the deal close.
    """
    class CallStatus(models.TextChoices):
        NOT_CALLED = "not_called", "Not Called Yet"
        NO_ANSWER = "no_answer", "Called — No Answer"
        ANSWERED = "answered", "Called — Answered"
        DEAL_CLOSED = "deal_closed", "Deal Closed — Paid"
        CANCELLED = "cancelled", "Cancelled"

    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name="call_logs")
    order = models.ForeignKey(Order, on_delete=models.SET_NULL, null=True, blank=True, related_name="call_logs")

    was_called = models.BooleanField(default=False)
    was_answered = models.BooleanField(default=False)
    status = models.CharField(max_length=20, choices=CallStatus.choices, default=CallStatus.NOT_CALLED)
    follow_up_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)

    handled_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True, db_index=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return f"{self.customer.name} — {self.get_status_display()}"
