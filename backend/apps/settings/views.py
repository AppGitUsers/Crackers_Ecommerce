from rest_framework import viewsets

from apps.accounts.permissions import IsAdminCRMUser
from .models import SiteSetting
from .serializers import SiteSettingSerializer


class SiteSettingViewSet(viewsets.ModelViewSet):
    """Admin CRM 'Settings' page — company info shown on invoices, and any
    future key/value config, all editable without a migration."""
    queryset = SiteSetting.objects.all()
    serializer_class = SiteSettingSerializer
    permission_classes = [IsAdminCRMUser]
    search_fields = ["key", "value"]
    # The page is a "load everything, edit several, Save Changes once" form,
    # not a browsable list — paginating it would silently hide settings past
    # the first page instead of just showing a Prev/Next control, and could
    # make "Save Changes" quietly skip edits on rows the admin never saw.
    pagination_class = None
