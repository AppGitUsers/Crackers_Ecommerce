import { useEffect, useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import { FinanceAPI } from '../../api/endpoints'
import StatCard from '../../components/admin/StatCard.jsx'

// Local-calendar-date formatting — toISOString() converts to UTC first, which
// silently shifts the date by a day depending on the machine's timezone offset.
function toLocalDateString(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const EMPTY_FORM = { transaction_type: 'income', category: 'sales', amount: '', description: '', date: toLocalDateString(new Date()) }

// Fixed categorical assignment — color follows the category, never its rank in
// a given month's data, so a category keeps its color even when others drop out.
const CATEGORY_COLORS = {
  sales: '#2a78d6',
  manual_payment: '#eb6834',
  inventory_purchase: '#1baf7a',
  delivery: '#eda100',
  marketing: '#e87ba4',
  salary: '#008300',
  misc: '#4a3aa7',
}
const INCOME_COLOR = '#2a78d6'
const EXPENSE_COLOR = '#d03b3b'

function categoryLabel(key) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function monthBounds(monthStart) {
  const from = toLocalDateString(monthStart)
  const to = toLocalDateString(new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0))
  return { from, to }
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function CategoryDonut({ title, rows, emptyLabel }) {
  const total = rows.reduce((sum, r) => sum + Number(r.total), 0)
  return (
    <div className="card p-5">
      <h2 className="font-bold text-ink-900 mb-1">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-ink-400 text-sm py-14 text-center">{emptyLabel}</p>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart margin={{ top: 28, right: 8, bottom: 8, left: 8 }}>
            <Pie
              data={rows}
              dataKey="total"
              nameKey="category"
              innerRadius={50}
              outerRadius={75}
              paddingAngle={2}
              label={({ category, total: v }) => `${categoryLabel(category)} ${((v / total) * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {rows.map((r) => (
                <Cell key={r.category} fill={CATEGORY_COLORS[r.category] || '#898781'} stroke="#ffffff" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip formatter={(v, _n, entry) => [`₹${Number(v).toLocaleString('en-IN')}`, categoryLabel(entry.payload.category)]} />
            <Legend formatter={(_value, entry) => categoryLabel(entry.payload.category)} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

export default function FinancePage() {
  const [monthStart, setMonthStart] = useState(() => startOfMonth(new Date()))
  const [summary, setSummary] = useState(null)
  const [trend, setTrend] = useState([])
  const [transactions, setTransactions] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [exporting, setExporting] = useState(false)

  const { from, to } = useMemo(() => monthBounds(monthStart), [monthStart])
  const monthLabel = monthStart.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
  const isCurrentMonth = startOfMonth(new Date()).getTime() === monthStart.getTime()

  function loadTransactions() {
    FinanceAPI.list().then(({ data }) => setTransactions(data.results || data))
  }

  useEffect(() => {
    FinanceAPI.summary({ from, to }).then(({ data }) => setSummary(data))
  }, [from, to])

  useEffect(() => {
    FinanceAPI.trend(6).then(({ data }) => setTrend(data))
    loadTransactions()
  }, [])

  function shiftMonth(delta) {
    setMonthStart((d) => new Date(d.getFullYear(), d.getMonth() + delta, 1))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    await FinanceAPI.create(form)
    setForm(EMPTY_FORM)
    setShowForm(false)
    loadTransactions()
    FinanceAPI.summary({ from, to }).then(({ data }) => setSummary(data))
    FinanceAPI.trend(6).then(({ data }) => setTrend(data))
  }

  async function handleExport() {
    setExporting(true)
    try {
      const { data } = await FinanceAPI.exportExcel({ from, to })
      const url = URL.createObjectURL(new Blob([data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `finance_${from}_to_${to}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  const incomeRows = summary?.by_category.filter((r) => r.transaction_type === 'income') || []
  const expenseRows = summary?.by_category.filter((r) => r.transaction_type === 'expense') || []
  const savingsRate = summary && Number(summary.income) > 0
    ? ((Number(summary.savings) / Number(summary.income)) * 100).toFixed(1)
    : '0.0'

  const trendData = trend.map((t) => ({
    ...t,
    label: new Date(`${t.month}-01`).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
  }))

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-extrabold text-ink-900">Finance</h1>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 card px-2 py-1">
            <button className="w-7 h-7 font-bold text-ink-600 hover:bg-sandal-100 rounded" onClick={() => shiftMonth(-1)}>‹</button>
            <span className="font-semibold text-ink-900 text-sm w-32 text-center">{monthLabel}</span>
            <button className="w-7 h-7 font-bold text-ink-600 hover:bg-sandal-100 rounded" onClick={() => shiftMonth(1)}>›</button>
          </div>
          {!isCurrentMonth && (
            <button className="btn-secondary text-sm" onClick={() => setMonthStart(startOfMonth(new Date()))}>This Month</button>
          )}
          <button className="btn-primary text-sm" onClick={handleExport} disabled={exporting}>
            {exporting ? 'Preparing…' : '⬇ Download Excel'}
          </button>
          <button className="btn-secondary text-sm" onClick={() => setShowForm(true)}>+ Record Transaction</button>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Income" value={`₹${Number(summary.income).toLocaleString('en-IN')}`} icon="⬆️" accent="green" />
          <StatCard label="Expense" value={`₹${Number(summary.expense).toLocaleString('en-IN')}`} icon="⬇️" accent="brand" />
          <StatCard label="Savings" value={`₹${Number(summary.savings).toLocaleString('en-IN')}`} icon="🏦" accent="ink" />
          <StatCard label="Savings Rate" value={`${savingsRate}%`} icon="📈" accent="gold" />
        </div>
      )}

      <div className="card p-5 mb-6">
        <h2 className="font-bold text-ink-900 mb-4">Income vs Expense — last 6 months</h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={trendData} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e6e6e6" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v, n) => [`₹${Number(v).toLocaleString('en-IN')}`, n]} />
            <Legend />
            <Bar dataKey="income" name="Income" fill={INCOME_COLOR} radius={[4, 4, 0, 0]} maxBarSize={24} />
            <Bar dataKey="expense" name="Expense" fill={EXPENSE_COLOR} radius={[4, 4, 0, 0]} maxBarSize={24} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <CategoryDonut title="Income Breakdown" rows={incomeRows} emptyLabel="No income recorded this month." />
        <CategoryDonut title="Expense Breakdown" rows={expenseRows} emptyLabel="No expense recorded this month." />
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-sandal-100 text-ink-600 text-left">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sandal-100">
            {transactions.map((t) => (
              <tr key={t.id}>
                <td className="px-4 py-3 text-ink-700">{t.date}</td>
                <td className="px-4 py-3">
                  <span className={`badge capitalize ${t.transaction_type === 'income' ? 'bg-green-100 text-green-700' : 'bg-brand-50 text-brand-700'}`}>
                    {t.transaction_type}
                  </span>
                </td>
                <td className="px-4 py-3 capitalize text-ink-700">{t.category.replace(/_/g, ' ')}</td>
                <td className="px-4 py-3 text-ink-500">{t.description || '—'}</td>
                <td className="px-4 py-3 text-right font-semibold text-ink-900">₹{t.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-30 px-4">
          <form onSubmit={handleSubmit} className="card p-6 w-full max-w-md space-y-3">
            <h2 className="font-bold text-lg text-ink-900">Record Transaction</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-semibold text-ink-700">Type</label>
                <select className="input mt-1" value={form.transaction_type} onChange={(e) => setForm({ ...form, transaction_type: e.target.value })}>
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-ink-700">Category</label>
                <select className="input mt-1" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  <option value="sales">Sales</option>
                  <option value="manual_payment">Manual Order Payment</option>
                  <option value="inventory_purchase">Inventory Purchase</option>
                  <option value="delivery">Delivery / Logistics</option>
                  <option value="marketing">Marketing</option>
                  <option value="salary">Salary / Staff</option>
                  <option value="misc">Miscellaneous</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-ink-700">Amount (₹)</label>
              <input type="number" step="0.01" className="input mt-1" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
            </div>
            <div>
              <label className="text-sm font-semibold text-ink-700">Date</label>
              <input type="date" className="input mt-1" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
            </div>
            <div>
              <label className="text-sm font-semibold text-ink-700">Description</label>
              <input className="input mt-1" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
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
