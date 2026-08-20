import os

from django.http import HttpResponse
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import ReadOnlyOrAdminCRM
from apps.offers.services import get_product_discount_percentages
from apps.settings.services import get_bool_setting
from .models import Product, ProductImage, CatalogueFile
from .serializers import (
    ProductListSerializer, ProductDetailSerializer, ProductImageSerializer, CatalogueFileSerializer,
)

CATALOGUE_ALLOWED_EXTENSIONS = {".xlsx", ".xls", ".csv"}
CATALOGUE_MAX_SIZE_BYTES = 10 * 1024 * 1024  # 10MB


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
        # Fetched once per request/list here (not per product in the serializer)
        # to avoid a settings/offers query per row.
        ctx["reduce_stock"] = get_bool_setting("reduce_stock")
        ctx["discount_pct_map"] = get_product_discount_percentages()
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


class CatalogueFileView(APIView):
    """
    GET /api/products/catalogue-file/  — public, used by the storefront to check
    whether a downloadable catalogue exists.
    POST/DELETE — admin-only. Singleton by convention: uploading replaces
    whatever catalogue file was there before (old file removed from disk too).
    """
    permission_classes = [ReadOnlyOrAdminCRM]
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request):
        obj = CatalogueFile.objects.first()
        if not obj:
            return Response(None)
        return Response(CatalogueFileSerializer(obj, context={"request": request}).data)

    def post(self, request):
        upload = request.FILES.get("file")
        if not upload:
            return Response({"detail": "No file provided."}, status=status.HTTP_400_BAD_REQUEST)

        ext = os.path.splitext(upload.name)[1].lower()
        if ext not in CATALOGUE_ALLOWED_EXTENSIONS:
            return Response(
                {"detail": "Only Excel (.xlsx, .xls) or CSV files are allowed."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if upload.size > CATALOGUE_MAX_SIZE_BYTES:
            return Response({"detail": "File is too large (max 10MB)."}, status=status.HTTP_400_BAD_REQUEST)

        existing = CatalogueFile.objects.first()
        if existing:
            existing.file.delete(save=False)
            existing.delete()

        obj = CatalogueFile.objects.create(file=upload, original_filename=upload.name, uploaded_by=request.user)
        return Response(CatalogueFileSerializer(obj, context={"request": request}).data, status=status.HTTP_201_CREATED)

    def delete(self, request):
        existing = CatalogueFile.objects.first()
        if existing:
            existing.file.delete(save=False)
            existing.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CatalogueFileDownloadView(APIView):
    """GET /api/products/catalogue-file/download/ — public file download."""
    permission_classes = [ReadOnlyOrAdminCRM]

    def get(self, request):
        obj = CatalogueFile.objects.first()
        if not obj:
            return Response({"detail": "No catalogue file uploaded yet."}, status=status.HTTP_404_NOT_FOUND)
        response = HttpResponse(obj.file.read(), content_type="application/octet-stream")
        response["Content-Disposition"] = f'attachment; filename="{obj.original_filename}"'
        return response
