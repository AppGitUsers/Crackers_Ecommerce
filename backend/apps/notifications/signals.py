from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.orders.models import Order

from .push import notify_new_order


@receiver(post_save, sender=Order)
def notify_on_order_created(sender, instance, created, **kwargs):
    # `created` excludes every later save() on the same order — status
    # changes, payment updates, etc. — this fires exactly once, at checkout.
    # on_commit defers this until the surrounding transaction.atomic() block
    # (checkout still creates OrderItems, adjusts stock, etc. after this)
    # actually commits — otherwise a later failure in that block would roll
    # the order back after we'd already told staff about it.
    if created:
        transaction.on_commit(lambda: notify_new_order(instance))
