from django.urls import path

from . import views

urlpatterns = [
    path("vapid-public-key/", views.vapid_public_key, name="vapid-public-key"),
    path("subscribe/", views.subscribe, name="notifications-subscribe"),
    path("unsubscribe/", views.unsubscribe, name="notifications-unsubscribe"),
]
