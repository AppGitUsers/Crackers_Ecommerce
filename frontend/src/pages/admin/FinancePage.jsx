import { useEffect, useState } from 'react'
import { FinanceAPI } from '../../api/endpoints'
import StatCard from '../../components/admin/StatCard.jsx'

const EMPTY_FORM = { transaction_type: 'income', category: 'sales', amount: '', description: '', date: new Date().toISOString().slice(0, 10) }

export default function FinancePage() {
  const [summary, setSummary] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  function load() {
    FinanceAPI.summary().then(({ data }) => setSummary(data))
    FinanceAPI.list().then(({ data }) => setTransactions(data.results || data))
  }

  useEffect(() => { load() }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    await FinanceAPI.create(form)
    setForm(EMPTY_FORM)
    setShowForm(false)
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold text-brand-800">Finance</h1>
        <button className="btn-primary" onClick={() => setShowForm(true)}>+ Record Transaction</button>
      </div>

      {summary && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <StatCard label="Income" value={`₹${Number(summary.income).toLocaleString('en-IN')}`} icon="⬆️" accent="green" />
          <StatCard label="Expense" value={`₹${Number(summary.expense).toLocaleString('en-IN')}`} icon="⬇️" accent="red" />
          <StatCard label="Savings" value={`₹${Number(summary.savings).toLocaleString('en-IN')}`} icon="🏦" accent="sandal" />
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-sandal-100 text-brand-600 text-left">
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
                <td className="px-4 py-3">{t.date}</td>
                <td className="px-4 py-3">
                  <span className={`badge capitalize ${t.transaction_type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {t.transaction_type}
                  </span>
                </td>
                <td className="px-4 py-3 capitalize">{t.category.replace(/_/g, ' ')}</td>
                <td className="px-4 py-3 text-brand-500">{t.description || '—'}</td>
                <td className="px-4 py-3 text-right font-semibold">₹{t.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-30 px-4">
          <form onSubmit={handleSubmit} className="card p-6 w-full max-w-md space-y-3">
            <h2 className="font-bold text-lg text-brand-800">Record Transaction</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-semibold text-brand-700">Type</label>
                <select className="input mt-1" value={form.transaction_type} onChange={(e) => setForm({ ...form, transaction_type: e.target.value })}>
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-brand-700">Category</label>
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
              <label className="text-sm font-semibold text-brand-700">Amount (₹)</label>
              <input type="number" step="0.01" className="input mt-1" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
            </div>
            <div>
              <label className="text-sm font-semibold text-brand-700">Date</label>
              <input type="date" className="input mt-1" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
            </div>
            <div>
              <label className="text-sm font-semibold text-brand-700">Description</label>
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
