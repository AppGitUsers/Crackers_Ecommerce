import json
import logging
import threading

from django.conf import settings
from pywebpush import WebPushException, webpush

from .models import PushSubscription

logger = logging.getLogger(__name__)


def _send_to_subscription(sub, payload):
    try:
        webpush(
            subscription_info={
                "endpoint": sub.endpoint,
                "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
            },
            data=json.dumps(payload),
            vapid_private_key=settings.VAPID_PRIVATE_KEY,
            vapid_claims={"sub": f"mailto:{settings.VAPID_CLAIM_EMAIL}"},
        )
    except WebPushException as e:
        status = e.response.status_code if e.response is not None else None
        if status in (404, 410):
            # Push service says this subscription is gone for good (browser data
            # cleared, permission revoked, uninstalled, ...) — stop retrying it.
            sub.delete()
        else:
            logger.warning("Push send failed for subscription %s: %s", sub.id, e)


def notify_new_order(order):
    """
    Fans a 'new order' push out to every admin/staff device currently
    subscribed. Runs on a background thread so a slow or failing push send
    never delays the response to the customer placing the order — there's no
    task queue in this stack, so a daemon thread is the pragmatic way to keep
    this off the request/response path without adding new infrastructure.
    """
    if not settings.VAPID_PRIVATE_KEY:
        return

    payload = {
        "title": "New order received",
        "body": f"{order.order_number} — ₹{order.total_amount} — {order.customer.name}",
        "url": "/admin/orders",
    }

    def _run():
        for sub in PushSubscription.objects.all():
            _send_to_subscription(sub, payload)

    threading.Thread(target=_run, daemon=True).start()
