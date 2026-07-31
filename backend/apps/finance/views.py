from django.db.models import Sum, Q
from rest_framework import viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from apps.accounts.permissions import IsAdminCRMUser
from .models import Transaction
from .serializers import TransactionSerializer


class TransactionViewSet(viewsets.ModelViewSet):
    queryset = Transaction.objects.select_related("related_order", "recorded_by")
    serializer_class = TransactionSerializer
    permission_classes = [IsAdminCRMUser]
    filterset_fields = ["transaction_type", "category", "date"]
    ordering_fields = ["date", "amount"]

    def perform_create(self, serializer):
        serializer.save(recorded_by=self.request.user)


@api_view(["GET"])
@permission_classes([IsAdminCRMUser])
def finance_summary(request):
    """
    GET /api/finance/summary/?from=YYYY-MM-DD&to=YYYY-MM-DD
    Income, expense, and savings (income - expense) for the Finance dashboard cards.
    """
    qs = Transaction.objects.all()
    date_from = request.query_params.get("from")
    date_to = request.query_params.get("to")
    if date_from:
        qs = qs.filter(date__gte=date_from)
    if date_to:
        qs = qs.filter(date__lte=date_to)

    income = qs.filter(transaction_type=Transaction.TransactionType.INCOME).aggregate(total=Sum("amount"))["total"] or 0
    expense = qs.filter(transaction_type=Transaction.TransactionType.EXPENSE).aggregate(total=Sum("amount"))["total"] or 0

    by_category = list(
        qs.values("transaction_type", "category").annotate(total=Sum("amount")).order_by("-total")
    )

    return Response({
        "income": income,
        "expense": expense,
        "savings": income - expense,
        "by_category": by_category,
    })
