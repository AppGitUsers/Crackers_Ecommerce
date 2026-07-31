from rest_framework.routers import DefaultRouter
from django.urls import path, include
from .views import OfferViewSet, active_banner_offers

router = DefaultRouter()
router.register("", OfferViewSet, basename="offer")

urlpatterns = [
    path("active/", active_banner_offers, name="active-offers"),
    path("", include(router.urls)),
]
