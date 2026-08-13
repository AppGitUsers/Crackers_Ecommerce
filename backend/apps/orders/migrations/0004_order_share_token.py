import uuid

from django.db import migrations, models


def assign_unique_tokens(apps, schema_editor):
    Order = apps.get_model("orders", "Order")
    # A bulk ADD COLUMN default is evaluated once and applied to every existing
    # row identically — not per-row — so existing orders need their tokens
    # regenerated individually before the unique constraint can be added.
    for order in Order.objects.all():
        order.share_token = uuid.uuid4()
        order.save(update_fields=["share_token"])


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0003_ordernumbersequence'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='share_token',
            field=models.UUIDField(default=uuid.uuid4, editable=False, null=True),
        ),
        migrations.RunPython(assign_unique_tokens, noop),
        migrations.AlterField(
            model_name='order',
            name='share_token',
            field=models.UUIDField(default=uuid.uuid4, editable=False, unique=True),
        ),
    ]
