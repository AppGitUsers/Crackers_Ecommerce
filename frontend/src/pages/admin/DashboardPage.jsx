import { useEffect, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { DashboardAPI } from '../../api/endpoints'
import StatCard from '../../components/admin/StatCard.jsx'

export default function DashboardPage() {
  const [data, setData] = useState(null)
  const [days, setDays] = useState(30)

  useEffect(() => {
    DashboardAPI.overview(days).then(({ data }) => setData(data))
  }, [days])

  if (!data) return <div className="text-ink-500">Loading dashboard…</div>

  const chartData = data.sales_graph.map((d) => ({
    day: new Date(d.day).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
    total: Number(d.total),
  }))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold text-ink-900">Dashboard</h1>
        <select className="input w-40" value={days} onChange={(e) => setDays(Number(e.target.value))}>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Sales" value={`₹${Number(data.total_sales).toLocaleString('en-IN')}`} icon="💰" accent="green" />
        <StatCard label="Total Orders" value={data.total_orders} icon="📦" accent="ink" />
        <StatCard label="Pending Orders" value={data.pending_orders} icon="⏳" accent="brand" />
        <StatCard label="Products Available" value={data.products_available} icon="🎇" accent="sandal" />
        <StatCard label="Out of Stock" value={data.products_out_of_stock} icon="🚫" accent="brand" />
        <StatCard label="Active Categories" value={data.total_categories} icon="🗂️" accent="sandal" />
        <StatCard label="Calls Needing Follow-up" value={data.calls_pending_followup} icon="📞" accent="brand" />
      </div>

      <div className="card p-5">
        <h2 className="font-bold text-ink-900 mb-4">Sales Trend</h2>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#e01e26" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#e01e26" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e6e6e6" />
            <XAxis dataKey="day" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v) => [`₹${v}`, 'Sales']} />
            <Area type="monotone" dataKey="total" stroke="#e01e26" fill="url(#salesGradient)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
