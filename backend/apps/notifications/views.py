from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from apps.accounts.permissions import IsAdminCRMUser
from .models import PushSubscription
from .serializers import SubscribeSerializer, UnsubscribeSerializer


@api_view(["GET"])
@permission_classes([IsAdminCRMUser])
def vapid_public_key(request):
    """GET /api/notifications/vapid-public-key/ — fetched at runtime rather than
    baked into the frontend build, so it can't go stale the way VITE_API_BASE_URL did."""
    return Response({"public_key": settings.VAPID_PUBLIC_KEY})


@api_view(["POST"])
@permission_classes([IsAdminCRMUser])
def subscribe(request):
    """POST /api/notifications/subscribe/ — registers (or re-registers) this
    device's push subscription for the logged-in admin/staff user."""
    serializer = SubscribeSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data
    PushSubscription.objects.update_or_create(
        endpoint=data["endpoint"],
        defaults={
            "user": request.user,
            "p256dh": data["keys"]["p256dh"],
            "auth": data["keys"]["auth"],
        },
    )
    return Response(status=201)


@api_view(["POST"])
@permission_classes([IsAdminCRMUser])
def unsubscribe(request):
    """POST /api/notifications/unsubscribe/ — removes this device's subscription
    (e.g. the admin clicked 'disable' or is no longer interested)."""
    serializer = UnsubscribeSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    PushSubscription.objects.filter(user=request.user, endpoint=serializer.validated_data["endpoint"]).delete()
    return Response(status=204)
