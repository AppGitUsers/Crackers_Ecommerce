function describeOffer(offer) {
  if (offer.offer_type === 'buy_x_get_y' && offer.buy_x_get_y) {
    const { buy_quantity, get_quantity } = offer.buy_x_get_y
    return `🎁 Buy ${buy_quantity} Get ${get_quantity} Free — ${offer.name}`
  }
  if (offer.offer_type === 'amount_discount' && offer.amount_discount) {
    const { min_purchase_amount, discount_type, discount_value } = offer.amount_discount
    const suffix = discount_type === 'flat_discount' ? 'OFF' : 'worth of products FREE'
    return `💥 Buy for ₹${min_purchase_amount}, get ₹${discount_value} ${suffix} — ${offer.name}`
  }
  return offer.name
}

export default function OfferBanner({ offers }) {
  return (
    <div className="bg-brand-500 text-white overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 py-2 text-sm font-semibold flex flex-wrap gap-x-8 gap-y-1 justify-center text-center">
        {offers.map((offer) => (
          <span key={offer.id}>{describeOffer(offer)}</span>
        ))}
      </div>
    </div>
  )
}
