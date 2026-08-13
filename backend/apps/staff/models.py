from datetime import datetime, timedelta

from django.db import models

from apps.core.images import compress_image

DAY_CODES = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]


class Department(models.Model):
    name = models.CharField(max_length=100, unique=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class Shift(models.Model):
    name = models.CharField(max_length=100)
    start_time = models.TimeField()
    end_time = models.TimeField()
    late_threshold = models.PositiveIntegerField(default=15, help_text="Minutes after start before marked late")
    ot_threshold = models.PositiveIntegerField(
        default=30, help_text="Minutes beyond shift end before counted as overtime"
    )
    days = models.CharField(max_length=50, default="MON,TUE,WED,THU,FRI", help_text="Comma-separated day codes")
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    @property
    def hours(self):
        """Shift duration in hours. Handles overnight shifts (end <= start rolls to next day)."""
        start = datetime.combine(datetime.today(), self.start_time)
        end = datetime.combine(datetime.today(), self.end_time)
        if end <= start:
            end += timedelta(days=1)
        return round((end - start).total_seconds() / 3600, 2)

    @property
    def days_list(self):
        return [d.strip() for d in self.days.split(",") if d.strip()]

    def __str__(self):
        return f"{self.name} ({self.start_time.strftime('%H:%M')} – {self.end_time.strftime('%H:%M')})"


class Employee(models.Model):
    class EmploymentType(models.TextChoices):
        FULL_TIME = "full_time", "Full Time"
        PART_TIME = "part_time", "Part Time"
        CONTRACT = "contract", "Contract"

    name = models.CharField(max_length=200)
    phone = models.CharField(max_length=15, blank=True)
    email = models.EmailField(blank=True)
    department = models.ForeignKey(
        Department, on_delete=models.SET_NULL, null=True, blank=True, related_name="employees"
    )
    shift = models.ForeignKey(Shift, on_delete=models.SET_NULL, null=True, blank=True, related_name="employees")
    employment_type = models.CharField(
        max_length=20, choices=EmploymentType.choices, default=EmploymentType.FULL_TIME
    )
    monthly_salary = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    address = models.TextField(blank=True)
    joined_date = models.DateField()
    photo = models.ImageField(upload_to="staff/photos/", blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def save(self, *args, **kwargs):
        # Same pattern as Product/Category/Offer images: compress on new
        # upload only (_committed is False for a just-assigned file), skip
        # recompressing an already-stored photo on unrelated field edits.
        if self.photo and not self.photo._committed:
            self.photo = compress_image(self.photo, max_dimension=600)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Attendance(models.Model):
    class Status(models.TextChoices):
        PRESENT = "present", "Present"
        ABSENT = "absent", "Absent"
        HALF = "half", "Half Day"
        LEAVE = "leave", "On Leave"

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="attendances")
    date = models.DateField()
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PRESENT)
    check_in = models.TimeField(null=True, blank=True)
    check_out = models.TimeField(null=True, blank=True)
    hours_worked = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ["employee", "date"]
        ordering = ["-date"]

    def save(self, *args, **kwargs):
        if self.check_in and self.check_out:
            start = datetime.combine(self.date, self.check_in)
            end = datetime.combine(self.date, self.check_out)
            if end <= start:
                end += timedelta(days=1)
            self.hours_worked = round((end - start).total_seconds() / 3600, 2)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.employee.name} · {self.date} · {self.get_status_display()}"


class StaffPayment(models.Model):
    class PaymentType(models.TextChoices):
        SALARY = "salary", "Salary"
        ADVANCE = "advance", "Advance"
        BONUS = "bonus", "Bonus"
        OTHER = "other", "Other"

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="payments")
    payment_type = models.CharField(max_length=10, choices=PaymentType.choices, default=PaymentType.SALARY)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_date = models.DateField()
    period_start = models.DateField(null=True, blank=True)
    period_end = models.DateField(null=True, blank=True)
    hours_worked = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-payment_date"]

    def __str__(self):
        return f"{self.employee.name} · {self.get_payment_type_display()} · ₹{self.amount}"
