from .models import SiteSetting


def get_settings_dict():
    """All SiteSetting rows as a flat {key: value} dict — used wherever
    company info needs to be pulled in (invoice PDF, public invoice page)."""
    return {s.key: s.value for s in SiteSetting.objects.all()}


def get_bool_setting(key, default=False):
    """
    Reads a single SiteSetting as a boolean — the string "true" (any case)
    is True, anything else (including a missing row) is False/the default.
    """
    value = SiteSetting.objects.filter(key=key).values_list("value", flat=True).first()
    if value is None:
        return default
    return value.strip().lower() == "true"
