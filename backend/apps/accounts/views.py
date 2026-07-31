from django.contrib.auth import get_user_model
from rest_framework import viewsets, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .permissions import IsSuperAdmin
from .serializers import AdminTokenObtainPairSerializer, UserSerializer, UserCreateSerializer

User = get_user_model()


class AdminLoginView(TokenObtainPairView):
    """POST /api/auth/login/  -> { access, refresh, user: {...} }"""
    serializer_class = AdminTokenObtainPairSerializer


class AdminTokenRefreshView(TokenRefreshView):
    pass


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class UserManagementViewSet(viewsets.ModelViewSet):
    """
    Manage admin/staff logins (accounts table). Restricted to superadmins
    so staff can't create their own accounts or escalate roles.
    """
    queryset = User.objects.all().order_by("-created_at")
    permission_classes = [IsSuperAdmin]

    def get_serializer_class(self):
        if self.action == "create":
            return UserCreateSerializer
        return UserSerializer
