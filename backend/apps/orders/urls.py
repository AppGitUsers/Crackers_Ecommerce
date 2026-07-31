from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OrderViewSet, checkout, my_orders

router = DefaultRouter()
router.register("", OrderViewSet, basename="order")

urlpatterns = [
    path("checkout/", checkout, name="checkout"),
    path("my-orders/", my_orders, name="my-orders"),
    path("", include(router.urls)),
]
