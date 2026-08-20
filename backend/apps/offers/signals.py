from django.db.models.signals import pre_delete
from django.dispatch import receiver

from .models import Offer


@receiver(pre_delete, sender=Offer)
def delete_offer_banner_file(sender, instance, **kwargs):
    if instance.banner_image:
        instance.banner_image.delete(save=False)
