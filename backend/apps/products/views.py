from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response

from apps.accounts.permissions import ReadOnlyOrAdminCRM
from .models import Product, ProductImage
from .serializers import ProductListSerializer, ProductDetailSerializer, ProductImageSerializer


class ProductPagination(PageNumberPagination):
    """
    Lets a client ask for a smaller page (e.g. `?page_size=8` for the
    homepage's per-category preview strip) or a normal-sized one for the
    infinite-scroll feed — capped so nobody can request the whole catalog
    in one shot via `page_size=9999`.
    """
    page_size_query_param = "page_size"
    max_page_size = 50


class ProductViewSet(viewsets.ModelViewSet):
    permission_classes = [ReadOnlyOrAdminCRM]
    parser_classes = [MultiPartParser, FormParser]
    pagination_class = ProductPagination
    filterset_fields = ["category", "is_available"]
    ordering_fields = ["price", "created_at", "stock_quantity"]

    def get_queryset(self):
        qs = Product.objects.select_related("category").prefetch_related("images")
        if not (self.request.user and self.request.user.is_authenticated):
            qs = qs.filter(is_available=True, category__is_active=True)

        # Handled manually rather than via DRF's SearchFilter: SearchFilter
        # splits the query on whitespace and requires each word to match
        # independently, which makes a multi-word product name (e.g. "Ashoka
        # Chakkar") impossible to match against itself — every word after the
        # first fails since "name" can't start with two different strings at
        # once. The storefront search bar just wants "products starting with
        # exactly what was typed", so match the whole (unsplit) string.
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(name__istartswith=search)
        return qs

    def get_serializer_class(self):
        if self.action == "list":
            return ProductListSerializer
        return ProductDetailSerializer

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx

    @action(detail=True, methods=["post"], parser_classes=[MultiPartParser, FormParser])
    def upload_image(self, request, pk=None):
        """
        POST /api/products/{id}/upload_image/  (multipart, field name 'image')
        Used by the admin's product form — same endpoint whether the file came
        from the phone camera or the gallery picker, the browser handles that part.

        Products only ever show a single photo (storefront/cart/search all read
        `primary_image`, nothing renders a gallery), so this replaces whatever
        image(s) the product already has rather than accumulating more —
        deleting the old row(s) and their files from disk first.
        """
        product = self.get_object()
        image = request.FILES.get("image")
        if not image:
            return Response({"detail": "No image file provided."}, status=status.HTTP_400_BAD_REQUEST)
        for existing in product.images.all():
            existing.image.delete(save=False)
            existing.delete()
        img = ProductImage.objects.create(product=product, image=image, is_primary=True)
        return Response(ProductImageSerializer(img, context={"request": request}).data, status=201)

    @action(detail=True, methods=["delete"], url_path="images/(?P<image_id>[^/.]+)")
    def delete_image(self, request, pk=None, image_id=None):
        product = self.get_object()
        instance = product.images.filter(id=image_id).first()
        if instance:
            instance.image.delete(save=False)
            instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
