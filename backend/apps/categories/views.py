from django.db.models import Count, Q
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

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

    @action(detail=True, methods=["delete"], url_path="remove_image")
    def remove_image(self, request, pk=None):
        """DELETE /api/categories/{id}/remove_image/ — clears the image field and deletes the file from disk."""
        category = self.get_object()
        if category.image:
            category.image.delete(save=False)
            category.image = None
            category.save(update_fields=["image"])
        return Response(status=status.HTTP_204_NO_CONTENT)
