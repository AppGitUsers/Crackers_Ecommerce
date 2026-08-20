from django.db import migrations

DEFAULT_KEYS = [
    ("company_name", "Achammal Pyrotech"),
    ("company_address", ""),
    ("company_phone", ""),
    ("company_email", ""),
    ("company_gstin", ""),
]


def seed_defaults(apps, schema_editor):
    SiteSetting = apps.get_model("site_settings", "SiteSetting")
    for key, value in DEFAULT_KEYS:
        SiteSetting.objects.get_or_create(key=key, defaults={"value": value})


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("site_settings", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_defaults, noop),
    ]
