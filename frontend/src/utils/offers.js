// Mirrors the qualification logic in backend/apps/offers/services.py
// (evaluate_cart_offers) closely enough to tell the customer, before they
// even reach checkout, which active offers their current cart already
// qualifies for and exactly what they'll get — the backend remains the
// source of truth that actually applies the discount at checkout.

export function getUnlockedOffers(items, offers, products) {
  const qtyByProduct = {}
  const priceByProduct = {}
  items.forEach((i) => {
    qtyByProduct[i.product_id] = (qtyByProduct[i.product_id] || 0) + i.quantity
    priceByProduct[i.product_id] = i.price
  })
  const subtotal = items.reduce((sum, i) => sum + i.quantity * i.price, 0)
  const productsById = Object.fromEntries(products.map((p) => [p.id, p]))

  const unlocked = []

  for (const offer of offers) {
    if (offer.offer_type === 'buy_x_get_y' && offer.buy_x_get_y) {
      const rule = offer.buy_x_get_y
      const totalBuyQty = rule.buy_products.reduce((sum, pid) => sum + (qtyByProduct[pid] || 0), 0)
      if (rule.buy_quantity > 0 && totalBuyQty >= rule.buy_quantity) {
        const multiples = Math.floor(totalBuyQty / rule.buy_quantity)
        const freeQty = multiples * rule.get_quantity
        if (freeQty > 0) {
          const freeIds = rule.free_products.length ? rule.free_products : rule.buy_products
          const freeProduct = productsById[freeIds[0]]
          unlocked.push({
            id: `bxgy-${offer.id}`,
            type: 'buy_x_get_y',
            offerName: offer.name,
            freeQty,
            freeProductName: freeProduct?.name || 'item',
          })
        }
      }
    } else if (offer.offer_type === 'amount_discount' && offer.amount_discount) {
      const rule = offer.amount_discount
      const applicableIds = rule.applicable_products || []
      const relevantSubtotal = applicableIds.length
        ? applicableIds.reduce((sum, pid) => sum + (qtyByProduct[pid] || 0) * (priceByProduct[pid] || 0), 0)
        : subtotal

      if (rule.discount_type === 'percentage_discount') {
        // No minimum — unlocked whenever something in scope is actually in the cart.
        if (relevantSubtotal > 0) {
          const pct = Number(rule.discount_value)
          const rupees = Math.round(relevantSubtotal * pct) / 100
          unlocked.push({ id: `amt-${offer.id}`, type: 'percentage_discount', offerName: offer.name, pct, value: rupees })
        }
        continue
      }

      if (relevantSubtotal >= Number(rule.min_purchase_amount)) {
        unlocked.push({
          id: `amt-${offer.id}`,
          type: rule.discount_type, // 'flat_discount' | 'free_products_worth'
          offerName: offer.name,
          minPurchase: Number(rule.min_purchase_amount),
          value: Number(rule.discount_value),
        })
      }
    }
  }

  return unlocked
}

// One-line summary of an offer's mechanics from its raw definition (not tied
// to a cart) — used for the banner slide and the homepage offers strip.
export function offerMechanicText(offer) {
  if (offer.offer_type === 'buy_x_get_y' && offer.buy_x_get_y) {
    const { buy_quantity, get_quantity } = offer.buy_x_get_y
    return `Buy ${buy_quantity} Get ${get_quantity} Free`
  }
  if (offer.offer_type === 'amount_discount' && offer.amount_discount) {
    const { min_purchase_amount, discount_type, discount_value } = offer.amount_discount
    if (discount_type === 'percentage_discount') {
      return `${discount_value}% OFF`
    }
    const suffix = discount_type === 'flat_discount' ? 'OFF' : 'worth of products FREE'
    return `Buy for ₹${min_purchase_amount}, get ₹${discount_value} ${suffix}`
  }
  return ''
}

export function describeUnlockedOffer(u) {
  if (u.type === 'buy_x_get_y') {
    return `${u.freeQty} × ${u.freeProductName} will be added free at checkout.`
  }
  if (u.type === 'flat_discount') {
    return `₹${u.value} OFF will be applied at checkout.`
  }
  if (u.type === 'percentage_discount') {
    return `${u.pct}% OFF (₹${u.value}) will be applied at checkout.`
  }
  if (u.type === 'free_products_worth') {
    return `Pick ₹${u.value} worth of products free at checkout.`
  }
  return 'Applied at checkout.'
}
