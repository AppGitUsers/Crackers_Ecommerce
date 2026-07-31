import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { OrdersAPI } from '../../api/endpoints'

const STATUS_COLORS = {
  received: 'bg-blue-100 text-blue-700',
  packed: 'bg-yellow-100 text-yellow-700',
  out_for_delivery: 'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}
const PAYMENT_COLORS = {
  pending: 'bg-yellow-100 text-yellow-700',
  paid: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  refunded: 'bg-gray-100 text-gray-600',
}

export default function OrdersPage() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  function load() {
    setLoading(true)
    const params = {}
    if (statusFilter) params.current_status = statusFilter
    if (search) params.search = search
    OrdersAPI.list(params)
      .then(({ data }) => setOrders(data.results || data))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [statusFilter])

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-brand-800 mb-6">Orders</h1>

      <div className="flex gap-3 mb-4">
        <input
          className="input max-w-xs"
          placeholder="Search order #, name, phone"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load()}
        />
        <select className="input w-52" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="received">Received</option>
          <option value="packed">Packed</option>
          <option value="out_for_delivery">Out for Delivery</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <button className="btn-secondary" onClick={load}>Search</button>
      </div>

      {loading ? (
        <p className="text-brand-500">Loading…</p>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-sandal-100 text-brand-600 text-left">
              <tr>
                <th className="px-4 py-3">Order #</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Placed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sandal-100">
              {orders.map((o) => (
                <tr
                  key={o.id}
                  className="hover:bg-sandal-50 cursor-pointer"
                  onClick={() => navigate(`/admin/orders/${o.id}`)}
                >
                  <td className="px-4 py-3 font-semibold text-brand-900">{o.order_number}</td>
                  <td className="px-4 py-3">{o.customer_name}<div className="text-xs text-brand-400">{o.customer_phone}</div></td>
                  <td className="px-4 py-3">{o.item_count}</td>
                  <td className="px-4 py-3 font-semibold">₹{o.total_amount}</td>
                  <td className="px-4 py-3">
                    <span className={`badge capitalize ${STATUS_COLORS[o.current_status]}`}>{o.current_status.replace(/_/g, ' ')}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge capitalize ${PAYMENT_COLORS[o.payment_status]}`}>{o.payment_status}</span>
                  </td>
                  <td className="px-4 py-3 text-brand-400 text-xs">{new Date(o.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
