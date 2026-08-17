from decimal import Decimal

from django.urls import reverse
from rest_framework import serializers
from .models import Product, ProductImage, CatalogueFile


def _discounted_price(obj, context):
    """
    Shared by both serializers below. `discount_pct_map` (set once per
    request in ProductViewSet.get_serializer_context) maps product id ->
    percentage, with key None as the fallback for "applies to all products"
    offers. Purely informational — the cart/checkout discount is computed
    separately in apps.offers.services.evaluate_cart_offers, unaffected by
    this field.
    """
    pct_map = context.get("discount_pct_map") or {}
    pct = pct_map.get(obj.id, pct_map.get(None))
    if not pct:
        return None
    return (obj.price * (Decimal("100") - pct) / Decimal("100")).quantize(Decimal("0.01"))


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ["id", "image", "is_primary", "display_order"]


class ProductListSerializer(serializers.ModelSerializer):
    """Lean serializer for the storefront grid & admin product list — no heavy nested data."""
    category_name = serializers.CharField(source="category.name", read_only=True)
    primary_image = serializers.SerializerMethodField()
    in_stock = serializers.SerializerMethodField()
    discounted_price = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id", "name", "slug", "price", "discounted_price", "stock_quantity", "unit_label",
            "is_available", "in_stock", "category", "category_name", "primary_image",
        ]

    def get_primary_image(self, obj):
        img = next((i for i in obj.images.all() if i.is_primary), None) or next(iter(obj.images.all()), None)
        if not img:
            return None
        request = self.context.get("request")
        url = img.image.url
        return request.build_absolute_uri(url) if request else url

    def get_in_stock(self, obj):
        return obj.is_in_stock(self.context.get("reduce_stock", False))

    def get_discounted_price(self, obj):
        return _discounted_price(obj, self.context)


class ProductDetailSerializer(serializers.ModelSerializer):
    """Full serializer — product detail page & admin edit form."""
    images = ProductImageSerializer(many=True, read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)
    in_stock = serializers.SerializerMethodField()
    discounted_price = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id", "category", "category_name", "name", "slug", "description",
            "price", "discounted_price", "stock_quantity", "unit_label", "is_available", "in_stock",
            "images", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "slug", "created_at", "updated_at"]

    def get_in_stock(self, obj):
        return obj.is_in_stock(self.context.get("reduce_stock", False))

    def get_discounted_price(self, obj):
        return _discounted_price(obj, self.context)


class CatalogueFileSerializer(serializers.ModelSerializer):
    uploaded_by_username = serializers.CharField(source="uploaded_by.username", read_only=True, default=None)
    download_url = serializers.SerializerMethodField()

    class Meta:
        model = CatalogueFile
        fields = ["id", "original_filename", "uploaded_at", "uploaded_by_username", "download_url"]

    def get_download_url(self, obj):
        request = self.context.get("request")
        url = reverse("catalogue-file-download")
        return request.build_absolute_uri(url) if request else url
