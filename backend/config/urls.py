from django.conf import settings
from django.conf.urls.static import static
from django.urls import path, include

urlpatterns = [
    # NOTE: we do NOT use django.contrib.admin (the default Django admin site).
    # The admin CRM is a separate React app talking to these DRF endpoints,
    # authenticated via JWT + role checks in apps.accounts.permissions.
    path("api/auth/", include("apps.accounts.urls")),
    path("api/categories/", include("apps.categories.urls")),
    path("api/products/", include("apps.products.urls")),
    path("api/customers/", include("apps.customers.urls")),
    path("api/orders/", include("apps.orders.urls")),
    path("api/offers/", include("apps.offers.urls")),
    path("api/calls/", include("apps.calls.urls")),
    path("api/finance/", include("apps.finance.urls")),
    path("api/staff/", include("apps.staff.urls")),
    path("api/settings/", include("apps.settings.urls")),
    path("api/dashboard/", include("apps.core.urls")),
    path("api/notifications/", include("apps.notifications.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
