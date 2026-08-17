from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import ProductViewSet, CatalogueFileView, CatalogueFileDownloadView

router = DefaultRouter()
router.register("", ProductViewSet, basename="product")

# Must come before router.urls — the router's detail route (^(?P<pk>[^/.]+)/$)
# would otherwise swallow "catalogue-file/" as a product pk lookup.
urlpatterns = [
    path("catalogue-file/", CatalogueFileView.as_view(), name="catalogue-file"),
    path("catalogue-file/download/", CatalogueFileDownloadView.as_view(), name="catalogue-file-download"),
] + router.urls
