from django.apps import AppConfig


class OffersConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.offers"
    label = "offers"

    def ready(self):
        from . import signals  # noqa: F401
