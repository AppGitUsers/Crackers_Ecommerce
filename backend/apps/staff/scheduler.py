import logging
from datetime import datetime, timedelta

from apscheduler.schedulers.background import BackgroundScheduler
from django.utils import timezone

from .models import DAY_CODES

logger = logging.getLogger(__name__)

_scheduler = None


def check_auto_absent():
    """
    Hourly sweep: any employee whose shift started over an hour ago with no
    check-in yet gets auto-marked absent for the day. get_or_create means an
    employee who checks in later, or who already has a record, is untouched.
    """
    from .models import Attendance, Employee

    try:
        now = timezone.localtime()
        today = now.date()
        today_code = DAY_CODES[today.weekday()]

        employees = Employee.objects.filter(is_active=True, shift__isnull=False).select_related("shift")
        for emp in employees:
            shift = emp.shift
            if today_code not in shift.days_list:
                continue

            threshold = datetime.combine(today, shift.start_time) + timedelta(hours=1)
            threshold = timezone.make_aware(threshold) if timezone.is_naive(threshold) else threshold
            if now < threshold:
                continue

            _, created = Attendance.objects.get_or_create(
                employee=emp,
                date=today,
                defaults={
                    "status": Attendance.Status.ABSENT,
                    "notes": f"Auto-marked absent: no check-in by {threshold.strftime('%H:%M')}",
                },
            )
            if created:
                logger.info("Auto-marked %s absent for %s", emp.name, today)
    except Exception:
        logger.exception("check_auto_absent job failed")


def start():
    global _scheduler
    if _scheduler and _scheduler.running:
        return
    _scheduler = BackgroundScheduler(timezone=timezone.get_current_timezone())
    _scheduler.add_job(check_auto_absent, "cron", minute=0, id="check_auto_absent", replace_existing=True)
    _scheduler.start()
    logger.info("Staff auto-absent scheduler started")
