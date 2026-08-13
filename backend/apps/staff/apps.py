import os
import sys

from django.apps import AppConfig


class StaffConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.staff"
    label = "staff"

    def ready(self):
        # runserver's autoreloader calls ready() twice (once in the reloader
        # parent, RUN_MAIN unset, then again in the actual child process) —
        # only start the background scheduler in the process that's really
        # going to serve requests.
        if "runserver" in sys.argv and os.environ.get("RUN_MAIN") != "true":
            return
        from . import scheduler
        scheduler.start()
