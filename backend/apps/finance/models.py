from django.conf import settings
from django.db import models


class Transaction(models.Model):
    """
    Simple income/expense ledger for the Finance dashboard
    (income, expense, and savings = income - expense, computed on the fly).
    """
    class TransactionType(models.TextChoices):
        INCOME = "income", "Income"
        EXPENSE = "expense", "Expense"

    class Category(models.TextChoices):
        SALES = "sales", "Sales"
        MANUAL_PAYMENT = "manual_payment", "Manual Order Payment"
        INVENTORY_PURCHASE = "inventory_purchase", "Inventory Purchase"
        DELIVERY = "delivery", "Delivery / Logistics"
        MARKETING = "marketing", "Marketing"
        SALARY = "salary", "Salary / Staff"
        MISC = "misc", "Miscellaneous"

    transaction_type = models.CharField(max_length=10, choices=TransactionType.choices)
    category = models.CharField(max_length=25, choices=Category.choices, default=Category.MISC)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    description = models.CharField(max_length=255, blank=True)
    related_order = models.ForeignKey(
        "orders.Order", on_delete=models.SET_NULL, null=True, blank=True, related_name="transactions"
    )
    date = models.DateField()
    recorded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date", "-created_at"]

    def __str__(self):
        return f"{self.transaction_type} · ₹{self.amount} · {self.date}"
