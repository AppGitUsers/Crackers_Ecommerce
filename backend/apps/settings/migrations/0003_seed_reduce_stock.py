from django.db import migrations

# Defaulting to "False" means existing deployments keep today's practical
# behavior of not worrying about stock counts (they start at 0 and were
# never being enforced as a hard limit) until an admin opts in via Settings.
KEY = "reduce_stock"
DEFAULT_VALUE = "False"


def seed_default(apps, schema_editor):
    SiteSetting = apps.get_model("site_settings", "SiteSetting")
    SiteSetting.objects.get_or_create(key=KEY, defaults={"value": DEFAULT_VALUE})


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("site_settings", "0002_seed_defaults"),
    ]

    operations = [
        migrations.RunPython(seed_default, noop),
    ]
