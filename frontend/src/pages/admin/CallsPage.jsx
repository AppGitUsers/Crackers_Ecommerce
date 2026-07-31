import { useEffect, useState } from 'react'
import { CallsAPI, CustomersAPI } from '../../api/endpoints'

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

export default function CallsPage() {
  const [calls, setCalls] = useState([])
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  function load() {
    setLoading(true)
    const params = statusFilter ? { status: statusFilter } : {}
    CallsAPI.list(params).then(({ data }) => setCalls(data.results || data)).finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    CustomersAPI.list().then(({ data }) => setCustomers(data.results || data))
  }, [statusFilter])

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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold text-ink-900">Calls</h1>
        <button className="btn-primary" onClick={() => setShowForm(true)}>+ New Call Log</button>
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
        <p className="text-ink-500">Loading…</p>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-sandal-100 text-ink-600 text-left">
              <tr>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Called?</th>
                <th className="px-4 py-3">Answered?</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Notes</th>
                <th className="px-4 py-3">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sandal-100">
              {calls.map((call) => (
                <tr key={call.id}>
                  <td className="px-4 py-3 font-semibold text-ink-900">
                    {call.customer_name}
                    <div className="text-xs text-ink-400 font-normal">{call.customer_phone}</div>
                  </td>
                  <td className="px-4 py-3">{call.order_number || '—'}</td>
                  <td className="px-4 py-3">{call.was_called ? '✅' : '—'}</td>
                  <td className="px-4 py-3">{call.was_answered ? '✅' : '—'}</td>
                  <td className="px-4 py-3">
                    <select
                      className={`badge border-0 capitalize ${statusMeta(call.status).color}`}
                      value={call.status}
                      onChange={(e) => updateStatus(call, e.target.value)}
                    >
                      {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-ink-500 max-w-xs truncate">{call.notes || '—'}</td>
                  <td className="px-4 py-3 text-ink-400 text-xs">{new Date(call.updated_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-30 px-4">
          <form onSubmit={handleSubmit} className="card p-6 w-full max-w-md space-y-3">
            <h2 className="font-bold text-lg text-ink-900">New Call Log</h2>
            <div>
              <label className="text-sm font-semibold text-ink-700">Customer</label>
              <select className="input mt-1" value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })} required>
                <option value="">Select customer…</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold text-ink-700">Status</label>
              <select className="input mt-1" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold text-ink-700">Notes</label>
              <textarea className="input mt-1" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn-primary">Save</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
