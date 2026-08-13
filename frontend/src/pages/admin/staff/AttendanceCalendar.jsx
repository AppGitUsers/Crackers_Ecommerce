import { useEffect, useState } from 'react'
import { ArrowLeft, ChevronLeft, ChevronRight, Users } from 'lucide-react'
import { StaffAPI } from '../../../api/endpoints'
import { Modal, PageLoader } from '../../../components/admin/ui.jsx'

const DAY_HEADERS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

const STATUS_OPTIONS = [
  { value: 'present', label: '✅ Present', cell: 'bg-green-100 border-green-300', letter: 'P', dot: 'bg-green-500' },
  { value: 'absent', label: '❌ Absent', cell: 'bg-red-100 border-red-300', letter: 'A', dot: 'bg-red-500' },
  { value: 'half', label: '🌗 Half Day', cell: 'bg-gold-500/10 border-gold-400', letter: 'H', dot: 'bg-gold-500' },
  { value: 'leave', label: '🏖️ On Leave', cell: 'bg-sandal-200 border-sandal-300', letter: 'L', dot: 'bg-ink-400' },
]

function statusMeta(value) {
  return STATUS_OPTIONS.find((s) => s.value === value)
}

function monthLabel(year, month) {
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function pad(n) { return String(n).padStart(2, '0') }
function dateKey(year, month, day) { return `${year}-${pad(month)}-${pad(day)}` }
function weekdayCode(year, month, day) { return DAY_HEADERS[(new Date(year, month - 1, day).getDay() + 6) % 7] }

function computeHours(checkIn, checkOut) {
  if (!checkIn || !checkOut) return null
  const [ih, im] = checkIn.split(':').map(Number)
  const [oh, om] = checkOut.split(':').map(Number)
  let mins = (oh * 60 + om) - (ih * 60 + im)
  if (mins <= 0) mins += 24 * 60
  return Math.round((mins / 60) * 100) / 100
}

export default function AttendanceCalendar({ employee, onBack }) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [records, setRecords] = useState({})
  const [loading, setLoading] = useState(true)
  const [editingDate, setEditingDate] = useState(null)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)

  function load() {
    setLoading(true)
    StaffAPI.employees.attendanceCalendar(employee.id, { year, month })
      .then(({ data }) => {
        const byDate = {}
        data.forEach((r) => { byDate[r.date] = r })
        setRecords(byDate)
      })
      .finally(() => setLoading(false))
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

  const daysInMonth = new Date(year, month, 0).getDate()
  const firstWeekday = (new Date(year, month - 1, 1).getDay() + 6) % 7 // Monday = 0
  const todayKey = dateKey(today.getFullYear(), today.getMonth() + 1, today.getDate())

  const recordList = Object.values(records)
  const stats = {
    totalHours: recordList.reduce((sum, r) => sum + Number(r.hours_worked || 0), 0).toFixed(2),
    present: recordList.filter((r) => r.status === 'present').length,
    absent: recordList.filter((r) => r.status === 'absent').length,
    half: recordList.filter((r) => r.status === 'half').length,
    late: recordList.filter((r) => r.is_late).length,
    ot: recordList.filter((r) => r.ot_minutes > 0).length,
  }

  function openDay(day) {
    const key = dateKey(year, month, day)
    const existing = records[key]
    setEditingDate(key)
    setForm(existing
      ? { status: existing.status, check_in: existing.check_in ? existing.check_in.slice(0, 5) : '', check_out: existing.check_out ? existing.check_out.slice(0, 5) : '', notes: existing.notes, id: existing.id }
      : { status: 'present', check_in: '', check_out: '', notes: '', id: null })
  }

  async function saveDay() {
    setSaving(true)
    try {
      const payload = {
        employee: employee.id,
        date: editingDate,
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
      setEditingDate(null)
      load()
    } finally {
      setSaving(false)
    }
  }

  const previewHours = form && ['present', 'half'].includes(form.status) ? computeHours(form.check_in, form.check_out) : null

  return (
    <div>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <button className="btn-ghost" onClick={onBack}>
          <ArrowLeft size={16} />
          Back
        </button>
        <div className="w-10 h-10 rounded-full overflow-hidden bg-sandal-100 flex items-center justify-center shrink-0">
          {employee.photo_url ? <img src={employee.photo_url} className="w-full h-full object-cover" /> : <Users size={16} className="text-ink-300" />}
        </div>
        <div>
          <p className="font-bold text-ink-900">{employee.name}</p>
          <p className="text-xs text-ink-500">{employee.shift_name || 'No shift assigned'}</p>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <button className="p-2 rounded-lg border border-sandal-300 hover:bg-sandal-100" onClick={() => shiftMonth(-1)}>
            <ChevronLeft size={16} />
          </button>
          <span className="font-semibold text-ink-900 w-28 text-center">{monthLabel(year, month)}</span>
          <button className="p-2 rounded-lg border border-sandal-300 hover:bg-sandal-100" onClick={() => shiftMonth(1)}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
        <div className="card p-3 text-center bg-brand-50">
          <p className="text-lg font-extrabold text-brand-700">{stats.totalHours}</p>
          <p className="text-[10px] text-ink-500 uppercase font-semibold">Total Hrs</p>
        </div>
        <div className="card p-3 text-center bg-green-50">
          <p className="text-lg font-extrabold text-green-700">{stats.present}</p>
          <p className="text-[10px] text-ink-500 uppercase font-semibold">Present</p>
        </div>
        <div className="card p-3 text-center bg-red-50">
          <p className="text-lg font-extrabold text-red-700">{stats.absent}</p>
          <p className="text-[10px] text-ink-500 uppercase font-semibold">Absent</p>
        </div>
        <div className="card p-3 text-center bg-gold-500/5">
          <p className="text-lg font-extrabold text-gold-600">{stats.half}</p>
          <p className="text-[10px] text-ink-500 uppercase font-semibold">Half Day</p>
        </div>
        <div className="card p-3 text-center bg-orange-50">
          <p className="text-lg font-extrabold text-orange-700">{stats.late}</p>
          <p className="text-[10px] text-ink-500 uppercase font-semibold">Late</p>
        </div>
        <div className="card p-3 text-center bg-purple-50">
          <p className="text-lg font-extrabold text-purple-700">{stats.ot}</p>
          <p className="text-[10px] text-ink-500 uppercase font-semibold">Overtime</p>
        </div>
      </div>

      {loading ? (
        <PageLoader />
      ) : (
        <div className="card p-3">
          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAY_HEADERS.map((d) => (
              <div key={d} className="text-center text-[10px] font-bold text-ink-400 py-1">
                <span className="sm:hidden">{d[0]}</span>
                <span className="hidden sm:inline">{d}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstWeekday }).map((_, i) => <div key={`empty-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const key = dateKey(year, month, day)
              const record = records[key]
              const meta = record ? statusMeta(record.status) : null
              const isToday = key === todayKey
              // No shift assigned -> nothing to restrict against, every day is fair game.
              // A shift assigned -> only its working days are clickable, unless a record
              // already exists for that date (keeps old/edited data reachable either way).
              const isWorkingDay = !employee.shift_days_list || employee.shift_days_list.includes(weekdayCode(year, month, day))
              const clickable = isWorkingDay || !!record
              return (
                <button
                  key={key}
                  onClick={() => clickable && openDay(day)}
                  disabled={!clickable}
                  title={!clickable ? 'Not a working day for this shift' : undefined}
                  className={`min-h-[44px] sm:min-h-[80px] rounded-lg border p-1 sm:p-1.5 text-left transition-colors ${
                    meta
                      ? meta.cell
                      : clickable
                        ? `bg-sandal-50 border-sandal-200 hover:bg-sandal-100 ${isToday ? 'ring-2 ring-brand-400' : ''}`
                        : 'bg-sandal-100 border-sandal-100 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-ink-700">{day}</span>
                    {meta && <span className={`w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center ${meta.dot}`}>{meta.letter}</span>}
                  </div>
                  {record && (
                    <div className="mt-0.5">
                      <div className="hidden sm:block text-[9px] text-ink-500 leading-tight">
                        {record.check_in && <div>In {record.check_in.slice(0, 5)}</div>}
                        {record.check_out && <div>Out {record.check_out.slice(0, 5)}</div>}
                      </div>
                      {Number(record.hours_worked) > 0 && (
                        <div className="text-[9px] sm:text-[10px] font-semibold text-ink-600">{record.hours_worked}h</div>
                      )}
                      <div className="flex gap-0.5 mt-0.5 flex-wrap">
                        {record.is_late && <span className="text-[8px] font-bold px-1 rounded bg-orange-500 text-white">L</span>}
                        {record.ot_minutes > 0 && (
                          <span className="text-[8px] font-bold px-1 rounded bg-purple-500 text-white">
                            <span className="hidden sm:inline">OT+{record.ot_minutes}m</span>
                            <span className="sm:hidden">OT</span>
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3 mt-4 text-xs text-ink-500">
        {STATUS_OPTIONS.map((s) => (
          <span key={s.value} className="flex items-center gap-1.5">
            <span className={`w-3 h-3 rounded ${s.dot}`} />
            {s.label.replace(/^\S+\s/, '')}
          </span>
        ))}
        {employee.shift_days_list && (
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-sandal-100 opacity-50 border border-sandal-300" />
            Not a working day
          </span>
        )}
      </div>

      <Modal
        open={!!editingDate}
        onClose={() => setEditingDate(null)}
        title={editingDate || ''}
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setEditingDate(null)}>Cancel</button>
            <button type="button" className="btn-primary" onClick={saveDay} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </>
        }
      >
        {form && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setForm({ ...form, status: s.value })}
                  className={`px-3 py-2.5 rounded-lg border text-sm font-semibold transition-colors ${
                    form.status === s.value ? `${s.cell} border-2` : 'bg-white border-sandal-300 text-ink-600'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {['present', 'half'].includes(form.status) && (
              <>
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
                {previewHours !== null && (
                  <p className="text-xs text-ink-500">Hours worked: <span className="font-semibold text-ink-800">{previewHours}h</span></p>
                )}
              </>
            )}

            <div>
              <label className="label">Notes</label>
              <input className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
