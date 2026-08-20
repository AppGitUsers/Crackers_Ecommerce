from django.db import models
from django.utils.text import slugify

from apps.core.images import compress_image


class Category(models.Model):
    name = models.CharField(max_length=120, unique=True)
    slug = models.SlugField(max_length=140, unique=True, blank=True)
    description = models.TextField(blank=True)
    image = models.ImageField(upload_to="categories/", blank=True, null=True)
    is_active = models.BooleanField(default=True)
    display_order = models.PositiveIntegerField(default=0, help_text="Lower shows first in the category filter.")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["display_order", "name"]
        verbose_name_plural = "categories"

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        # _committed is False only when a new file was just assigned (not yet
        # written to storage) — skips recompressing an already-compressed
        # image on saves that don't touch this field (e.g. renaming).
        if self.image and not self.image._committed:
            if self.pk:
                old = Category.objects.filter(pk=self.pk).only("image").first()
                if old and old.image and old.image.name != self.image.name:
                    old.image.delete(save=False)
            self.image = compress_image(self.image, max_dimension=1200)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name
