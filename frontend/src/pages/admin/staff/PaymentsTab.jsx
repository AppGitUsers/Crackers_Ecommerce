import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, CheckCircle2, Users } from 'lucide-react'
import { StaffAPI } from '../../../api/endpoints'
import { Modal, PageLoader, Empty } from '../../../components/admin/ui.jsx'

function monthLabel(year, month) {
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function pctColor(pct) {
  if (pct >= 90) return 'text-green-600'
  if (pct >= 70) return 'text-yellow-600'
  if (pct >= 50) return 'text-orange-600'
  return 'text-red-600'
}

function pctBar(pct) {
  if (pct >= 90) return 'bg-green-500'
  if (pct >= 70) return 'bg-yellow-500'
  if (pct >= 50) return 'bg-orange-500'
  return 'bg-red-500'
}

function lastDayOfMonth(year, month) {
  return new Date(year, month, 0).getDate()
}

export default function PaymentsTab() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [payTarget, setPayTarget] = useState(null)
  const [paying, setPaying] = useState(false)

  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth() + 1

  function load() {
    setLoading(true)
    StaffAPI.attendance.monthlySummary({ year, month }).then(({ data }) => setRows(data)).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [year, month])

  function shiftMonth(delta) {
    let m = month + delta
    let y = year
    if (m < 1) { m = 12; y -= 1 }
    if (m > 12) { m = 1; y += 1 }
    setMonth(m)
    setYear(y)
  }

  async function confirmPay() {
    setPaying(true)
    try {
      const lastDay = lastDayOfMonth(year, month)
      await StaffAPI.payments.create({
        employee: payTarget.employee_id,
        payment_type: 'salary',
        amount: payTarget.calculated_salary,
        payment_date: today.toISOString().slice(0, 10),
        period_start: `${year}-${String(month).padStart(2, '0')}-01`,
        period_end: `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
        hours_worked: payTarget.hours_worked,
        notes: `Monthly salary for ${monthLabel(year, month)} — attendance ${payTarget.attendance_pct}%`,
      })
      setPayTarget(null)
      load()
    } finally {
      setPaying(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-center gap-3 mb-4">
        <button className="p-2 rounded-lg border border-sandal-300 hover:bg-sandal-100" onClick={() => shiftMonth(-1)}>
          <ChevronLeft size={16} />
        </button>
        <span className="badge badge-brand text-sm px-4 py-2">{monthLabel(year, month)}</span>
        <button className="p-2 rounded-lg border border-sandal-300 hover:bg-sandal-100" onClick={() => shiftMonth(1)}>
          <ChevronRight size={16} />
        </button>
      </div>

      {loading ? (
        <PageLoader />
      ) : rows.length === 0 ? (
        <Empty message="No active employees" icon={<Users size={32} />} />
      ) : (
        <>
          {/* Mobile cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:hidden">
            {rows.map((r) => (
              <div key={r.employee_id} className="card p-4">
                <p className="font-bold text-ink-900">{r.employee_name}</p>
                <p className="text-xs text-ink-500 mb-2">{r.shift_name || 'No shift'}</p>
                <div className="grid grid-cols-2 gap-2 text-xs text-ink-600">
                  <div>Required: <span className="font-semibold">{r.required_hours}h</span></div>
                  <div>Worked: <span className="font-semibold">{r.hours_worked}h</span></div>
                  <div>P/H/A: <span className="font-semibold">{r.present_days}/{r.half_days}/{r.absent_days}</span></div>
                  <div>Full Salary: <span className="font-semibold">₹{r.full_salary.toLocaleString('en-IN')}</span></div>
                </div>
                <div className="mt-2">
                  <p className={`font-bold text-sm ${pctColor(r.attendance_pct)}`}>{r.attendance_pct}%</p>
                  <div className="h-1.5 bg-sandal-100 rounded-full overflow-hidden mt-1">
                    <div className={`h-full ${pctBar(r.attendance_pct)}`} style={{ width: `${r.attendance_pct}%` }} />
                  </div>
                </div>
                <div className="mt-3">
                  <PayAction row={r} isCurrentMonth={isCurrentMonth} onPay={() => setPayTarget(r)} />
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="table-container hidden lg:block">
            <table className="table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Shift</th>
                  <th>Working Days</th>
                  <th>Required Hrs</th>
                  <th>Hrs Worked</th>
                  <th>Attendance %</th>
                  <th>Full Salary</th>
                  <th>Due Salary</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.employee_id}>
                    <td className="font-semibold text-ink-900">{r.employee_name}<div className="text-xs text-ink-400 font-normal">{r.department || '—'}</div></td>
                    <td>{r.shift_name || '—'}</td>
                    <td className="text-xs">{r.present_days}P / {r.half_days}H / {r.absent_days}A</td>
                    <td>{r.required_hours}h</td>
                    <td>{r.hours_worked}h</td>
                    <td className="w-32">
                      <p className={`font-bold ${pctColor(r.attendance_pct)}`}>{r.attendance_pct}%</p>
                      <div className="h-1.5 bg-sandal-100 rounded-full overflow-hidden mt-1">
                        <div className={`h-full ${pctBar(r.attendance_pct)}`} style={{ width: `${r.attendance_pct}%` }} />
                      </div>
                    </td>
                    <td>₹{r.full_salary.toLocaleString('en-IN')}</td>
                    <td className="font-semibold text-ink-900">₹{r.calculated_salary.toLocaleString('en-IN')}</td>
                    <td><PayAction row={r} isCurrentMonth={isCurrentMonth} onPay={() => setPayTarget(r)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Modal
        open={!!payTarget}
        onClose={() => setPayTarget(null)}
        title="Confirm Salary Payment"
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setPayTarget(null)}>Cancel</button>
            <button type="button" className="btn-primary" onClick={confirmPay} disabled={paying}>
              {paying ? 'Processing…' : 'Confirm & Pay'}
            </button>
          </>
        }
      >
        {payTarget && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-brand-100 text-brand-700 font-bold flex items-center justify-center text-lg shrink-0">
                {payTarget.employee_name[0]}
              </div>
              <div>
                <p className="font-bold text-ink-900">{payTarget.employee_name}</p>
                <p className="text-xs text-ink-500">{payTarget.department || '—'} · {payTarget.shift_name || 'No shift'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="bg-sandal-50 rounded-lg p-3 text-center">
                <p className="text-xs text-ink-400 font-semibold uppercase">Period</p>
                <p className="font-semibold text-ink-900 text-sm">{monthLabel(year, month)}</p>
              </div>
              <div className="bg-sandal-50 rounded-lg p-3 text-center">
                <p className="text-xs text-ink-400 font-semibold uppercase">Attendance %</p>
                <p className={`font-semibold text-sm ${pctColor(payTarget.attendance_pct)}`}>{payTarget.attendance_pct}%</p>
              </div>
              <div className="bg-sandal-50 rounded-lg p-3 text-center">
                <p className="text-xs text-ink-400 font-semibold uppercase">Hours Worked</p>
                <p className="font-semibold text-ink-900 text-sm">{payTarget.hours_worked}h</p>
              </div>
              <div className="bg-sandal-50 rounded-lg p-3 text-center">
                <p className="text-xs text-ink-400 font-semibold uppercase">P / H / A</p>
                <p className="font-semibold text-ink-900 text-sm">{payTarget.present_days}/{payTarget.half_days}/{payTarget.absent_days}</p>
              </div>
            </div>

            <div className="relative bg-brand-500 rounded-xl p-5 text-center mb-3">
              <span className="absolute top-3 right-4 text-xs text-white/80 font-semibold">
                {payTarget.attendance_pct}% of ₹{payTarget.full_salary.toLocaleString('en-IN')}
              </span>
              <p className="text-3xl font-extrabold text-white">₹{payTarget.calculated_salary.toLocaleString('en-IN')}</p>
            </div>

            <p className="text-xs text-ink-400">This payment will automatically appear as an expense in Finance.</p>
          </div>
        )}
      </Modal>
    </div>
  )
}

function PayAction({ row, isCurrentMonth, onPay }) {
  if (row.paid_this_month) {
    return (
      <span className="badge badge-green inline-flex items-center gap-1">
        <CheckCircle2 size={12} />
        Paid
      </span>
    )
  }
  if (isCurrentMonth) {
    return <span className="text-xs italic text-ink-400">Month in progress</span>
  }
  return (
    <button className="btn-primary px-3 py-1.5 text-xs" disabled={row.calculated_salary <= 0} onClick={onPay}>
      Pay ₹{row.calculated_salary.toLocaleString('en-IN')}
    </button>
  )
}
