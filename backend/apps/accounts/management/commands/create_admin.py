"""
Quick way to create the first superadmin login for the Admin CRM, since we
don't use django.contrib.admin / the default createsuperuser role setup.

Usage:
    python manage.py create_admin --username=admin --password=changeme --email=admin@example.com
"""
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

User = get_user_model()


class Command(BaseCommand):
    help = "Create a superadmin login for the Admin CRM."

    def add_arguments(self, parser):
        parser.add_argument("--username", required=True)
        parser.add_argument("--password", required=True)
        parser.add_argument("--email", default="")

    def handle(self, *args, **options):
        username = options["username"]
        if User.objects.filter(username=username).exists():
            self.stdout.write(self.style.WARNING(f"User '{username}' already exists."))
            return
        user = User(
            username=username,
            email=options["email"],
            role=User.Role.SUPERADMIN,
            is_staff=True,
            is_superuser=True,
            is_active_staff=True,
        )
        user.set_password(options["password"])
        user.save()
        self.stdout.write(self.style.SUCCESS(f"Superadmin '{username}' created."))
