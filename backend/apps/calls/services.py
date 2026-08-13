from django.db.models import Count, F, OuterRef, Subquery, Value
from django.db.models.functions import Coalesce

from apps.orders.models import Order

from .models import CallLog


def orders_with_call_summary():
    """
    Orders annotated with their call-follow-up state:
    call_count, and the status/timestamp of the most recent CallLog row.
    "Not called yet" is never stored as a row — an order with zero CallLog
    rows IS the not-called state, so call_count correctly starts at 0 and
    latest_call_status falls back to NOT_CALLED via Coalesce rather than
    a placeholder row. latest_call_at falls back to the order's own
    created_at so never-called orders still sort by true recency.
    Used both by the Calls dashboard (grouped-by-order list) and by the
    admin overview's "pending follow-up" count, so both agree on what
    an order's *current* call status means.
    """
    latest_call = CallLog.objects.filter(order=OuterRef("pk")).order_by("-created_at")
    return Order.objects.annotate(
        call_count=Count("call_logs", distinct=True),
        latest_call_status=Coalesce(
            Subquery(latest_call.values("status")[:1]), Value(CallLog.CallStatus.NOT_CALLED)
        ),
        latest_call_at=Coalesce(Subquery(latest_call.values("created_at")[:1]), F("created_at")),
    )
