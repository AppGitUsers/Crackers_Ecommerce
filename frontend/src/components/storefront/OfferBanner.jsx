function describeOffer(offer) {
  if (offer.offer_type === 'buy_x_get_y' && offer.buy_x_get_y) {
    const { buy_quantity, get_quantity } = offer.buy_x_get_y
    return `Buy ${buy_quantity} Get ${get_quantity} Free — ${offer.name}`
  }
  if (offer.offer_type === 'amount_discount' && offer.amount_discount) {
    const { min_purchase_amount, discount_type, discount_value } = offer.amount_discount
    const suffix = discount_type === 'flat_discount' ? 'OFF' : 'worth of products FREE'
    return `Buy for ₹${min_purchase_amount}, get ₹${discount_value} ${suffix} — ${offer.name}`
  }
  return offer.name
}

export default function OfferBanner({ offers }) {
  const track = (
    <div className="flex items-center shrink-0">
      {offers.map((offer) => (
        <span key={offer.id} className="flex items-center px-6 py-2 text-sm font-semibold whitespace-nowrap">
          <span className="text-gold-500 mr-2">✨</span>
          {describeOffer(offer)}
        </span>
      ))}
    </div>
  )

  return (
    <div className="bg-brand-600 text-white overflow-hidden group">
      <div className="flex w-max animate-marquee group-hover:[animation-play-state:paused]">
        {track}
        {track}
      </div>
    </div>
  )
}
