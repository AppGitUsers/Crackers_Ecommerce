from rest_framework import generics, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from apps.accounts.permissions import IsAdminCRMUser
from .models import CallLog
from .serializers import CallLogSerializer, OrderCallSummarySerializer
from .services import orders_with_call_summary, call_status_counts as get_call_status_counts


class CallLogViewSet(viewsets.ModelViewSet):
    """
    Admin CRM 'Calls' dashboard — sales follow-up tracking.
    Each row is a single call attempt; multiple rows can share the same
    `order` (filter with ?order=<id> to get one order's full call history).
    """
    queryset = CallLog.objects.select_related("customer", "order", "handled_by")
    serializer_class = CallLogSerializer
    permission_classes = [IsAdminCRMUser]
    filterset_fields = ["status", "was_called", "was_answered", "order"]
    search_fields = ["customer__name", "customer__phone"]
    ordering_fields = ["created_at", "updated_at", "follow_up_at"]

    def perform_create(self, serializer):
        serializer.save(handled_by=self.request.user)


class OrderCallSummaryView(generics.ListAPIView):
    """
    GET /api/calls/orders/?status=not_called&search=...
    The Calls dashboard's primary view: one row per order, showing its
    latest call status and call count. Drill into an order's full history
    via GET /api/calls/?order=<id>&ordering=created_at.
    """
    serializer_class = OrderCallSummarySerializer
    permission_classes = [IsAdminCRMUser]
    search_fields = ["order_number", "customer__name", "customer__phone"]
    ordering_fields = ["latest_call_at", "created_at"]
    # latest_call_at ties (e.g. a batch of orders backfilled in the same
    # instant) fall back to order recency, so newer orders sort first either way.
    ordering = ["-latest_call_at", "-created_at"]

    def get_queryset(self):
        qs = orders_with_call_summary().select_related("customer")
        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(latest_call_status=status_filter)
        return qs


@api_view(["GET"])
@permission_classes([IsAdminCRMUser])
def call_status_counts(request):
    """
    GET /api/calls/orders/status_counts/
    Per-status order counts for the Calls dashboard's summary tiles —
    always reflects every order regardless of whatever status filter or
    page the list itself currently has applied.
    """
    return Response(get_call_status_counts())
