from datetime import timedelta

from django.db.models import Sum, Count, Q
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.accounts.permissions import IsAdminCRMUser
from apps.orders.models import Order
from apps.products.models import Product
from apps.categories.models import Category
from apps.calls.models import CallLog
from apps.calls.services import orders_with_call_summary


@api_view(["GET"])
@permission_classes([IsAdminCRMUser])
def dashboard_overview(request):
    """
    GET /api/dashboard/overview/?days=30
    Powers the main Admin CRM dashboard: total sales, products available,
    and a day-by-day sales graph for the last N days.
    """
    days = int(request.query_params.get("days", 30))
    since = timezone.now() - timedelta(days=days)

    delivered_or_all_orders = Order.objects.exclude(current_status=Order.FulfillmentStatus.CANCELLED)

    total_sales = delivered_or_all_orders.aggregate(total=Sum("total_amount"))["total"] or 0
    total_orders = delivered_or_all_orders.count()
    pending_orders = delivered_or_all_orders.exclude(current_status=Order.FulfillmentStatus.DELIVERED).count()

    products_available = Product.objects.filter(is_available=True, stock_quantity__gt=0).count()
    products_out_of_stock = Product.objects.filter(Q(is_available=False) | Q(stock_quantity=0)).count()
    total_categories = Category.objects.filter(is_active=True).count()

    sales_by_day = (
        delivered_or_all_orders.filter(created_at__gte=since)
        .annotate(day=TruncDate("created_at"))
        .values("day")
        .annotate(total=Sum("total_amount"), order_count=Count("id"))
        .order_by("day")
    )

    # Counts orders whose *latest* call attempt is still unresolved, not raw
    # CallLog rows — an order keeps its earlier "not called" row as history
    # even after a follow-up call moves it to a different status.
    calls_pending_followup = orders_with_call_summary().filter(
        latest_call_status__in=[CallLog.CallStatus.NOT_CALLED, CallLog.CallStatus.NO_ANSWER]
    ).count()

    return Response({
        "total_sales": total_sales,
        "total_orders": total_orders,
        "pending_orders": pending_orders,
        "products_available": products_available,
        "products_out_of_stock": products_out_of_stock,
        "total_categories": total_categories,
        "calls_pending_followup": calls_pending_followup,
        "sales_graph": list(sales_by_day),
    })
