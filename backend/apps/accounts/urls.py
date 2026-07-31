from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import AdminLoginView, AdminTokenRefreshView, MeView, UserManagementViewSet

router = DefaultRouter()
router.register("users", UserManagementViewSet, basename="user")

urlpatterns = [
    path("login/", AdminLoginView.as_view(), name="admin-login"),
    path("refresh/", AdminTokenRefreshView.as_view(), name="admin-token-refresh"),
    path("me/", MeView.as_view(), name="me"),
    path("", include(router.urls)),
]
