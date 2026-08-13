from rest_framework import serializers
from .models import CallLog


class OrderCallSummarySerializer(serializers.Serializer):
    """One row per order for the Calls dashboard — the latest call's status
    stands in as the order's overall follow-up status."""
    id = serializers.IntegerField()
    order_number = serializers.CharField()
    customer_id = serializers.IntegerField()
    customer_name = serializers.CharField(source="customer.name")
    customer_phone = serializers.CharField(source="customer.phone")
    total_amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    created_at = serializers.DateTimeField()
    call_count = serializers.IntegerField()
    latest_call_status = serializers.CharField()
    latest_call_status_display = serializers.SerializerMethodField()
    latest_call_at = serializers.DateTimeField()

    def get_latest_call_status_display(self, obj):
        return dict(CallLog.CallStatus.choices).get(obj.latest_call_status, obj.latest_call_status)


class CallLogSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source="customer.name", read_only=True)
    customer_phone = serializers.CharField(source="customer.phone", read_only=True)
    order_number = serializers.CharField(source="order.order_number", read_only=True, default=None)
    handled_by_name = serializers.CharField(source="handled_by.username", read_only=True, default=None)

    class Meta:
        model = CallLog
        fields = [
            "id", "customer", "customer_name", "customer_phone", "order", "order_number",
            "was_called", "was_answered", "status", "follow_up_at", "notes",
            "handled_by", "handled_by_name", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
