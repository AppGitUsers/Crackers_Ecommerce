from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OrderViewSet, checkout, my_orders, invoice_by_token

router = DefaultRouter()
router.register("", OrderViewSet, basename="order")

urlpatterns = [
    path("checkout/", checkout, name="checkout"),
    path("my-orders/", my_orders, name="my-orders"),
    # Must come before router.urls: the router's detail route (`<pk>/`) uses
    # a greedy pk regex that would otherwise swallow "invoice/<token>/".
    path("invoice/<uuid:token>/", invoice_by_token, name="order-invoice-by-token"),
    path("", include(router.urls)),
]
