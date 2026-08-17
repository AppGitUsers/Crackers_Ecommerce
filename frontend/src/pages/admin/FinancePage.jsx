import { useEffect, useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import {
  ChevronLeft, ChevronRight, Download, Plus, TrendingUp, TrendingDown, PiggyBank, Percent,
  ShoppingBag, Clock3,
} from 'lucide-react'
import { FinanceAPI } from '../../api/endpoints'
import StatCard from '../../components/admin/StatCard.jsx'
import { Modal, Pagination, Select, DatePicker } from '../../components/admin/ui.jsx'
import { useToast } from '../../context/ToastContext.jsx'

const TX_TYPE_OPTIONS = [
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expense' },
]
const TX_CATEGORY_OPTIONS = [
  { value: 'sales', label: 'Sales' },
  { value: 'manual_payment', label: 'Manual Order Payment' },
  { value: 'inventory_purchase', label: 'Inventory Purchase' },
  { value: 'delivery', label: 'Delivery / Logistics' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'salary', label: 'Salary / Staff' },
  { value: 'misc', label: 'Miscellaneous' },
]

const TX_PAGE_SIZE = 20

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
      <h2 className="section-title">{title}</h2>
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
  const toast = useToast()
  const [monthStart, setMonthStart] = useState(() => startOfMonth(new Date()))
  const [summary, setSummary] = useState(null)
  const [trend, setTrend] = useState([])
  const [transactions, setTransactions] = useState([])
  const [txCount, setTxCount] = useState(0)
  const [txPage, setTxPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [exporting, setExporting] = useState(false)
  const [saving, setSaving] = useState(false)

  const { from, to } = useMemo(() => monthBounds(monthStart), [monthStart])
  const monthLabel = monthStart.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
  const isCurrentMonth = startOfMonth(new Date()).getTime() === monthStart.getTime()

  function loadTransactions(pageToLoad = txPage) {
    FinanceAPI.list({ page: pageToLoad }).then(({ data }) => {
      setTransactions(data.results || data)
      setTxCount(data.count ?? (data.results || data).length)
    })
  }

  function goToTxPage(p) {
    setTxPage(p)
    loadTransactions(p)
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
    if (saving) return
    setSaving(true)
    try {
      await FinanceAPI.create(form)
      toast.success('Transaction recorded.')
      setForm(EMPTY_FORM)
      setShowForm(false)
      goToTxPage(1)
      FinanceAPI.summary({ from, to }).then(({ data }) => setSummary(data))
      FinanceAPI.trend(6).then(({ data }) => setTrend(data))
    } finally {
      setSaving(false)
    }
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
      <div className="page-header">
        <h1 className="page-title">Finance</h1>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 card px-2 py-1">
            <button className="w-7 h-7 flex items-center justify-center text-ink-600 hover:bg-sandal-100 rounded" onClick={() => shiftMonth(-1)}>
              <ChevronLeft size={16} />
            </button>
            <span className="font-semibold text-ink-900 text-sm w-32 text-center">{monthLabel}</span>
            <button className="w-7 h-7 flex items-center justify-center text-ink-600 hover:bg-sandal-100 rounded" onClick={() => shiftMonth(1)}>
              <ChevronRight size={16} />
            </button>
          </div>
          {!isCurrentMonth && (
            <button className="btn-secondary text-sm" onClick={() => setMonthStart(startOfMonth(new Date()))}>This Month</button>
          )}
          <button className="btn-primary text-sm" onClick={handleExport} disabled={exporting}>
            <Download size={16} />
            {exporting ? 'Preparing…' : 'Download Excel'}
          </button>
          <button className="btn-secondary text-sm" onClick={() => setShowForm(true)}>
            <Plus size={16} />
            Record Transaction
          </button>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <StatCard label="Orders Value" value={`₹${Number(summary.orders_value).toLocaleString('en-IN')}`} icon={ShoppingBag} accent="ink" />
          <StatCard label="Income Collected" value={`₹${Number(summary.income).toLocaleString('en-IN')}`} icon={TrendingUp} accent="green" />
          <StatCard label="Pending Collection" value={`₹${Number(summary.pending_collection).toLocaleString('en-IN')}`} icon={Clock3} accent="gold" />
          <StatCard label="Expense" value={`₹${Number(summary.expense).toLocaleString('en-IN')}`} icon={TrendingDown} accent="brand" />
          <StatCard label="Savings" value={`₹${Number(summary.savings).toLocaleString('en-IN')}`} icon={PiggyBank} accent="ink" />
          <StatCard label="Savings Rate" value={`${savingsRate}%`} icon={Percent} accent="gold" />
        </div>
      )}

      <div className="card p-5 mb-6">
        <h2 className="section-title">Income vs Expense — last 6 months</h2>
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

      <h2 className="section-title">All Transactions</h2>

      {/* Phone/tablet: card grid, no horizontal scrolling */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:hidden">
        {transactions.map((t) => (
          <div key={t.id} className="card p-4">
            <div className="flex items-center justify-between gap-2">
              <span className={`badge capitalize ${t.transaction_type === 'income' ? 'badge-green' : 'badge-brand'}`}>
                {t.transaction_type}
              </span>
              <p className="text-xs text-ink-400">{t.date}</p>
            </div>
            <p className="font-semibold text-ink-900 capitalize mt-2">{t.category.replace(/_/g, ' ')}</p>
            <p className="text-sm text-ink-500">{t.description || '—'}</p>
            <p className="text-right font-bold text-ink-900 mt-2">₹{t.amount}</p>
          </div>
        ))}
      </div>

      {/* Laptop and up: table */}
      <div className="table-container hidden lg:block">
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Category</th>
              <th>Description</th>
              <th className="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.id}>
                <td>{t.date}</td>
                <td>
                  <span className={`badge capitalize ${t.transaction_type === 'income' ? 'badge-green' : 'badge-brand'}`}>
                    {t.transaction_type}
                  </span>
                </td>
                <td className="capitalize">{t.category.replace(/_/g, ' ')}</td>
                <td className="text-ink-500">{t.description || '—'}</td>
                <td className="text-right font-semibold text-ink-900">₹{t.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={txPage} count={txCount} pageSize={TX_PAGE_SIZE} onChange={goToTxPage} itemLabel="transaction" />

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title="Record Transaction"
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            <button type="submit" form="finance-transaction-form" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </>
        }
      >
        <form id="finance-transaction-form" onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Type</label>
              <Select value={form.transaction_type} onChange={(v) => setForm({ ...form, transaction_type: v })} options={TX_TYPE_OPTIONS} />
            </div>
            <div>
              <label className="label">Category</label>
              <Select value={form.category} onChange={(v) => setForm({ ...form, category: v })} options={TX_CATEGORY_OPTIONS} />
            </div>
          </div>
          <div>
            <label className="label">Amount (₹)</label>
            <input type="number" step="0.01" className="input" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
          </div>
          <div>
            <label className="label">Date</label>
            <DatePicker value={form.date} onChange={(v) => setForm({ ...form, date: v })} />
          </div>
          <div>
            <label className="label">Description</label>
            <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
        </form>
      </Modal>
    </div>
  )
}
