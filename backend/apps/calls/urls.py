from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import CallLogViewSet, OrderCallSummaryView, call_status_counts

router = DefaultRouter()
router.register("", CallLogViewSet, basename="calllog")

urlpatterns = [
    # Must come before router.urls: the router's detail route (`<pk>/`) uses
    # a greedy pk regex that would otherwise swallow "orders/" as a pk.
    path("orders/status_counts/", call_status_counts, name="call-status-counts"),
    path("orders/", OrderCallSummaryView.as_view(), name="call-order-summary"),
] + router.urls
