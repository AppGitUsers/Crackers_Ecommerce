import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import { OrdersAPI } from '../../api/endpoints'

export default function CheckoutPage() {
  const { items, subtotal, clearCart } = useCart()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', phone: '', address: '', city: '', pincode: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

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
    <div className="max-w-lg mx-auto">
      <h1 className="text-xl font-extrabold text-ink-900 mb-4">Checkout</h1>

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

        <div className="border-t border-sandal-200 pt-4 flex items-center justify-between">
          <span className="font-semibold text-ink-700">Subtotal</span>
          <span className="text-xl font-extrabold text-ink-900">₹{subtotal.toFixed(2)}</span>
        </div>

        {error && <p className="text-brand-600 text-sm font-semibold">{error}</p>}

        <button type="submit" disabled={submitting} className="btn-primary w-full py-3">
          {submitting ? 'Placing order…' : 'Place Order'}
        </button>
      </form>
    </div>
  )
}
