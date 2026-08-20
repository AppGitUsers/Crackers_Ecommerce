import { useEffect, useState } from 'react'
import { Plus, Users, CalendarDays, Search } from 'lucide-react'
import { StaffAPI } from '../../../api/endpoints'
import { Modal, ConfirmDialog, PageLoader, Empty, Toggle, Select, DatePicker, FileInput, Pagination } from '../../../components/admin/ui.jsx'
import { useToast } from '../../../context/ToastContext.jsx'

const PAGE_SIZE = 20

const EMPLOYMENT_LABELS = { full_time: 'Full Time', part_time: 'Part Time', contract: 'Contract' }
const EMPLOYMENT_OPTIONS = [
  { value: 'full_time', label: 'Full Time' },
  { value: 'part_time', label: 'Part Time' },
  { value: 'contract', label: 'Contract' },
]

const EMPTY_FORM = {
  name: '', phone: '', email: '', joined_date: '', department: '', shift: '',
  employment_type: 'full_time', monthly_salary: '', address: '', is_active: true,
}

export default function EmployeesTab({ onOpenCalendar }) {
  const toast = useToast()
  const [employees, setEmployees] = useState([])
  const [departments, setDepartments] = useState([])
  const [shifts, setShifts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [photoFile, setPhotoFile] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [saving, setSaving] = useState(false)
  const [page, setPage] = useState(1)
  const [count, setCount] = useState(0)

  function load(pageToLoad = page) {
    setLoading(true)
    const params = { page: pageToLoad }
    if (search) params.search = search
    StaffAPI.employees.list(params)
      .then(({ data }) => {
        setEmployees(data.results || data)
        setCount(data.count ?? (data.results || data).length)
      })
      .finally(() => setLoading(false))
  }

  function goToPage(p) {
    setPage(p)
    load(p)
  }

  useEffect(() => {
    StaffAPI.departments.list().then(({ data }) => setDepartments(data.results || data))
    StaffAPI.shifts.list({ is_active: true }).then(({ data }) => setShifts(data.results || data))
  }, [])

  useEffect(() => {
    const t = setTimeout(() => { setPage(1); load(1) }, 300)
    return () => clearTimeout(t)
  }, [search])

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setPhotoFile(null)
    setShowForm(true)
  }

  function openEdit(emp) {
    setEditing(emp)
    setForm({
      name: emp.name, phone: emp.phone, email: emp.email, joined_date: emp.joined_date,
      department: emp.department || '', shift: emp.shift || '', employment_type: emp.employment_type,
      monthly_salary: emp.monthly_salary, address: emp.address, is_active: emp.is_active,
    })
    setPhotoFile(null)
    setShowForm(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => fd.append(k, v))
      if (photoFile) fd.append('photo', photoFile)

      if (editing) {
        await StaffAPI.employees.update(editing.id, fd)
        toast.success('Employee updated.')
      } else {
        await StaffAPI.employees.create(fd)
        toast.success('Employee added.')
      }
      setShowForm(false)
      load()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    await StaffAPI.employees.remove(id)
    toast.success('Employee deleted.')
    load()
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="relative w-full sm:w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            className="input pl-9"
            placeholder="Search name, phone, email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="btn-primary" onClick={openCreate}>
          <Plus size={16} />
          Add Employee
        </button>
      </div>

      {loading ? (
        <PageLoader />
      ) : employees.length === 0 ? (
        <Empty message="No employees yet" icon={<Users size={32} />} />
      ) : (
        <>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {employees.map((emp) => (
            <div key={emp.id} className="card p-4 relative">
              <span className="badge badge-ink absolute top-4 right-4">#{emp.id}</span>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full overflow-hidden bg-sandal-100 flex items-center justify-center shrink-0">
                  {emp.photo_url ? (
                    <img src={emp.photo_url} className="w-full h-full object-cover" />
                  ) : (
                    <Users size={22} className="text-ink-300" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-ink-900 truncate">{emp.name}</p>
                  <p className="text-xs text-ink-500">{emp.phone}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 mt-3">
                {emp.department_name && <span className="badge badge-brand">{emp.department_name}</span>}
                {emp.shift_name && <span className="badge badge-blue">{emp.shift_name}</span>}
                <span className="badge badge-gold">{EMPLOYMENT_LABELS[emp.employment_type]}</span>
                {!emp.is_active && <span className="badge badge-ink">Inactive</span>}
              </div>

              <p className="text-sm font-semibold text-ink-900 mt-3">
                ₹{Number(emp.monthly_salary).toLocaleString('en-IN')} <span className="text-xs font-normal text-ink-400">/ month</span>
              </p>

              <div className="flex justify-end gap-3 mt-3 pt-3 border-t border-sandal-200">
                <button className="text-brand-600 font-semibold text-sm hover:text-brand-700" onClick={() => openEdit(emp)}>Edit</button>
                <button
                  className="flex items-center gap-1 text-brand-600 font-semibold text-sm hover:text-brand-700"
                  onClick={() => onOpenCalendar(emp)}
                >
                  <CalendarDays size={14} />
                  Attendance
                </button>
                <button className="text-brand-600 font-semibold text-sm hover:text-brand-700" onClick={() => setDeleteTarget(emp)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
        <Pagination page={page} count={count} pageSize={PAGE_SIZE} onChange={goToPage} itemLabel="employee" />
        </>
      )}

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        size="lg"
        title={editing ? 'Edit Employee' : 'Add Employee'}
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            <button type="submit" form="employee-form" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </>
        }
      >
        <form id="employee-form" onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Full Name</label>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label className="label">Joined Date</label>
              <DatePicker value={form.joined_date} onChange={(v) => setForm({ ...form, joined_date: v })} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Phone</label>
              <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Department</label>
              <Select
                value={form.department}
                onChange={(v) => setForm({ ...form, department: v })}
                placeholder="None"
                options={[{ value: '', label: 'None' }, ...departments.map((d) => ({ value: d.id, label: d.name }))]}
              />
            </div>
            <div>
              <label className="label">Shift</label>
              <Select
                value={form.shift}
                onChange={(v) => setForm({ ...form, shift: v })}
                placeholder="None"
                options={[
                  { value: '', label: 'None' },
                  ...shifts.map((s) => ({ value: s.id, label: `${s.name} (${s.start_time.slice(0, 5)}–${s.end_time.slice(0, 5)})` })),
                ]}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Employment Type</label>
              <Select value={form.employment_type} onChange={(v) => setForm({ ...form, employment_type: v })} options={EMPLOYMENT_OPTIONS} />
            </div>
            <div>
              <label className="label">Monthly Salary (₹)</label>
              <input type="number" step="0.01" className="input" value={form.monthly_salary} onChange={(e) => setForm({ ...form, monthly_salary: e.target.value })} required />
            </div>
          </div>
          <div>
            <label className="label">Address</label>
            <textarea className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div>
            <label className="label">Photo</label>
            <FileInput accept="image/*" fileName={photoFile?.name} onChange={(e) => setPhotoFile(e.target.files[0])} />
          </div>
          <div className="flex items-center gap-2.5">
            <Toggle checked={form.is_active} onChange={(next) => setForm({ ...form, is_active: next })} label="Active" />
            <label className="text-sm font-semibold text-ink-700">Active</label>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => handleDelete(deleteTarget.id)}
        title="Delete employee"
        message={deleteTarget ? `Delete "${deleteTarget.name}"? Their attendance and payment history will also be removed.` : ''}
      />
    </div>
  )
}
