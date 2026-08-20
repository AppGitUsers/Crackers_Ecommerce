from django.db.models import Count, F, OuterRef, Subquery, Value
from django.db.models.functions import Coalesce

from apps.orders.models import Order

from .models import CallLog


def _with_latest_call_status(queryset):
    """
    Annotates latest_call_status/latest_call_at only — deliberately without
    call_count. "Not called yet" is never stored as a row — an order with
    zero CallLog rows IS the not-called state, so latest_call_status falls
    back to NOT_CALLED via Coalesce rather than a placeholder row.
    latest_call_at falls back to the order's own created_at so never-called
    orders still sort by true recency.
    """
    latest_call = CallLog.objects.filter(order=OuterRef("pk")).order_by("-created_at")
    return queryset.annotate(
        latest_call_status=Coalesce(
            Subquery(latest_call.values("status")[:1]), Value(CallLog.CallStatus.NOT_CALLED)
        ),
        latest_call_at=Coalesce(Subquery(latest_call.values("created_at")[:1]), F("created_at")),
    )


def orders_with_call_summary():
    """
    Orders annotated with their call-follow-up state: call_count, plus the
    status/timestamp of the most recent CallLog row. Used both by the Calls
    dashboard (grouped-by-order list) and by the admin overview's "pending
    follow-up" count, so both agree on what an order's *current* call status
    means.
    """
    return _with_latest_call_status(Order.objects.annotate(call_count=Count("call_logs", distinct=True)))


def call_status_counts():
    """
    {status: order_count} across every status, for the Calls dashboard's
    summary tiles. Deliberately doesn't reuse orders_with_call_summary()'s
    queryset: that one already carries a Count("call_logs") join for
    call_count, and grouping+counting again on top of an existing join-based
    aggregate makes Django double-count orders that have more than one call
    log row (a classic multiple-annotation fan-out). Skipping call_count
    here sidesteps it entirely.
    """
    rows = _with_latest_call_status(Order.objects).values("latest_call_status").annotate(n=Count("id")).order_by()
    counts = {choice: 0 for choice, _ in CallLog.CallStatus.choices}
    for row in rows:
        counts[row["latest_call_status"]] = row["n"]
    return counts
