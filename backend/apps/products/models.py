from django.conf import settings
from django.db import models
from django.utils.text import slugify

from apps.categories.models import Category
from apps.core.images import compress_image


class Product(models.Model):
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="products")
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True, blank=True)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    stock_quantity = models.PositiveIntegerField(default=0)
    unit_label = models.CharField(
        max_length=30, default="box", help_text="e.g. box, packet, piece — shown next to quantity on the storefront."
    )
    is_available = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.name)
            slug = base
            i = 1
            while Product.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                i += 1
                slug = f"{base}-{i}"
            self.slug = slug
        super().save(*args, **kwargs)

    @property
    def in_stock(self):
        return self.is_available and self.stock_quantity > 0

    def __str__(self):
        return self.name


class ProductImage(models.Model):
    """
    Images can come from the admin's phone camera or gallery (handled client-side
    via <input type=file accept=image/* capture=environment>) — this model just
    stores whatever image file is uploaded.
    """
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(upload_to="products/")
    is_primary = models.BooleanField(default=False)
    display_order = models.PositiveIntegerField(default=0)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["display_order", "id"]

    def save(self, *args, **kwargs):
        # _committed is False only when a new file was just assigned (not yet
        # written to storage) — skips recompressing an already-compressed
        # image on saves that don't touch this field (e.g. reordering).
        if self.image and not self.image._committed:
            self.image = compress_image(self.image, max_dimension=1200)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Image for {self.product.name}"


class CatalogueFile(models.Model):
    """
    The admin's downloadable product catalogue (Excel/CSV) — a plain document
    shown on the storefront, unrelated to the structured Product rows above.
    Singleton by convention: uploading a new one replaces whatever is there.
    """
    file = models.FileField(upload_to="catalogue/")
    original_filename = models.CharField(max_length=255)
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.original_filename
