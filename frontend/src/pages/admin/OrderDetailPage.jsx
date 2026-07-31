import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { OrdersAPI } from '../../api/endpoints'

const FULFILLMENT_OPTIONS = ['received', 'packed', 'out_for_delivery', 'delivered', 'cancelled']
const PAYMENT_OPTIONS = ['pending', 'paid', 'failed', 'refunded']

export default function OrderDetailPage() {
  const { id } = useParams()
  const [order, setOrder] = useState(null)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  function load() {
    OrdersAPI.detail(id).then(({ data }) => setOrder(data))
  }

  useEffect(() => { load() }, [id])

  async function updateStatus(statusType, statusValue) {
    setSaving(true)
    try {
      await OrdersAPI.updateStatus(id, { status_type: statusType, status: statusValue, note })
      setNote('')
      load()
    } finally {
      setSaving(false)
    }
  }

  if (!order) return <p className="text-ink-500">Loading…</p>

  return (
    <div className="max-w-4xl">
      <Link to="/admin/orders" className="text-brand-600 text-sm font-semibold hover:text-brand-700">&larr; Back to Orders</Link>
      <div className="flex items-center justify-between mt-2 mb-6">
        <h1 className="text-2xl font-extrabold text-ink-900">{order.order_number}</h1>
        <span className="text-ink-400 text-sm">{new Date(order.created_at).toLocaleString()}</span>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-4 col-span-2">
          <h2 className="font-bold text-ink-900 mb-3">Items</h2>
          <table className="w-full text-sm">
            <thead className="text-ink-500 text-left border-b border-sandal-200">
              <tr>
                <th className="pb-2">Product</th>
                <th className="pb-2">Qty</th>
                <th className="pb-2">Price</th>
                <th className="pb-2 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sandal-100">
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td className="py-2 text-ink-900">{item.product_name}{item.is_free_item && <span className="badge bg-green-100 text-green-700 ml-2">Free</span>}</td>
                  <td className="py-2">{item.quantity}</td>
                  <td className="py-2">₹{item.unit_price}</td>
                  <td className="py-2 text-right">₹{item.subtotal}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-sandal-200 mt-3 pt-3 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-ink-500">Subtotal</span><span className="text-ink-900">₹{order.subtotal_amount}</span></div>
            {Number(order.discount_amount) > 0 && (
              <div className="flex justify-between text-green-600"><span>Discount</span><span>−₹{order.discount_amount}</span></div>
            )}
            <div className="flex justify-between font-bold text-base text-ink-900"><span>Total</span><span>₹{order.total_amount}</span></div>
          </div>
          {order.applied_offers_summary && (
            <p className="text-xs text-ink-400 mt-2">Offers applied: {order.applied_offers_summary}</p>
          )}
        </div>

        <div className="card p-4">
          <h2 className="font-bold text-ink-900 mb-3">Customer</h2>
          <p className="font-semibold text-ink-900">{order.customer.name}</p>
          <p className="text-sm text-ink-500">{order.customer.phone}</p>
          <p className="text-sm text-ink-500 mt-2">{order.delivery_address || order.customer.address}</p>
          {(order.customer.city || order.customer.pincode) && (
            <p className="text-sm text-ink-500">{order.customer.city} {order.customer.pincode}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="card p-4">
          <h2 className="font-bold text-ink-900 mb-3">Order Status</h2>
          <div className="flex flex-wrap gap-2">
            {FULFILLMENT_OPTIONS.map((s) => (
              <button
                key={s}
                disabled={saving}
                onClick={() => updateStatus('fulfillment', s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize border transition-colors ${
                  order.current_status === s ? 'bg-brand-500 text-white border-brand-500' : 'bg-white border-sandal-300 text-ink-700 hover:bg-sandal-100'
                }`}
              >
                {s.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>
        <div className="card p-4">
          <h2 className="font-bold text-ink-900 mb-3">Payment Status</h2>
          <div className="flex flex-wrap gap-2">
            {PAYMENT_OPTIONS.map((s) => (
              <button
                key={s}
                disabled={saving}
                onClick={() => updateStatus('payment', s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize border transition-colors ${
                  order.payment_status === s ? 'bg-brand-500 text-white border-brand-500' : 'bg-white border-sandal-300 text-ink-700 hover:bg-sandal-100'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card p-4 mb-6">
        <label className="text-sm font-semibold text-ink-700">Note for next status change (optional)</label>
        <input className="input mt-1" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Called and confirmed with customer" />
      </div>

      <div className="card p-4">
        <h2 className="font-bold text-ink-900 mb-3">Status Timeline</h2>
        <ul className="space-y-2 text-sm">
          {order.status_history.map((h) => (
            <li key={h.id} className="flex justify-between border-b border-sandal-100 pb-2 last:border-0">
              <span>
                <span className="badge bg-sandal-100 text-ink-700 mr-2 capitalize">{h.status_type}</span>
                <span className="font-semibold capitalize text-ink-900">{h.status.replace(/_/g, ' ')}</span>
                {h.note && <span className="text-ink-400"> — {h.note}</span>}
              </span>
              <span className="text-ink-400 text-xs">{new Date(h.timestamp).toLocaleString()}{h.changed_by_name && ` · ${h.changed_by_name}`}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
