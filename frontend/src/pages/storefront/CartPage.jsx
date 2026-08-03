import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useCart } from '../../context/CartContext'

export default function CartPage() {
  const { items, setQuantity, removeItem, subtotal } = useCart()
  const navigate = useNavigate()

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
      <div className="card divide-y divide-sandal-200">
        {items.map((item) => (
          <div key={item.product_id} className="flex items-center gap-3 p-4">
            <div className="w-14 h-14 bg-sandal-100 rounded-lg flex items-center justify-center text-2xl shrink-0">
              {item.image ? <img src={item.image} className="w-full h-full object-cover rounded-lg" /> : '🎇'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate text-ink-900">{item.name}</p>
              <p className="text-sm text-ink-500">₹{item.price} / {item.unit_label}</p>
            </div>
            <div className="flex items-center border border-sandal-300 rounded-lg overflow-hidden">
              <button className="w-8 h-8 font-bold hover:bg-sandal-100" onClick={() => setQuantity(item.product_id, item.quantity - 1)}>−</button>
              <span className="w-8 text-center font-semibold text-ink-900">{item.quantity}</span>
              <button className="w-8 h-8 font-bold hover:bg-sandal-100" onClick={() => setQuantity(item.product_id, item.quantity + 1)}>+</button>
            </div>
            <button className="text-brand-600 text-sm font-semibold hover:text-brand-700" onClick={() => removeItem(item.product_id)}>Remove</button>
          </div>
        ))}
      </div>

      <div className="card mt-4 p-4 flex items-center justify-between">
        <span className="font-semibold text-ink-700">Subtotal</span>
        <span className="text-xl font-extrabold text-ink-900">₹{subtotal.toFixed(2)}</span>
      </div>
      <p className="text-xs text-ink-400 mt-1">Offers, if any, are applied at checkout.</p>

      <button className="btn-primary w-full mt-4 py-3" onClick={() => navigate('/checkout')}>
        Proceed to Checkout
      </button>
    </div>
  )
}
