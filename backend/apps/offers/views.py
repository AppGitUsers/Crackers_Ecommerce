from rest_framework import viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.accounts.permissions import IsAdminCRMUser
from .models import Offer
from .serializers import OfferSerializer
from .services import get_active_offers


class OfferViewSet(viewsets.ModelViewSet):
    """Admin CRM: full CRUD on offers (Buy X Get Y / Amount Discount)."""
    queryset = Offer.objects.all().select_related("buy_x_get_y", "amount_discount")
    serializer_class = OfferSerializer
    permission_classes = [IsAdminCRMUser]
    filterset_fields = ["offer_type", "is_active"]


@api_view(["GET"])
@permission_classes([AllowAny])
def active_banner_offers(request):
    """
    GET /api/offers/active/
    Public endpoint the storefront hits to render the top banner
    ('Buy 1 Get 1 on Sparklers!' / 'Spend ₹2000 get ₹300 off').
    """
    offers = get_active_offers()
    return Response(OfferSerializer(offers, many=True, context={"request": request}).data)
