import { useEffect, useState } from 'react'
import { Plus, CheckCircle2, Minus, ChevronLeft, ChevronRight } from 'lucide-react'
import { CallsAPI, CustomersAPI } from '../../api/endpoints'
import { Modal, PageLoader } from '../../components/admin/ui.jsx'

const PAGE_SIZE = 20

const STATUS_OPTIONS = [
  { value: 'not_called', label: 'Not Called Yet', color: 'bg-ink-100 text-ink-500' },
  { value: 'no_answer', label: 'Called — No Answer', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'answered', label: 'Called — Answered', color: 'bg-blue-100 text-blue-700' },
  { value: 'interested', label: 'Interested / Proceeding', color: 'bg-purple-100 text-purple-700' },
  { value: 'not_interested', label: 'Not Interested', color: 'bg-orange-100 text-orange-700' },
  { value: 'deal_closed', label: 'Deal Closed — Paid', color: 'bg-green-100 text-green-700' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-brand-50 text-brand-700' },
]

const EMPTY_FORM = { customer: '', notes: '', status: 'not_called', was_called: false, was_answered: false }

function statusMeta(value) {
  return STATUS_OPTIONS.find((s) => s.value === value) || STATUS_OPTIONS[0]
}

function BoolIndicator({ value }) {
  return value
    ? <CheckCircle2 size={16} className="text-green-600" />
    : <Minus size={16} className="text-ink-300" />
}

export default function CallsPage() {
  const [calls, setCalls] = useState([])
  const [customers, setCustomers] = useState([])
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  function load(pageToLoad = page) {
    setLoading(true)
    const params = { page: pageToLoad }
    if (statusFilter) params.status = statusFilter
    CallsAPI.list(params)
      .then(({ data }) => {
        setCalls(data.results || data)
        setCount(data.count ?? (data.results || data).length)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    setPage(1)
    load(1)
    CustomersAPI.list().then(({ data }) => setCustomers(data.results || data))
  }, [statusFilter])

  function goToPage(p) {
    setPage(p)
    load(p)
  }

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE))

  async function handleSubmit(e) {
    e.preventDefault()
    await CallsAPI.create(form)
    setForm(EMPTY_FORM)
    setShowForm(false)
    load()
  }

  async function updateStatus(call, status) {
    const patch = { status }
    if (status !== 'not_called') patch.was_called = true
    if (['answered', 'interested', 'not_interested', 'deal_closed'].includes(status)) patch.was_answered = true
    await CallsAPI.update(call.id, patch)
    load()
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Calls</h1>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={16} />
          New Call Log
        </button>
      </div>

      <div className="flex gap-2 flex-wrap mb-4">
        <button
          onClick={() => setStatusFilter('')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${statusFilter === '' ? 'bg-brand-500 text-white border-brand-500' : 'bg-white border-sandal-300 text-ink-700'}`}
        >
          All
        </button>
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s.value}
            onClick={() => setStatusFilter(s.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${statusFilter === s.value ? 'bg-brand-500 text-white border-brand-500' : 'bg-white border-sandal-300 text-ink-700'}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {loading ? (
        <PageLoader />
      ) : (
        <>
          {/* Phone/tablet: card grid, no horizontal scrolling */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:hidden">
            {calls.map((call) => (
              <div key={call.id} className="card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink-900 truncate">{call.customer_name}</p>
                    <p className="text-xs text-ink-400">{call.customer_phone}</p>
                  </div>
                  <p className="text-xs text-ink-400 shrink-0">{call.order_number || '—'}</p>
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-ink-500">
                  <span className="flex items-center gap-1">Called <BoolIndicator value={call.was_called} /></span>
                  <span className="flex items-center gap-1">Answered <BoolIndicator value={call.was_answered} /></span>
                </div>
                <select
                  className={`badge border-0 capitalize mt-3 ${statusMeta(call.status).color}`}
                  value={call.status}
                  onChange={(e) => updateStatus(call, e.target.value)}
                >
                  {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                {call.notes && <p className="text-sm text-ink-600 mt-2">{call.notes}</p>}
                <p className="text-ink-400 text-xs mt-2">{new Date(call.updated_at).toLocaleString()}</p>
              </div>
            ))}
          </div>

          {/* Laptop and up: table */}
          <div className="table-container hidden lg:block">
            <table className="table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Order</th>
                  <th>Called?</th>
                  <th>Answered?</th>
                  <th>Status</th>
                  <th>Notes</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {calls.map((call) => (
                  <tr key={call.id}>
                    <td className="font-semibold text-ink-900">
                      {call.customer_name}
                      <div className="text-xs text-ink-400 font-normal">{call.customer_phone}</div>
                    </td>
                    <td>{call.order_number || '—'}</td>
                    <td><BoolIndicator value={call.was_called} /></td>
                    <td><BoolIndicator value={call.was_answered} /></td>
                    <td>
                      <select
                        className={`badge border-0 capitalize ${statusMeta(call.status).color}`}
                        value={call.status}
                        onChange={(e) => updateStatus(call, e.target.value)}
                      >
                        {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </td>
                    <td className="text-ink-500 max-w-xs truncate">{call.notes || '—'}</td>
                    <td className="text-ink-400 text-xs">{new Date(call.updated_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-ink-400">
                Page {page} of {totalPages} · {count} call{count === 1 ? '' : 's'}
              </p>
              <div className="flex items-center gap-2">
                <button
                  className="btn-secondary px-3 py-1.5"
                  disabled={page <= 1}
                  onClick={() => goToPage(page - 1)}
                >
                  <ChevronLeft size={16} />
                  Prev
                </button>
                <button
                  className="btn-secondary px-3 py-1.5"
                  disabled={page >= totalPages}
                  onClick={() => goToPage(page + 1)}
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title="New Call Log"
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            <button type="submit" form="call-form" className="btn-primary">Save</button>
          </>
        }
      >
        <form id="call-form" onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="label">Customer</label>
            <select className="input" value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })} required>
              <option value="">Select customer…</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>)}
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </form>
      </Modal>
    </div>
  )
}
