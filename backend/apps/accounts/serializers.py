from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

User = get_user_model()


class AdminTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Login serializer used at /api/auth/login/. Only allows users flagged
    is_active_staff to log in, and embeds role/name in the JWT + response
    so the frontend can route/gate the CRM UI immediately.
    """

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        token["full_name"] = f"{user.first_name} {user.last_name}".strip() or user.username
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        if not self.user.is_active_staff:
            raise serializers.ValidationError("This account has been disabled. Contact a super admin.")
        data["user"] = {
            "id": self.user.id,
            "username": self.user.username,
            "role": self.user.role,
            "full_name": f"{self.user.first_name} {self.user.last_name}".strip() or self.user.username,
        }
        return data


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id", "username", "first_name", "last_name", "email",
            "phone", "role", "is_active_staff", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = [
            "id", "username", "first_name", "last_name", "email",
            "phone", "role", "password", "is_active_staff",
        ]

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user
