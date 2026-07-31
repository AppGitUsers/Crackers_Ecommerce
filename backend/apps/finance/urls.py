from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TransactionViewSet, finance_summary

router = DefaultRouter()
router.register("", TransactionViewSet, basename="transaction")

urlpatterns = [
    path("summary/", finance_summary, name="finance-summary"),
    path("", include(router.urls)),
]
