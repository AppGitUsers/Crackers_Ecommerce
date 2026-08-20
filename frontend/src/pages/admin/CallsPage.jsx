import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, CheckCircle2, Minus, Phone, ExternalLink, PhoneOff, PhoneMissed, PhoneCall } from 'lucide-react'
import { CallsAPI } from '../../api/endpoints'
import { Modal, PageLoader, Empty, FilterPills, Pagination, Select } from '../../components/admin/ui.jsx'
import { useToast } from '../../context/ToastContext.jsx'

const PAGE_SIZE = 20

// The three statuses the dashboard's summary tiles surface — the other two
// (deal_closed, cancelled) stay reachable via the filter pills below, just
// not called out as top-line KPIs.
const SUMMARY_TILES = [
  { value: 'not_called', label: 'Not Called Yet', icon: PhoneOff, accent: 'bg-ink-100 text-ink-600' },
  { value: 'no_answer', label: 'Called — No Answer', icon: PhoneMissed, accent: 'bg-yellow-100 text-yellow-700' },
  { value: 'answered', label: 'Called — Answered', icon: PhoneCall, accent: 'bg-blue-100 text-blue-700' },
]

const STATUS_OPTIONS = [
  { value: 'not_called', label: 'Not Called Yet', color: 'bg-ink-100 text-ink-500' },
  { value: 'no_answer', label: 'Called — No Answer', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'answered', label: 'Called — Answered', color: 'bg-blue-100 text-blue-700' },
  { value: 'deal_closed', label: 'Deal Closed — Paid', color: 'bg-green-100 text-green-700' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-brand-50 text-brand-700' },
]

const STATUS_FILTER_OPTIONS = [{ value: '', label: 'All' }, ...STATUS_OPTIONS.map((s) => ({ value: s.value, label: s.label }))]

// A freshly logged call means someone actually dialled — "not called yet"
// only makes sense for the auto-created placeholder row, not a manual entry.
const LOG_STATUS_OPTIONS = STATUS_OPTIONS.filter((s) => s.value !== 'not_called')

const EMPTY_LOG_FORM = { status: 'no_answer', notes: '' }

function statusMeta(value) {
  return STATUS_OPTIONS.find((s) => s.value === value) || STATUS_OPTIONS[0]
}

function BoolIndicator({ value }) {
  return value
    ? <CheckCircle2 size={16} className="text-green-600" />
    : <Minus size={16} className="text-ink-300" />
}

export default function CallsPage() {
  const toast = useToast()
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [statusCounts, setStatusCounts] = useState({})

  const [activeOrder, setActiveOrder] = useState(null)
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [showLogForm, setShowLogForm] = useState(false)
  const [logForm, setLogForm] = useState(EMPTY_LOG_FORM)
  const [saving, setSaving] = useState(false)

  function loadOrders(pageToLoad = page) {
    setLoading(true)
    const params = { page: pageToLoad }
    if (statusFilter) params.status = statusFilter
    CallsAPI.orders(params)
      .then(({ data }) => {
        setOrders(data.results || data)
        setCount(data.count ?? (data.results || data).length)
      })
      .finally(() => setLoading(false))
  }

  function loadCounts() {
    CallsAPI.statusCounts().then(({ data }) => setStatusCounts(data))
  }

  useEffect(() => {
    setPage(1)
    loadOrders(1)
  }, [statusFilter])

  useEffect(() => { loadCounts() }, [])

  function goToPage(p) {
    setPage(p)
    loadOrders(p)
  }

  function toggleTile(value) {
    setStatusFilter((current) => (current === value ? '' : value))
  }

  function loadHistory(orderId) {
    setHistoryLoading(true)
    CallsAPI.history(orderId)
      .then(({ data }) => setHistory(data.results || data))
      .finally(() => setHistoryLoading(false))
  }

  function openOrder(order) {
    setActiveOrder(order)
    setShowLogForm(false)
    setLogForm(EMPTY_LOG_FORM)
    loadHistory(order.id)
  }

  function closeDrawer() {
    setActiveOrder(null)
    setHistory([])
    setShowLogForm(false)
  }

  async function submitNewCall(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await CallsAPI.create({
        customer: activeOrder.customer_id,
        order: activeOrder.id,
        status: logForm.status,
        notes: logForm.notes,
        was_called: true,
        was_answered: ['answered', 'deal_closed'].includes(logForm.status),
      })
      toast.success('Call logged.')
      setShowLogForm(false)
      setLogForm(EMPTY_LOG_FORM)
      loadHistory(activeOrder.id)
      loadOrders()
      loadCounts()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Calls</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        {SUMMARY_TILES.map((tile) => {
          const Icon = tile.icon
          const active = statusFilter === tile.value
          return (
            <button
              key={tile.value}
              type="button"
              onClick={() => toggleTile(tile.value)}
              className={`kpi-card text-left transition-shadow ${active ? 'ring-2 ring-brand-500' : 'hover:shadow-elevated'}`}
            >
              <div className={`kpi-icon ${tile.accent}`}>
                <Icon size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-ink-400 uppercase tracking-wide truncate">{tile.label}</p>
                <p className="text-xl font-extrabold text-ink-900">{statusCounts[tile.value] ?? '—'}</p>
              </div>
            </button>
          )
        })}
      </div>

      <div className="mb-4">
        <FilterPills options={STATUS_FILTER_OPTIONS} value={statusFilter} onChange={setStatusFilter} />
      </div>

      {loading ? (
        <PageLoader />
      ) : orders.length === 0 ? (
        <Empty message="No orders match this filter" icon={<Phone size={32} />} />
      ) : (
        <>
          {/* Phone/tablet: card grid, no horizontal scrolling */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:hidden">
            {orders.map((order) => (
              <div key={order.id} className="card p-4 cursor-pointer active:scale-[0.99] transition-transform" onClick={() => openOrder(order)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink-900 truncate">{order.customer_name}</p>
                    <p className="text-xs text-ink-400">{order.customer_phone}</p>
                  </div>
                  <p className="text-xs text-ink-400 shrink-0">{order.order_number}</p>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span className={`badge border-0 capitalize ${statusMeta(order.latest_call_status).color}`}>
                    {order.latest_call_status_display}
                  </span>
                  <span className="text-xs text-ink-400">{order.call_count} call{order.call_count === 1 ? '' : 's'}</span>
                </div>
                <p className="text-ink-400 text-xs mt-2">{new Date(order.latest_call_at).toLocaleString()}</p>
              </div>
            ))}
          </div>

          {/* Laptop and up: table */}
          <div className="table-container hidden lg:block">
            <table className="table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Calls</th>
                  <th>Last Activity</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="cursor-pointer" onClick={() => openOrder(order)}>
                    <td className="font-semibold text-ink-900">{order.order_number}</td>
                    <td>
                      {order.customer_name}
                      <div className="text-xs text-ink-400 font-normal">{order.customer_phone}</div>
                    </td>
                    <td>₹{Number(order.total_amount).toFixed(2)}</td>
                    <td>
                      <span className={`badge border-0 capitalize ${statusMeta(order.latest_call_status).color}`}>
                        {order.latest_call_status_display}
                      </span>
                    </td>
                    <td>{order.call_count}</td>
                    <td className="text-ink-400 text-xs">{new Date(order.latest_call_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination page={page} count={count} pageSize={PAGE_SIZE} onChange={goToPage} itemLabel="order" />
        </>
      )}

      <Modal
        open={!!activeOrder}
        onClose={closeDrawer}
        size="lg"
        title={activeOrder ? `${activeOrder.order_number} — ${activeOrder.customer_name}` : ''}
        footer={
          <div className="flex items-center justify-between w-full gap-2">
            <button type="button" className="btn-secondary" onClick={() => navigate(`/admin/orders/${activeOrder.id}`)}>
              <ExternalLink size={16} />
              Open Order
            </button>
            {showLogForm ? (
              <div className="flex items-center gap-2">
                <button type="button" className="btn-secondary" onClick={() => setShowLogForm(false)}>Cancel</button>
                <button type="submit" form="log-call-form" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : 'Save Call'}
                </button>
              </div>
            ) : (
              <button type="button" className="btn-primary" onClick={() => setShowLogForm(true)}>
                <Plus size={16} />
                Log New Call
              </button>
            )}
          </div>
        }
      >
        {activeOrder && (
          <div>
            <p className="text-xs text-ink-400 mb-3">{activeOrder.customer_phone}</p>

            {showLogForm && (
              <form id="log-call-form" onSubmit={submitNewCall} className="space-y-3 mb-4 p-3 rounded-lg bg-sandal-50 border border-sandal-200">
                <div>
                  <label className="label">Call Outcome</label>
                  <Select value={logForm.status} onChange={(v) => setLogForm({ ...logForm, status: v })} options={LOG_STATUS_OPTIONS} />
                </div>
                <div>
                  <label className="label">Notes</label>
                  <textarea className="input" value={logForm.notes} onChange={(e) => setLogForm({ ...logForm, notes: e.target.value })} />
                </div>
              </form>
            )}

            {historyLoading ? (
              <PageLoader />
            ) : history.length === 0 ? (
              <Empty message="No calls made yet" icon={<Phone size={32} />} />
            ) : (
              <div className="space-y-2">
                {history.map((call, i) => (
                  <div key={call.id} className="card p-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-semibold text-ink-400">Call #{i + 1}</span>
                      <span className={`badge border-0 capitalize ${statusMeta(call.status).color}`}>
                        {statusMeta(call.status).label}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-ink-500">
                      <span className="flex items-center gap-1">Called <BoolIndicator value={call.was_called} /></span>
                      <span className="flex items-center gap-1">Answered <BoolIndicator value={call.was_answered} /></span>
                      {call.handled_by_name && <span>by {call.handled_by_name}</span>}
                    </div>
                    {call.notes && <p className="text-sm text-ink-600 mt-2">{call.notes}</p>}
                    <p className="text-ink-400 text-xs mt-2">{new Date(call.created_at).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
