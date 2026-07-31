from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TransactionViewSet, finance_summary, finance_trend, finance_export

router = DefaultRouter()
router.register("", TransactionViewSet, basename="transaction")

urlpatterns = [
    path("summary/", finance_summary, name="finance-summary"),
    path("trend/", finance_trend, name="finance-trend"),
    path("export/", finance_export, name="finance-export"),
    path("", include(router.urls)),
]
