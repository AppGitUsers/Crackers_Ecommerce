import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { OrdersAPI } from '../../api/endpoints'
import { PageLoader, FilterPills, Pagination } from '../../components/admin/ui.jsx'

const PAGE_SIZE = 20

const STATUS_COLORS = {
  received: 'bg-blue-100 text-blue-700',
  packed: 'bg-yellow-100 text-yellow-700',
  out_for_delivery: 'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-brand-50 text-brand-700',
}
const PAYMENT_COLORS = {
  pending: 'bg-yellow-100 text-yellow-700',
  paid: 'bg-green-100 text-green-700',
  failed: 'bg-brand-50 text-brand-700',
  refunded: 'bg-ink-100 text-ink-500',
}

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'received', label: 'Received' },
  { value: 'packed', label: 'Packed' },
  { value: 'out_for_delivery', label: 'Out for Delivery' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
]

export default function OrdersPage() {
  const [orders, setOrders] = useState([])
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  function load(pageToLoad = page) {
    setLoading(true)
    const params = { page: pageToLoad }
    if (statusFilter) params.current_status = statusFilter
    if (search) params.search = search
    OrdersAPI.list(params)
      .then(({ data }) => {
        setOrders(data.results || data)
        setCount(data.count ?? (data.results || data).length)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { setPage(1); load(1) }, [statusFilter])

  function goToPage(p) {
    setPage(p)
    load(p)
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Orders</h1>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative w-full sm:w-64">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            className="input pl-9"
            placeholder="Search order #, name, phone"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && goToPage(1)}
          />
        </div>
        <button className="btn-secondary" onClick={() => goToPage(1)}>Search</button>
      </div>

      <div className="mb-4">
        <FilterPills options={STATUS_FILTER_OPTIONS} value={statusFilter} onChange={setStatusFilter} />
        {statusFilter === '' && <p className="text-xs text-ink-400 mt-1.5">Cancelled orders are hidden from "All" — filter by Cancelled to see them.</p>}
      </div>

      {loading ? (
        <PageLoader />
      ) : (
        <>
          {/* Phone/tablet: card grid, no horizontal scrolling */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:hidden">
            {orders.map((o) => (
              <div
                key={o.id}
                className="card p-4 cursor-pointer hover:bg-sandal-50 transition-colors"
                onClick={() => navigate(`/admin/orders/${o.id}`)}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-ink-900">{o.order_number}</p>
                  <p className="font-semibold text-ink-900 shrink-0">₹{o.total_amount}</p>
                </div>
                <p className="text-sm text-ink-700 mt-1">{o.customer_name}</p>
                <p className="text-xs text-ink-400">{o.customer_phone} · {o.item_count} item(s)</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className={`badge capitalize ${STATUS_COLORS[o.current_status]}`}>{o.current_status.replace(/_/g, ' ')}</span>
                  <span className={`badge capitalize ${PAYMENT_COLORS[o.payment_status]}`}>{o.payment_status}</span>
                </div>
                <p className="text-ink-400 text-xs mt-2">{new Date(o.created_at).toLocaleString()}</p>
              </div>
            ))}
          </div>

          {/* Laptop and up: table */}
          <div className="table-container hidden lg:block">
            <table className="table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th>Placed</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr
                    key={o.id}
                    className="hover:bg-sandal-50 cursor-pointer"
                    onClick={() => navigate(`/admin/orders/${o.id}`)}
                  >
                    <td className="font-semibold text-ink-900">{o.order_number}</td>
                    <td>{o.customer_name}<div className="text-xs text-ink-400">{o.customer_phone}</div></td>
                    <td>{o.item_count}</td>
                    <td className="font-semibold text-ink-900">₹{o.total_amount}</td>
                    <td>
                      <span className={`badge capitalize ${STATUS_COLORS[o.current_status]}`}>{o.current_status.replace(/_/g, ' ')}</span>
                    </td>
                    <td>
                      <span className={`badge capitalize ${PAYMENT_COLORS[o.payment_status]}`}>{o.payment_status}</span>
                    </td>
                    <td className="text-ink-400 text-xs">{new Date(o.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination page={page} count={count} pageSize={PAGE_SIZE} onChange={goToPage} itemLabel="order" />
        </>
      )}
    </div>
  )
}
