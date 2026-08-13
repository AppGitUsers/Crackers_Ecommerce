import { useEffect, useState } from 'react'
import { CalendarCheck, CheckCheck } from 'lucide-react'
import { StaffAPI } from '../../../api/endpoints'
import { Modal, ConfirmDialog, PageLoader, Empty } from '../../../components/admin/ui.jsx'

const STATUS_META = {
  present: { label: 'Present', badge: 'badge-green' },
  absent: { label: 'Absent', badge: 'badge bg-red-100 text-red-700' },
  half: { label: 'Half Day', badge: 'badge-gold' },
  leave: { label: 'On Leave', badge: 'badge-ink' },
}
const NOT_MARKED = { label: 'Not Marked', badge: 'badge bg-sandal-100 text-ink-400' }

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function AttendanceTab() {
  const [date, setDate] = useState(todayISO())
  const [records, setRecords] = useState([])
  const [employees, setEmployees] = useState([])
  const [shifts, setShifts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState(new Set())
  const [confirmBulk, setConfirmBulk] = useState(false)
  const [bulkSaving, setBulkSaving] = useState(false)

  function load() {
    setLoading(true)
    StaffAPI.attendance.byDate(date).then(({ data }) => setRecords(data)).finally(() => setLoading(false))
  }

  useEffect(() => {
    StaffAPI.employees.list({ is_active: true }).then(({ data }) => setEmployees(data.results || data))
    StaffAPI.shifts.list().then(({ data }) => setShifts(data.results || data))
  }, [])
  useEffect(() => { load(); setSelected(new Set()) }, [date])

  const shiftsById = new Map(shifts.map((s) => [s.id, s]))

  // Full roster for the date: every active employee, plus anyone (even
  // inactive) who already has a record for this date so nothing existing
  // disappears from view. Employees without a record yet get a blank row —
  // clicking it creates their first entry instead of editing one.
  const employeesById = new Map(employees.map((e) => [e.id, e]))
  records.forEach((r) => { if (!employeesById.has(r.employee)) employeesById.set(r.employee, { id: r.employee, name: r.employee_name, shift: null }) })
  const rows = Array.from(employeesById.values())
    .map((emp) => {
      const rec = records.find((r) => r.employee === emp.id)
      const base = rec || {
        id: null, employee: emp.id, employee_name: emp.name, status: null,
        check_in: null, check_out: null, hours_worked: 0, is_late: false, ot_minutes: 0, notes: '',
      }
      return { ...base, shift: emp.shift }
    })
    .sort((a, b) => a.employee_name.localeCompare(b.employee_name))

  // Bulk "mark from shift" needs a shift to know what times to fill in —
  // employees with none assigned can't be included in that action.
  const selectableRows = rows.filter((r) => r.shift && shiftsById.has(r.shift))
  const allSelected = selectableRows.length > 0 && selectableRows.every((r) => selected.has(r.employee))

  function toggleOne(employeeId, checked) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(employeeId)
      else next.delete(employeeId)
      return next
    })
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(selectableRows.map((r) => r.employee)))
  }

  function openRow(row) {
    setForm({
      id: row.id, employee: row.employee, status: row.status || 'present',
      check_in: row.check_in ? row.check_in.slice(0, 5) : '',
      check_out: row.check_out ? row.check_out.slice(0, 5) : '',
      notes: row.notes || '',
    })
    setShowForm(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        employee: form.employee,
        date,
        status: form.status,
        check_in: ['present', 'half'].includes(form.status) && form.check_in ? form.check_in : null,
        check_out: ['present', 'half'].includes(form.status) && form.check_out ? form.check_out : null,
        notes: form.notes,
      }
      if (form.id) {
        await StaffAPI.attendance.update(form.id, payload)
      } else {
        await StaffAPI.attendance.create(payload)
      }
      setShowForm(false)
      load()
    } finally {
      setSaving(false)
    }
  }

  async function markSelected() {
    setBulkSaving(true)
    try {
      const targets = rows.filter((r) => selected.has(r.employee) && r.shift && shiftsById.has(r.shift))
      await Promise.all(targets.map((r) => {
        const shift = shiftsById.get(r.shift)
        const payload = {
          employee: r.employee, date, status: 'present',
          check_in: shift.start_time.slice(0, 5), check_out: shift.end_time.slice(0, 5),
          notes: r.notes || '',
        }
        return r.id ? StaffAPI.attendance.update(r.id, payload) : StaffAPI.attendance.create(payload)
      }))
      setSelected(new Set())
      load()
    } finally {
      setBulkSaving(false)
    }
  }

  const presentCount = records.filter((r) => r.status === 'present').length
  const absentCount = records.filter((r) => r.status === 'absent').length
  const otherCount = records.length - presentCount - absentCount
  const notMarkedCount = rows.length - records.length

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input type="date" className="input w-auto" value={date} onChange={(e) => setDate(e.target.value)} />
        <span className="badge badge-green">Present: {presentCount}</span>
        <span className="badge bg-red-100 text-red-700">Absent: {absentCount}</span>
        <span className="badge badge-ink">Other: {otherCount}</span>
        <span className="badge bg-sandal-100 text-ink-400">Not Marked: {notMarkedCount}</span>
      </div>

      {selectableRows.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 mb-4 p-3 rounded-lg bg-sandal-50 border border-sandal-200">
          <label className="flex items-center gap-2 text-sm font-semibold text-ink-700 cursor-pointer">
            <input type="checkbox" checked={allSelected} onChange={toggleAll} />
            Select All
          </label>
          <span className="text-xs text-ink-500">{selected.size} selected</span>
          <button
            className="btn-primary ml-auto"
            disabled={selected.size === 0 || bulkSaving}
            onClick={() => setConfirmBulk(true)}
          >
            <CheckCheck size={16} />
            Mark Attendance
          </button>
        </div>
      )}

      {loading ? (
        <PageLoader />
      ) : rows.length === 0 ? (
        <Empty message="No active employees" icon={<CalendarCheck size={32} />} />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:hidden">
            {rows.map((r) => {
              const meta = r.status ? STATUS_META[r.status] : NOT_MARKED
              const canSelect = r.shift && shiftsById.has(r.shift)
              return (
                <div key={r.employee} className="card p-4 cursor-pointer" onClick={() => openRow(r)}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <input
                        type="checkbox"
                        checked={selected.has(r.employee)}
                        disabled={!canSelect}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => toggleOne(r.employee, e.target.checked)}
                      />
                      <p className="font-semibold text-ink-900 truncate">{r.employee_name}</p>
                    </div>
                    <span className={meta.badge}>{meta.label}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-ink-500">
                    <span>In: {r.check_in ? r.check_in.slice(0, 5) : '—'}</span>
                    <span>Out: {r.check_out ? r.check_out.slice(0, 5) : '—'}</span>
                    {r.hours_worked > 0 && <span>{r.hours_worked}h</span>}
                  </div>
                  <div className="flex gap-1.5 mt-2">
                    {r.is_late && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">LATE</span>}
                    {r.ot_minutes > 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">+{r.ot_minutes}m</span>}
                  </div>
                  {r.notes && <p className="text-xs text-ink-500 mt-2">{r.notes}</p>}
                </div>
              )
            })}
          </div>

          <div className="table-container hidden lg:block">
            <table className="table">
              <thead>
                <tr>
                  <th className="w-10">
                    <input type="checkbox" checked={allSelected} disabled={selectableRows.length === 0} onChange={toggleAll} />
                  </th>
                  <th>Employee</th>
                  <th>Status</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Hours</th>
                  <th>Late</th>
                  <th>OT</th>
                  <th>Notes</th>
                  <th className="text-right">Edit</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const meta = r.status ? STATUS_META[r.status] : NOT_MARKED
                  const canSelect = r.shift && shiftsById.has(r.shift)
                  return (
                    <tr key={r.employee} className="cursor-pointer" onClick={() => openRow(r)}>
                      <td onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selected.has(r.employee)}
                          disabled={!canSelect}
                          title={!canSelect ? 'No shift assigned' : undefined}
                          onChange={(e) => toggleOne(r.employee, e.target.checked)}
                        />
                      </td>
                      <td className="font-semibold text-ink-900">{r.employee_name}</td>
                      <td><span className={meta.badge}>{meta.label}</span></td>
                      <td>{r.check_in ? r.check_in.slice(0, 5) : '—'}</td>
                      <td>{r.check_out ? r.check_out.slice(0, 5) : '—'}</td>
                      <td>{r.hours_worked > 0 ? `${r.hours_worked}h` : '—'}</td>
                      <td>{r.is_late && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">LATE</span>}</td>
                      <td>{r.ot_minutes > 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">+{r.ot_minutes}m</span>}</td>
                      <td className="text-ink-500 max-w-xs truncate">{r.notes || '—'}</td>
                      <td className="text-right">
                        <button className="text-brand-600 font-semibold hover:text-brand-700" onClick={() => openRow(r)}>Edit</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={form?.id ? 'Edit Attendance' : 'Mark Attendance'}
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            <button type="submit" form="attendance-form" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </>
        }
      >
        {form && (
          <form id="attendance-form" onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="label">Status</label>
              <select className="select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            {['present', 'half'].includes(form.status) && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Check In</label>
                  <input type="time" className="input" value={form.check_in} onChange={(e) => setForm({ ...form, check_in: e.target.value })} />
                </div>
                <div>
                  <label className="label">Check Out</label>
                  <input type="time" className="input" value={form.check_out} onChange={(e) => setForm({ ...form, check_out: e.target.value })} />
                </div>
              </div>
            )}
            <div>
              <label className="label">Notes</label>
              <input className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={confirmBulk}
        onClose={() => setConfirmBulk(false)}
        onConfirm={markSelected}
        danger={false}
        title="Mark attendance"
        message={`Mark ${selected.size} employee${selected.size === 1 ? '' : 's'} Present, using each one's own shift start/end time as check-in/check-out? This overwrites any existing record for them today.`}
      />
    </div>
  )
}
