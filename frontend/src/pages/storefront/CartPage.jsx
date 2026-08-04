import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Gift, Tag, CheckCircle2, ImageOff } from 'lucide-react'
import { useCart } from '../../context/CartContext'
import { OffersAPI, ProductsAPI } from '../../api/endpoints'
import { getUnlockedOffers, describeUnlockedOffer } from '../../utils/offers'

const OFFER_ICONS = {
  buy_x_get_y: Gift,
  free_products_worth: Gift,
  flat_discount: Tag,
}

export default function CartPage() {
  const { items, setQuantity, removeItem, subtotal } = useCart()
  const navigate = useNavigate()

  const [offers, setOffers] = useState([])
  const [products, setProducts] = useState([])

  useEffect(() => {
    OffersAPI.active().then(({ data }) => setOffers(data)).catch(() => setOffers([]))
    ProductsAPI.list().then(({ data }) => setProducts(data.results || data)).catch(() => setProducts([]))
  }, [])

  const unlockedOffers = useMemo(
    () => getUnlockedOffers(items, offers, products),
    [items, offers, products]
  )

  const backLink = (
    <Link to="/" className="inline-flex items-center gap-1.5 text-brand-600 text-sm font-semibold hover:text-brand-700">
      <ArrowLeft size={15} />
      Back to Shopping
    </Link>
  )

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-3">{backLink}</div>
        <div className="text-center py-20">
          <p className="text-ink-600 mb-4">Your cart is empty.</p>
          <Link to="/" className="btn-primary">Browse products</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-3">{backLink}</div>
      <h1 className="text-xl font-extrabold text-ink-900 mb-4">Your Cart</h1>

      {unlockedOffers.length > 0 && (
        <div className="card p-4 mb-4 border-2 border-brand-200 bg-brand-50/50 animate-fade-in-up">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 size={18} className="text-brand-600" />
            <h2 className="font-bold text-ink-900">Offer{unlockedOffers.length > 1 ? 's' : ''} Unlocked!</h2>
          </div>
          <div className="space-y-2.5">
            {unlockedOffers.map((u) => {
              const Icon = OFFER_ICONS[u.type] || Gift
              return (
                <div key={u.id} className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center shrink-0 mt-0.5">
                    <Icon size={14} className="text-brand-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-ink-900">{u.offerName}</p>
                    <p className="text-sm text-ink-600">{describeUnlockedOffer(u)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="card divide-y divide-sandal-200">
        {items.map((item) => (
          <div key={item.product_id} className="flex items-center gap-3 p-4">
            <div className="w-14 h-14 rounded-lg overflow-hidden flex items-center justify-center shrink-0 ring-1 ring-black/5 bg-gradient-to-br from-sandal-50 to-sandal-100">
              {item.image ? (
                <img src={item.image} className="w-full h-full object-cover" />
              ) : (
                <ImageOff size={18} className="text-sandal-400" strokeWidth={1.5} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate text-ink-900">{item.name}</p>
              <p className="text-sm text-ink-500">₹{item.price} / {item.unit_label}</p>
            </div>
            <div className="flex items-center border border-sandal-300 rounded-lg overflow-hidden">
              <button className="w-8 h-8 font-bold hover:bg-sandal-100 active:scale-90 transition-transform" onClick={() => setQuantity(item.product_id, item.quantity - 1)}>−</button>
              <span className="w-8 text-center font-semibold text-ink-900">{item.quantity}</span>
              <button className="w-8 h-8 font-bold hover:bg-sandal-100 active:scale-90 transition-transform" onClick={() => setQuantity(item.product_id, item.quantity + 1)}>+</button>
            </div>
            <button className="text-brand-600 text-sm font-semibold hover:text-brand-700" onClick={() => removeItem(item.product_id)}>Remove</button>
          </div>
        ))}
      </div>

      <div className="card mt-4 p-4 flex items-center justify-between">
        <span className="font-semibold text-ink-700">Subtotal</span>
        <span className="text-xl font-extrabold text-ink-900">₹{subtotal.toFixed(2)}</span>
      </div>
      <p className="text-xs text-ink-400 mt-1">
        {unlockedOffers.length > 0 ? 'Offer details above will be applied at checkout.' : 'Offers, if any, are applied at checkout.'}
      </p>

      <button className="btn-primary w-full mt-4 py-3" onClick={() => navigate('/checkout')}>
        Proceed to Checkout
      </button>
    </div>
  )
}
