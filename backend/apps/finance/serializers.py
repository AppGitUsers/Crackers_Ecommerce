from rest_framework import serializers
from .models import Transaction


class TransactionSerializer(serializers.ModelSerializer):
    recorded_by_name = serializers.CharField(source="recorded_by.username", read_only=True, default=None)
    order_number = serializers.CharField(source="related_order.order_number", read_only=True, default=None)

    class Meta:
        model = Transaction
        fields = [
            "id", "transaction_type", "category", "amount", "description",
            "related_order", "order_number", "date", "recorded_by", "recorded_by_name", "created_at",
        ]
        read_only_fields = ["id", "created_at"]
