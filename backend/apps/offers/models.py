from django.db import models
from apps.products.models import Product
from apps.core.images import compress_image


class Offer(models.Model):
    """
    Base offer record shown in the top banner on the storefront while active.
    Exactly one of the related BuyXGetYOffer / AmountDiscountOffer rows
    (below) holds the actual rule, matched by offer_type.
    """
    class OfferType(models.TextChoices):
        BUY_X_GET_Y = "buy_x_get_y", "Buy X Get Y"
        AMOUNT_DISCOUNT = "amount_discount", "Spend X, Get Y Off / Free"

    name = models.CharField(max_length=150, help_text="Shown in the top banner, e.g. 'Diwali Dhamaka'.")
    offer_type = models.CharField(max_length=20, choices=OfferType.choices)
    description = models.CharField(max_length=255, blank=True, help_text="Short banner text.")
    banner_image = models.ImageField(upload_to="offers/", null=True, blank=True, help_text="Shown in the storefront offer carousel.")
    is_active = models.BooleanField(default=True)
    start_date = models.DateTimeField(null=True, blank=True)
    end_date = models.DateTimeField(null=True, blank=True)
    priority = models.PositiveIntegerField(default=0, help_text="Higher priority offers are evaluated first at checkout.")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-priority", "-created_at"]

    def save(self, *args, **kwargs):
        # _committed is False only when a new file was just assigned (not yet
        # written to storage) — skips recompressing an already-compressed
        # image on saves that don't touch this field.
        if self.banner_image and not self.banner_image._committed:
            self.banner_image = compress_image(self.banner_image, max_dimension=1920)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class BuyXGetYOffer(models.Model):
    """
    e.g. 'Buy 2 get 1 free' — restricted to specific products on both sides,
    so a promo on sparklers can't be used to get a free box of flowerpots.
    """
    offer = models.OneToOneField(Offer, on_delete=models.CASCADE, related_name="buy_x_get_y")
    buy_quantity = models.PositiveIntegerField(default=1)
    get_quantity = models.PositiveIntegerField(default=1)
    buy_products = models.ManyToManyField(
        Product, related_name="buy_x_offers", help_text="Products that count towards the 'buy' quantity."
    )
    free_products = models.ManyToManyField(
        Product, related_name="get_y_offers", blank=True,
        help_text="Products eligible to be given free. Leave empty to make the bought product itself free.",
    )

    def __str__(self):
        return f"Buy {self.buy_quantity} Get {self.get_quantity} — {self.offer.name}"


class AmountDiscountOffer(models.Model):
    """
    e.g. 'Buy for ₹2000, get ₹300 off' or 'Buy for ₹2000, take ₹300 worth of products free'.
    """
    class DiscountType(models.TextChoices):
        FLAT_DISCOUNT = "flat_discount", "Flat Rupee Discount"
        FREE_PRODUCTS_WORTH = "free_products_worth", "Free Products Worth ₹"

    offer = models.OneToOneField(Offer, on_delete=models.CASCADE, related_name="amount_discount")
    min_purchase_amount = models.DecimalField(max_digits=10, decimal_places=2)
    discount_type = models.CharField(max_length=25, choices=DiscountType.choices)
    discount_value = models.DecimalField(
        max_digits=10, decimal_places=2, help_text="Rupees off, or rupee-value of products the customer may pick free."
    )
    applicable_products = models.ManyToManyField(
        Product, related_name="amount_discount_offers", blank=True,
        help_text="Products whose value counts toward the minimum. Leave empty to apply to the whole cart.",
    )

    def __str__(self):
        return f"Spend ₹{self.min_purchase_amount} — {self.offer.name}"
