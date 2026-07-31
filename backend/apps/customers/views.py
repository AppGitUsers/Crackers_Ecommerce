from rest_framework import viewsets

from apps.accounts.permissions import IsAdminCRMUser
from .models import Customer
from .serializers import CustomerSerializer


class CustomerViewSet(viewsets.ModelViewSet):
    """Admin CRM only — storefront never lists all customers, only its own orders via phone lookup (see apps.orders)."""
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    permission_classes = [IsAdminCRMUser]
    search_fields = ["name", "phone"]
