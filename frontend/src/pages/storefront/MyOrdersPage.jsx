import { useState } from 'react'
import { OrdersAPI } from '../../api/endpoints'

const FULFILLMENT_STEPS = [
  { key: 'received', label: 'Received' },
  { key: 'packed', label: 'Packed' },
  { key: 'out_for_delivery', label: 'Out for Delivery' },
  { key: 'delivered', label: 'Delivered' },
]

function StatusTracker({ order }) {
  const cancelled = order.current_status === 'cancelled'
  const currentIndex = FULFILLMENT_STEPS.findIndex((s) => s.key === order.current_status)

  const timestampFor = (statusKey) => {
    const entry = order.status_history.find((h) => h.status_type === 'fulfillment' && h.status === statusKey)
    return entry ? new Date(entry.timestamp).toLocaleString() : null
  }

  if (cancelled) {
    return <p className="text-brand-600 font-semibold text-sm">This order was cancelled.</p>
  }

  return (
    <div className="flex flex-col gap-3 mt-3">
      {FULFILLMENT_STEPS.map((step, idx) => {
        const done = idx <= currentIndex
        const ts = timestampFor(step.key)
        return (
          <div key={step.key} className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full shrink-0 ${done ? 'bg-brand-500' : 'bg-sandal-300'}`} />
            <div className="flex-1 flex items-center justify-between">
              <span className={`text-sm font-semibold ${done ? 'text-ink-900' : 'text-ink-400'}`}>{step.label}</span>
              {ts && <span className="text-xs text-ink-400">{ts}</span>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function OrderCard({ order }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="card p-4">
      <button className="w-full flex items-center justify-between" onClick={() => setExpanded((e) => !e)}>
        <div className="text-left">
          <p className="font-bold text-ink-900">{order.order_number}</p>
          <p className="text-xs text-ink-400">{new Date(order.created_at).toLocaleString()}</p>
        </div>
        <div className="text-right">
          <p className="font-bold text-ink-900">₹{order.total_amount}</p>
          <span className="badge bg-ink-100 text-ink-700 capitalize">{order.current_status.replace(/_/g, ' ')}</span>
        </div>
      </button>

      {expanded && (
        <div className="mt-4 border-t border-sandal-200 pt-4">
          <p className="text-sm font-semibold text-ink-700 mb-2">Items</p>
          <ul className="text-sm text-ink-600 space-y-1 mb-4">
            {order.items.map((item) => (
              <li key={item.id} className="flex justify-between">
                <span>{item.quantity} × {item.product_name}{item.is_free_item && ' (Free)'}</span>
                <span>₹{item.subtotal}</span>
              </li>
            ))}
          </ul>
          <p className="text-sm font-semibold text-ink-700 mb-1">Order Status</p>
          <StatusTracker order={order} />
          <p className="text-sm font-semibold text-ink-700 mt-4">
            Payment Status: <span className="font-normal capitalize">{order.payment_status}</span>
          </p>
        </div>
      )}
    </div>
  )
}

export default function MyOrdersPage() {
  const [phone, setPhone] = useState('')
  const [orders, setOrders] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleLookup(e) {
    e.preventDefault()
    if (!phone.trim()) return
    setLoading(true)
    try {
      const { data } = await OrdersAPI.myOrders(phone.trim())
      setOrders(data)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-xl font-extrabold text-ink-900 mb-4">My Orders</h1>
      <form onSubmit={handleLookup} className="flex gap-2 mb-6">
        <input
          className="input"
          placeholder="Enter the phone number you checked out with"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <button className="btn-primary shrink-0" disabled={loading}>{loading ? 'Searching…' : 'Find'}</button>
      </form>

      {orders !== null && (
        <div className="space-y-3">
          {orders.length === 0 ? (
            <p className="text-ink-500 text-center py-10">No orders found for this number.</p>
          ) : (
            orders.map((order) => <OrderCard key={order.id} order={order} />)
          )}
        </div>
      )}
    </div>
  )
}
