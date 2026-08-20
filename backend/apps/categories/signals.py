from django.db.models.signals import pre_delete
from django.dispatch import receiver

from .models import Category


@receiver(pre_delete, sender=Category)
def delete_category_image_file(sender, instance, **kwargs):
    if instance.image:
        instance.image.delete(save=False)
