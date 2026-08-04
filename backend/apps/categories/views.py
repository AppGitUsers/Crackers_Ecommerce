from django.db.models import Count, Q
from rest_framework import viewsets

from apps.accounts.permissions import ReadOnlyOrAdminCRM
from .models import Category
from .serializers import CategorySerializer


class CategoryViewSet(viewsets.ModelViewSet):
    """
    Public storefront: GET /api/categories/ (only active ones, for the filter bar).
    Admin CRM: full CRUD, including inactive categories, with product counts.
    """
    serializer_class = CategorySerializer
    permission_classes = [ReadOnlyOrAdminCRM]
    filterset_fields = ["is_active"]
    search_fields = ["name"]

    def get_queryset(self):
        # annotate() drops the model's default Meta.ordering, so it has to be
        # re-applied explicitly or display_order is silently ignored.
        qs = Category.objects.annotate(product_count=Count("products")).order_by("display_order", "name")
        if not (self.request.user and self.request.user.is_authenticated):
            qs = qs.filter(is_active=True)
        return qs
