from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsAdminCRMUser(BasePermission):
    """
    Full read/write access for the Admin CRM. Used on every admin-only
    endpoint (orders, offers, finance, calls, product/category CRUD).
    Public storefront reads use IsAuthenticatedOrReadOnly instead.
    """

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_active_staff
            and request.user.role in ("superadmin", "admin", "staff")
        )


class IsAdminOrSuperAdmin(BasePermission):
    """Restricts destructive/sensitive actions (e.g. deleting users, finance) to admins+."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in ("superadmin", "admin")
        )


class IsSuperAdmin(BasePermission):
    """Reserved for user management (creating/removing staff logins)."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == "superadmin"
        )


class ReadOnlyOrAdminCRM(BasePermission):
    """
    Public storefront: anyone can GET (list/retrieve).
    Only authenticated admin/staff can create/update/delete.
    Used for Category & Product viewsets which are shared by both apps.
    """

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_active_staff
            and request.user.role in ("superadmin", "admin", "staff")
        )
