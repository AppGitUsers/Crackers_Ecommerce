import { useEffect, useMemo, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Gift, ArrowLeft } from 'lucide-react'
import { useCart } from '../../context/CartContext'
import { OrdersAPI, OffersAPI, ProductsAPI } from '../../api/endpoints'
import { getUnlockedOffers } from '../../utils/offers'

export default function CheckoutPage() {
  const { items, subtotal, clearCart } = useCart()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', phone: '', address: '', city: '', pincode: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [offers, setOffers] = useState([])
  const [products, setProducts] = useState([])
  const [freeSelections, setFreeSelections] = useState({}) // { [productId]: quantity }

  useEffect(() => {
    OffersAPI.active().then(({ data }) => setOffers(data)).catch(() => setOffers([]))
    ProductsAPI.list().then(({ data }) => setProducts(data.results || data)).catch(() => setProducts([]))
  }, [])

  // Any active "spend ₹X, get ₹Y worth of products free" offer the current
  // cart subtotal qualifies for — their ₹ values stack into one budget, same
  // as the backend (apps.offers.services.evaluate_cart_offers) does.
  const freeBudget = useMemo(() => {
    return offers
      .filter((o) => o.offer_type === 'amount_discount' && o.amount_discount?.discount_type === 'free_products_worth')
      .filter((o) => subtotal >= Number(o.amount_discount.min_purchase_amount))
      .reduce((sum, o) => sum + Number(o.amount_discount.discount_value), 0)
  }, [offers, subtotal])

  // flat_discount offers actually reduce what's charged — CartPage already
  // promises "₹X OFF will be applied at checkout" for these, so the total
  // shown here has to reflect it too, not just the free-products picker.
  const flatDiscount = useMemo(() => {
    const unlocked = getUnlockedOffers(items, offers, products)
    return unlocked
      .filter((u) => u.type === 'flat_discount')
      .reduce((sum, u) => sum + u.value, 0)
  }, [items, offers, products])

  const total = Math.max(0, subtotal - flatDiscount)

  const productsById = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p])), [products])
  const eligibleProducts = useMemo(() => products.filter((p) => p.in_stock), [products])

  const selectedValue = useMemo(
    () => Object.entries(freeSelections).reduce((sum, [pid, qty]) => sum + qty * Number(productsById[pid]?.price || 0), 0),
    [freeSelections, productsById]
  )

  function incFree(product) {
    if (selectedValue + Number(product.price) > freeBudget) return
    setFreeSelections((prev) => ({ ...prev, [product.id]: (prev[product.id] || 0) + 1 }))
  }
  function decFree(product) {
    setFreeSelections((prev) => {
      const next = { ...prev }
      const q = (next[product.id] || 0) - 1
      if (q <= 0) delete next[product.id]
      else next[product.id] = q
      return next
    })
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-ink-600 mb-4">Your cart is empty.</p>
        <Link to="/" className="btn-primary">Browse products</Link>
      </div>
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.name.trim() || !form.phone.trim()) {
      setError('Name and phone number are required.')
      return
    }
    setSubmitting(true)
    try {
      const payload = {
        ...form,
        items: items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
        free_product_selections: Object.entries(freeSelections).map(([pid, qty]) => ({
          product_id: Number(pid),
          quantity: qty,
        })),
      }
      const { data } = await OrdersAPI.checkout(payload)
      clearCart()
      navigate(`/order-success/${data.order_number}`, { state: { order: data } })
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong placing your order. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <Link to="/cart" className="inline-flex items-center gap-1.5 text-brand-600 text-sm font-semibold hover:text-brand-700">
        <ArrowLeft size={15} />
        Back to Cart
      </Link>
      <h1 className="text-xl font-extrabold text-ink-900">Checkout</h1>

      {freeBudget > 0 && (
        <div className="card p-5 animate-fade-in-up">
          <div className="flex items-center gap-2 mb-1">
            <Gift size={18} className="text-brand-600" />
            <h2 className="font-bold text-ink-900">Pick Your Free Products</h2>
          </div>
          <p className="text-sm text-ink-500 mb-3">
            You've unlocked ₹{freeBudget.toFixed(2)} worth of free products — pick items below up to that value.
          </p>
          <div className="flex items-center justify-between text-sm font-semibold mb-3 bg-sandal-50 rounded-lg px-3 py-2">
            <span className="text-ink-700">Selected: ₹{selectedValue.toFixed(2)}</span>
            <span className="text-brand-600">Remaining: ₹{(freeBudget - selectedValue).toFixed(2)}</span>
          </div>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {eligibleProducts.map((p) => {
              const sel = freeSelections[p.id] || 0
              const wouldExceed = selectedValue + Number(p.price) > freeBudget
              return (
                <div key={p.id} className="flex items-center justify-between border border-sandal-200 rounded-lg px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink-900 truncate">{p.name}</p>
                    <p className="text-xs text-ink-400">₹{p.price} / {p.unit_label}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {sel > 0 && (
                      <>
                        <button type="button" onClick={() => decFree(p)} className="w-7 h-7 rounded-lg border border-sandal-300 font-bold text-brand-600 hover:bg-sandal-100 active:scale-90 transition-transform">−</button>
                        <span className="w-5 text-center text-sm font-semibold text-ink-900">{sel}</span>
                      </>
                    )}
                    <button
                      type="button"
                      disabled={wouldExceed}
                      onClick={() => incFree(p)}
                      className="w-7 h-7 rounded-lg border border-sandal-300 font-bold text-brand-600 hover:bg-sandal-100 active:scale-90 transition-transform disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100"
                    >
                      +
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card p-5 space-y-4">
        <div>
          <label className="text-sm font-semibold text-ink-700">Full Name *</label>
          <input className="input mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div>
          <label className="text-sm font-semibold text-ink-700">Phone Number *</label>
          <input className="input mt-1" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
          <p className="text-xs text-ink-400 mt-1">We'll call this number to confirm your order and payment.</p>
        </div>
        <div>
          <label className="text-sm font-semibold text-ink-700">Delivery Address</label>
          <textarea className="input mt-1" rows={3} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-semibold text-ink-700">City</label>
            <input className="input mt-1" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-semibold text-ink-700">Pincode</label>
            <input className="input mt-1" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} />
          </div>
        </div>

        <div className="border-t border-sandal-200 pt-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-ink-700">Subtotal</span>
            <span className="text-ink-900">₹{subtotal.toFixed(2)}</span>
          </div>
          {flatDiscount > 0 && (
            <div className="flex items-center justify-between text-green-600 text-sm">
              <span>Offer discount</span>
              <span>−₹{flatDiscount.toFixed(2)}</span>
            </div>
          )}
          {selectedValue > 0 && (
            <div className="flex items-center justify-between text-green-600 text-sm">
              <span>Free products</span>
              <span>₹{selectedValue.toFixed(2)} <span className="text-ink-400">(free)</span></span>
            </div>
          )}
          <div className="flex items-center justify-between pt-1">
            <span className="font-bold text-ink-900">Total</span>
            <span className="text-xl font-extrabold text-ink-900">₹{total.toFixed(2)}</span>
          </div>
        </div>

        {error && <p className="text-brand-600 text-sm font-semibold">{error}</p>}

        <button type="submit" disabled={submitting} className="btn-primary w-full py-3">
          {submitting ? 'Placing order…' : 'Place Order'}
        </button>
      </form>
    </div>
  )
}
