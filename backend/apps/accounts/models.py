from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """
    Custom user model for everyone who can log into the Admin CRM.
    There is no separate 'customer' login — shoppers on the storefront
    are tracked via apps.customers.Customer (name + phone at checkout only).
    """

    class Role(models.TextChoices):
        SUPERADMIN = "superadmin", "Super Admin"
        ADMIN = "admin", "Admin"
        STAFF = "staff", "Staff"

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.STAFF)
    phone = models.CharField(max_length=15, blank=True)
    is_active_staff = models.BooleanField(
        default=True, help_text="Toggle to quickly disable a staff login without deleting them."
    )
    linked_employee = models.OneToOneField(
        "staff.Employee", on_delete=models.SET_NULL, null=True, blank=True, related_name="user_account"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"
