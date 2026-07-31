from rest_framework import viewsets

from apps.accounts.permissions import IsAdminCRMUser
from .models import CallLog
from .serializers import CallLogSerializer


class CallLogViewSet(viewsets.ModelViewSet):
    """Admin CRM 'Calls' dashboard — sales follow-up tracking."""
    queryset = CallLog.objects.select_related("customer", "order", "handled_by")
    serializer_class = CallLogSerializer
    permission_classes = [IsAdminCRMUser]
    filterset_fields = ["status", "was_called", "was_answered"]
    search_fields = ["customer__name", "customer__phone"]
    ordering_fields = ["created_at", "updated_at", "follow_up_at"]

    def perform_create(self, serializer):
        serializer.save(handled_by=self.request.user)
