from django.db.models.signals import pre_delete
from django.dispatch import receiver

from .models import ProductImage


@receiver(pre_delete, sender=ProductImage)
def delete_product_image_file(sender, instance, **kwargs):
    # Catches every deletion path — the admin's explicit remove-photo action
    # (which also does this directly), a whole-product delete cascading into
    # its images, even a manual shell/admin delete — so a file never gets
    # orphaned regardless of how the row disappeared.
    if instance.image:
        instance.image.delete(save=False)
