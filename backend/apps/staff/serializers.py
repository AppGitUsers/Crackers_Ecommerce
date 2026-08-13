from datetime import datetime, timedelta

from rest_framework import serializers

from .models import Attendance, Department, Employee, Shift, StaffPayment


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ["id", "name", "is_active"]


class ShiftSerializer(serializers.ModelSerializer):
    days_list = serializers.ListField(child=serializers.CharField(), read_only=True)
    hours = serializers.FloatField(read_only=True)

    class Meta:
        model = Shift
        fields = [
            "id", "name", "start_time", "end_time", "late_threshold", "ot_threshold",
            "days", "days_list", "notes", "hours", "is_active",
        ]


class EmployeeSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True, default=None)
    shift_name = serializers.CharField(source="shift.name", read_only=True, default=None)
    photo_url = serializers.SerializerMethodField()
    shift_days_list = serializers.SerializerMethodField()

    class Meta:
        model = Employee
        fields = [
            "id", "name", "phone", "email", "department", "department_name",
            "shift", "shift_name", "shift_days_list", "employment_type", "monthly_salary", "address",
            "joined_date", "photo", "photo_url", "is_active", "created_at",
        ]
        extra_kwargs = {"photo": {"write_only": True, "required": False}}

    def get_photo_url(self, obj):
        if not obj.photo:
            return None
        request = self.context.get("request")
        url = obj.photo.url
        return request.build_absolute_uri(url) if request else url

    def get_shift_days_list(self, obj):
        return obj.shift.days_list if obj.shift else None


class AttendanceSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="employee.name", read_only=True)
    is_late = serializers.SerializerMethodField()
    ot_minutes = serializers.SerializerMethodField()

    class Meta:
        model = Attendance
        fields = [
            "id", "employee", "employee_name", "date", "status", "check_in", "check_out",
            "hours_worked", "is_late", "ot_minutes", "notes", "created_at",
        ]
        read_only_fields = ["hours_worked"]

    def get_is_late(self, obj):
        if obj.status != Attendance.Status.PRESENT or not obj.check_in or not obj.employee.shift:
            return False
        shift = obj.employee.shift
        threshold = datetime.combine(obj.date, shift.start_time) + timedelta(minutes=shift.late_threshold)
        return datetime.combine(obj.date, obj.check_in) > threshold

    def get_ot_minutes(self, obj):
        if obj.status != Attendance.Status.PRESENT or not obj.check_out or not obj.employee.shift:
            return 0
        shift = obj.employee.shift
        ot_start = datetime.combine(obj.date, shift.end_time) + timedelta(minutes=shift.ot_threshold)
        check_out_dt = datetime.combine(obj.date, obj.check_out)
        if check_out_dt <= ot_start:
            return 0
        return int((check_out_dt - ot_start).total_seconds() // 60)


class StaffPaymentSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="employee.name", read_only=True)

    class Meta:
        model = StaffPayment
        fields = [
            "id", "employee", "employee_name", "payment_type", "amount", "payment_date",
            "period_start", "period_end", "hours_worked", "notes", "created_at",
        ]
