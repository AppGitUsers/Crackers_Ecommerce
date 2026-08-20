from django.conf import settings
from django.db import models


class PushSubscription(models.Model):
    """
    One row per browser/device a staff member enabled notifications on — a
    single user can have several (phone, laptop, ...), each independently
    opted in via the browser's own Notification permission prompt.
    """
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="push_subscriptions")
    endpoint = models.URLField(max_length=500, unique=True)
    p256dh = models.CharField(max_length=255)
    auth = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} — {self.endpoint[:50]}"
