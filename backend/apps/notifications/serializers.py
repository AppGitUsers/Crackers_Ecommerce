from rest_framework import serializers

from .models import PushSubscription


class SubscribeSerializer(serializers.Serializer):
    """Shape of the PushSubscription object the browser's PushManager.subscribe() returns."""
    endpoint = serializers.URLField(max_length=500)
    keys = serializers.DictField(child=serializers.CharField())

    def validate_keys(self, value):
        for key in ("p256dh", "auth"):
            if not value.get(key):
                raise serializers.ValidationError(f"Missing '{key}' key.")
        return value


class UnsubscribeSerializer(serializers.Serializer):
    endpoint = serializers.URLField(max_length=500)
