from rest_framework import serializers
from .models import CallLog


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
