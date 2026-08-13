from django.db import models


class SiteSetting(models.Model):
    """
    Generic key/value store for business-wide config (company name, address,
    phone, GSTIN, etc.) — used to fill in the invoice header. Deliberately
    schemaless: adding a new setting is just a new row, no migration needed.
    """
    key = models.CharField(max_length=100, unique=True)
    value = models.TextField(blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["key"]

    def __str__(self):
        return self.key
