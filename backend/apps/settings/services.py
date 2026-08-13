from .models import SiteSetting


def get_settings_dict():
    """All SiteSetting rows as a flat {key: value} dict — used wherever
    company info needs to be pulled in (invoice PDF, public invoice page)."""
    return {s.key: s.value for s in SiteSetting.objects.all()}
