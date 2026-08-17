from rest_framework import serializers
from .models import Offer, BuyXGetYOffer, AmountDiscountOffer


class BuyXGetYOfferSerializer(serializers.ModelSerializer):
    class Meta:
        model = BuyXGetYOffer
        fields = ["id", "buy_quantity", "get_quantity", "buy_products", "free_products"]


class AmountDiscountOfferSerializer(serializers.ModelSerializer):
    class Meta:
        model = AmountDiscountOffer
        fields = ["id", "min_purchase_amount", "discount_type", "discount_value", "applicable_products"]

    def validate(self, attrs):
        discount_type = attrs.get("discount_type") or getattr(self.instance, "discount_type", None)
        discount_value = attrs.get("discount_value")
        if discount_type == AmountDiscountOffer.DiscountType.PERCENTAGE_DISCOUNT and discount_value is not None:
            if not (0 < discount_value <= 100):
                raise serializers.ValidationError({"discount_value": "Percentage must be between 0 and 100."})
        return attrs


class OfferSerializer(serializers.ModelSerializer):
    buy_x_get_y = BuyXGetYOfferSerializer(required=False)
    amount_discount = AmountDiscountOfferSerializer(required=False)

    class Meta:
        model = Offer
        fields = [
            "id", "name", "offer_type", "description", "banner_image", "is_active",
            "start_date", "end_date", "priority", "buy_x_get_y", "amount_discount", "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def create(self, validated_data):
        buy_x_get_y_data = validated_data.pop("buy_x_get_y", None)
        amount_discount_data = validated_data.pop("amount_discount", None)
        offer = Offer.objects.create(**validated_data)
        if offer.offer_type == Offer.OfferType.BUY_X_GET_Y and buy_x_get_y_data:
            buy_products = buy_x_get_y_data.pop("buy_products", [])
            free_products = buy_x_get_y_data.pop("free_products", [])
            rule = BuyXGetYOffer.objects.create(offer=offer, **buy_x_get_y_data)
            rule.buy_products.set(buy_products)
            rule.free_products.set(free_products)
        if offer.offer_type == Offer.OfferType.AMOUNT_DISCOUNT and amount_discount_data:
            applicable_products = amount_discount_data.pop("applicable_products", [])
            rule = AmountDiscountOffer.objects.create(offer=offer, **amount_discount_data)
            rule.applicable_products.set(applicable_products)
        return offer

    def update(self, instance, validated_data):
        buy_x_get_y_data = validated_data.pop("buy_x_get_y", None)
        amount_discount_data = validated_data.pop("amount_discount", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if buy_x_get_y_data is not None:
            buy_products = buy_x_get_y_data.pop("buy_products", None)
            free_products = buy_x_get_y_data.pop("free_products", None)
            rule, _ = BuyXGetYOffer.objects.get_or_create(offer=instance)
            for attr, value in buy_x_get_y_data.items():
                setattr(rule, attr, value)
            rule.save()
            if buy_products is not None:
                rule.buy_products.set(buy_products)
            if free_products is not None:
                rule.free_products.set(free_products)

        if amount_discount_data is not None:
            applicable_products = amount_discount_data.pop("applicable_products", None)
            rule, _ = AmountDiscountOffer.objects.get_or_create(offer=instance)
            for attr, value in amount_discount_data.items():
                setattr(rule, attr, value)
            rule.save()
            if applicable_products is not None:
                rule.applicable_products.set(applicable_products)

        return instance
