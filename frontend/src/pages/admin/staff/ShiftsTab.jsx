import { useEffect, useState } from 'react'
import { Plus, Clock } from 'lucide-react'
import { StaffAPI } from '../../../api/endpoints'
import { Modal, ConfirmDialog, PageLoader, Empty } from '../../../components/admin/ui.jsx'

const ALL_DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
const WEEKDAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI']

const EMPTY_FORM = {
  name: '', start_time: '09:00', end_time: '17:00',
  late_threshold: 15, ot_threshold: 30, days: WEEKDAYS.join(','), notes: '', is_active: true,
}

export default function ShiftsTab() {
  const [shifts, setShifts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [deleteTarget, setDeleteTarget] = useState(null)

  function load() {
    setLoading(true)
    StaffAPI.shifts.list().then(({ data }) => setShifts(data.results || data)).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  function openEdit(shift) {
    setEditing(shift)
    setForm({
      name: shift.name, start_time: shift.start_time.slice(0, 5), end_time: shift.end_time.slice(0, 5),
      late_threshold: shift.late_threshold, ot_threshold: shift.ot_threshold,
      days: shift.days, notes: shift.notes, is_active: shift.is_active,
    })
    setShowForm(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (editing) {
      await StaffAPI.shifts.update(editing.id, form)
    } else {
      await StaffAPI.shifts.create(form)
    }
    setShowForm(false)
    load()
  }

  async function handleDelete(id) {
    await StaffAPI.shifts.remove(id)
    load()
  }

  function toggleDay(day) {
    const list = form.days.split(',').filter(Boolean)
    const next = list.includes(day) ? list.filter((d) => d !== day) : [...list, day]
    setForm({ ...form, days: ALL_DAYS.filter((d) => next.includes(d)).join(',') })
  }

  const formDays = form.days.split(',').filter(Boolean)

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button className="btn-primary" onClick={openCreate}>
          <Plus size={16} />
          New Shift
        </button>
      </div>

      {loading ? (
        <PageLoader />
      ) : shifts.length === 0 ? (
        <Empty message="No shifts yet" icon={<Clock size={32} />} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {shifts.map((s) => (
            <div key={s.id} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-ink-900">{s.name}</p>
                  <p className="font-mono text-sm text-ink-500">{s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}</p>
                </div>
                <span className={`badge ${s.is_active ? 'badge-green' : 'badge-ink'} shrink-0`}>
                  {s.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                <div className="bg-sandal-50 rounded-lg py-2">
                  <p className="text-sm font-bold text-ink-900">{s.hours}h</p>
                  <p className="text-[10px] text-ink-400 uppercase font-semibold">Hours</p>
                </div>
                <div className="bg-sandal-50 rounded-lg py-2">
                  <p className="text-sm font-bold text-ink-900">{s.late_threshold}m</p>
                  <p className="text-[10px] text-ink-400 uppercase font-semibold">Late After</p>
                </div>
                <div className="bg-sandal-50 rounded-lg py-2">
                  <p className="text-sm font-bold text-ink-900">{s.ot_threshold}m</p>
                  <p className="text-[10px] text-ink-400 uppercase font-semibold">OT After</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-1 mt-3">
                {ALL_DAYS.map((d) => (
                  <span
                    key={d}
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      s.days_list.includes(d) ? 'bg-brand-100 text-brand-700' : 'bg-sandal-100 text-ink-300'
                    }`}
                  >
                    {d}
                  </span>
                ))}
              </div>

              <div className="flex justify-end gap-3 mt-3 pt-3 border-t border-sandal-200">
                <button className="text-brand-600 font-semibold text-sm hover:text-brand-700" onClick={() => openEdit(s)}>Edit</button>
                <button className="text-brand-600 font-semibold text-sm hover:text-brand-700" onClick={() => setDeleteTarget(s)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        size="lg"
        title={editing ? 'Edit Shift' : 'New Shift'}
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            <button type="submit" form="shift-form" className="btn-primary">Save</button>
          </>
        }
      >
        <form id="shift-form" onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="label">Shift Name</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Start Time</label>
              <input type="time" className="input" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} required />
            </div>
            <div>
              <label className="label">End Time</label>
              <input type="time" className="input" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Late Threshold (min)</label>
              <input type="number" min="0" className="input" value={form.late_threshold} onChange={(e) => setForm({ ...form, late_threshold: e.target.value })} />
            </div>
            <div>
              <label className="label">OT Threshold (min)</label>
              <input type="number" min="0" className="input" value={form.ot_threshold} onChange={(e) => setForm({ ...form, ot_threshold: e.target.value })} />
            </div>
          </div>

          <div>
            <label className="label">Working Days</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {ALL_DAYS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDay(d)}
                  className={`text-xs font-bold px-2.5 py-1.5 rounded-lg border transition-colors ${
                    formDays.includes(d)
                      ? 'bg-brand-500 border-brand-500 text-white'
                      : 'bg-white border-sandal-300 text-ink-600'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
            <div className="flex gap-2 text-xs">
              <button type="button" className="text-brand-600 font-semibold" onClick={() => setForm({ ...form, days: ALL_DAYS.join(',') })}>All Days</button>
              <button type="button" className="text-brand-600 font-semibold" onClick={() => setForm({ ...form, days: WEEKDAYS.join(',') })}>Weekdays</button>
              <button type="button" className="text-brand-600 font-semibold" onClick={() => setForm({ ...form, days: '' })}>Clear</button>
            </div>
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
            <label className="text-sm font-semibold text-ink-700">Active</label>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => handleDelete(deleteTarget.id)}
        title="Delete shift"
        message={deleteTarget ? `Delete "${deleteTarget.name}"? Employees assigned to it will lose their shift link.` : ''}
      />
    </div>
  )
}
