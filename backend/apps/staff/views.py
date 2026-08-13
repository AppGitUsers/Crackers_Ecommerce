import calendar
from datetime import date

from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from apps.accounts.permissions import IsAdminCRMUser
from apps.finance.models import Transaction as FinanceTransaction

from .models import DAY_CODES, Attendance, Department, Employee, Shift, StaffPayment
from .serializers import (
    AttendanceSerializer, DepartmentSerializer, EmployeeSerializer, ShiftSerializer, StaffPaymentSerializer,
)


class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [IsAdminCRMUser]


class ShiftViewSet(viewsets.ModelViewSet):
    queryset = Shift.objects.all()
    serializer_class = ShiftSerializer
    permission_classes = [IsAdminCRMUser]
    filterset_fields = ["is_active"]


class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.select_related("department", "shift")
    serializer_class = EmployeeSerializer
    permission_classes = [IsAdminCRMUser]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filterset_fields = ["department", "shift", "employment_type", "is_active"]
    search_fields = ["name", "phone", "email"]

    @action(detail=True, methods=["get"])
    def attendance_calendar(self, request, pk=None):
        """GET /api/staff/employees/{id}/attendance_calendar/?year=&month="""
        employee = self.get_object()
        today = timezone.localdate()
        year = int(request.query_params.get("year", today.year))
        month = int(request.query_params.get("month", today.month))
        qs = (
            Attendance.objects.filter(employee=employee, date__year=year, date__month=month)
            .select_related("employee__shift")
            .order_by("date")
        )
        return Response(AttendanceSerializer(qs, many=True, context={"request": request}).data)

    @action(detail=True, methods=["get"])
    def payment_history(self, request, pk=None):
        """GET /api/staff/employees/{id}/payment_history/"""
        employee = self.get_object()
        qs = StaffPayment.objects.filter(employee=employee).order_by("-payment_date")
        return Response(StaffPaymentSerializer(qs, many=True).data)


class AttendanceViewSet(viewsets.ModelViewSet):
    queryset = Attendance.objects.select_related("employee__shift")
    serializer_class = AttendanceSerializer
    permission_classes = [IsAdminCRMUser]
    filterset_fields = ["employee", "date", "status"]
    search_fields = ["employee__name"]
    ordering_fields = ["date"]

    @action(detail=False, methods=["get"])
    def by_date(self, request):
        """GET /api/staff/attendance/by_date/?date=YYYY-MM-DD (defaults to today)"""
        day = request.query_params.get("date") or timezone.localdate().isoformat()
        qs = self.get_queryset().filter(date=day)
        return Response(self.get_serializer(qs, many=True).data)

    @action(detail=False, methods=["get"])
    def monthly_summary(self, request):
        """
        GET /api/staff/attendance/monthly_summary/?year=&month=
        One row per active employee: required hours vs. actual, attendance %,
        and the salary that % works out to. Computed server-side so the
        Payments tab never has to re-derive this from raw attendance rows.
        """
        today = timezone.localdate()
        year = int(request.query_params.get("year", today.year))
        month = int(request.query_params.get("month", today.month))
        days_in_month = calendar.monthrange(year, month)[1]

        employees = Employee.objects.filter(is_active=True).select_related("shift", "department")
        attendances = Attendance.objects.filter(
            employee__in=employees, date__year=year, date__month=month
        ).select_related("employee")
        paid_employee_ids = set(
            StaffPayment.objects.filter(
                employee__in=employees,
                payment_type=StaffPayment.PaymentType.SALARY,
                period_start__year=year,
                period_start__month=month,
            ).values_list("employee_id", flat=True)
        )

        att_by_employee = {}
        for a in attendances:
            att_by_employee.setdefault(a.employee_id, []).append(a)

        results = []
        for emp in employees:
            shift = emp.shift
            shift_hours = shift.hours if shift else 0

            working_days = 0
            if shift:
                for day_num in range(1, days_in_month + 1):
                    d = date(year, month, day_num)
                    if DAY_CODES[d.weekday()] in shift.days_list:
                        working_days += 1
            required_hours = round(working_days * shift_hours, 2)

            emp_attendances = att_by_employee.get(emp.id, [])
            present_days = sum(1 for a in emp_attendances if a.status == Attendance.Status.PRESENT)
            half_days = sum(1 for a in emp_attendances if a.status == Attendance.Status.HALF)
            absent_days = sum(1 for a in emp_attendances if a.status == Attendance.Status.ABSENT)

            hours_worked = 0.0
            for a in emp_attendances:
                if a.status == Attendance.Status.PRESENT:
                    hours_worked += float(a.hours_worked) if a.hours_worked else shift_hours
                elif a.status == Attendance.Status.HALF:
                    hours_worked += float(a.hours_worked) if a.hours_worked else shift_hours / 2
            hours_worked = round(hours_worked, 2)

            attendance_pct = min(100, round((hours_worked / required_hours) * 100, 2)) if required_hours else 0
            full_salary = float(emp.monthly_salary)
            calculated_salary = round(full_salary * attendance_pct / 100, 2)

            results.append({
                "employee_id": emp.id,
                "employee_name": emp.name,
                "department": emp.department.name if emp.department else None,
                "shift_name": shift.name if shift else None,
                "shift_hours": shift_hours,
                "working_days": working_days,
                "required_hours": required_hours,
                "hours_worked": hours_worked,
                "present_days": present_days,
                "half_days": half_days,
                "absent_days": absent_days,
                "attendance_pct": attendance_pct,
                "full_salary": full_salary,
                "calculated_salary": calculated_salary,
                "paid_this_month": emp.id in paid_employee_ids,
            })

        return Response(results)


class StaffPaymentViewSet(viewsets.ModelViewSet):
    queryset = StaffPayment.objects.select_related("employee")
    serializer_class = StaffPaymentSerializer
    permission_classes = [IsAdminCRMUser]
    filterset_fields = ["employee", "payment_type", "payment_date"]
    search_fields = ["employee__name"]
    ordering_fields = ["payment_date", "amount"]

    def perform_create(self, serializer):
        payment = serializer.save()
        # Mirrors how order payments/refunds land in Finance (apps/orders/views.py
        # update_status) — staff payouts should show up as expenses too, otherwise
        # the Finance dashboard silently misses the biggest recurring cost.
        FinanceTransaction.objects.create(
            transaction_type=FinanceTransaction.TransactionType.EXPENSE,
            category=FinanceTransaction.Category.SALARY,
            amount=payment.amount,
            description=f"{payment.get_payment_type_display()} — {payment.employee.name}",
            date=payment.payment_date,
            recorded_by=self.request.user,
        )
