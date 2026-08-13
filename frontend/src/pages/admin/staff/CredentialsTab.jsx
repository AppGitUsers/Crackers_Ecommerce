import { useEffect, useState } from 'react'
import { Plus, Eye, EyeOff, KeyRound, ShieldAlert } from 'lucide-react'
import { AuthAPI, StaffAPI } from '../../../api/endpoints'
import { useAuth } from '../../../context/AuthContext'
import { Modal, ConfirmDialog, PageLoader, Empty } from '../../../components/admin/ui.jsx'

const ROLE_BADGE = { superadmin: 'badge-brand', admin: 'badge-blue', staff: 'badge-gold' }
const ROLE_LABEL = { superadmin: 'Super Admin', admin: 'Admin', staff: 'Staff' }

function emptyForm() {
  return {
    username: '', password: '', confirm_password: '', first_name: '', last_name: '',
    role: 'staff', linked_employee: '', is_active_staff: true,
  }
}

export default function CredentialsTab() {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm())
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)

  function load() {
    setLoading(true)
    AuthAPI.users.list()
      .then(({ data }) => setUsers(data.results || data))
      .catch((err) => { if (err.response?.status === 403) setForbidden(true) })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    StaffAPI.employees.list({ is_active: true }).then(({ data }) => setEmployees(data.results || data))
  }, [])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm())
    setError('')
    setShowForm(true)
  }

  function openEdit(u) {
    setEditing(u)
    setForm({
      username: u.username, password: '', confirm_password: '', first_name: u.first_name, last_name: u.last_name,
      role: u.role, linked_employee: u.linked_employee || '', is_active_staff: u.is_active_staff,
    })
    setError('')
    setShowForm(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!editing || form.password) {
      if (form.password.length < 6) {
        setError('Password must be at least 6 characters.')
        return
      }
      if (form.password !== form.confirm_password) {
        setError('Passwords do not match.')
        return
      }
    }

    const payload = {
      username: form.username, first_name: form.first_name, last_name: form.last_name,
      role: form.role, linked_employee: form.linked_employee || null, is_active_staff: form.is_active_staff,
    }
    if (form.password) payload.password = form.password

    try {
      if (editing) {
        await AuthAPI.users.update(editing.id, payload)
      } else {
        await AuthAPI.users.create(payload)
      }
      setShowForm(false)
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not save this login. Check the fields and try again.')
    }
  }

  async function handleDelete(id) {
    await AuthAPI.users.remove(id)
    load()
  }

  if (forbidden) {
    return <Empty message="Only super admins can manage staff logins." icon={<ShieldAlert size={32} />} />
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button className="btn-primary" onClick={openCreate}>
          <Plus size={16} />
          New Login
        </button>
      </div>

      {loading ? (
        <PageLoader />
      ) : users.length === 0 ? (
        <Empty message="No staff logins yet" icon={<KeyRound size={32} />} />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:hidden">
            {users.map((u) => (
              <div key={u.id} className="card p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold text-ink-900">{u.username}</p>
                  <span className={`badge ${ROLE_BADGE[u.role]}`}>{ROLE_LABEL[u.role]}</span>
                </div>
                <p className="text-xs text-ink-500 mt-1">{u.linked_employee_name || 'Not linked to an employee'}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className={`badge ${u.is_active_staff ? 'badge-green' : 'badge-ink'}`}>
                    {u.is_active_staff ? 'Active' : 'Disabled'}
                  </span>
                  <div className="space-x-3">
                    <button className="text-brand-600 font-semibold text-sm hover:text-brand-700" onClick={() => openEdit(u)}>Edit</button>
                    {u.id !== user.id && (
                      <button className="text-brand-600 font-semibold text-sm hover:text-brand-700" onClick={() => setDeleteTarget(u)}>Delete</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="table-container hidden lg:block">
            <table className="table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Linked Employee</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="font-semibold text-ink-900">{u.username}</td>
                    <td><span className={`badge ${ROLE_BADGE[u.role]}`}>{ROLE_LABEL[u.role]}</span></td>
                    <td>{u.linked_employee_name || '—'}</td>
                    <td>
                      <span className={`badge ${u.is_active_staff ? 'badge-green' : 'badge-ink'}`}>
                        {u.is_active_staff ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="text-right space-x-3">
                      <button className="text-brand-600 font-semibold hover:text-brand-700" onClick={() => openEdit(u)}>Edit</button>
                      {u.id !== user.id && (
                        <button className="text-brand-600 font-semibold hover:text-brand-700" onClick={() => setDeleteTarget(u)}>Delete</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? 'Edit Login' : 'New Login'}
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            <button type="submit" form="credential-form" className="btn-primary">Save</button>
          </>
        }
      >
        <form id="credential-form" onSubmit={handleSubmit} className="space-y-3">
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <div>
            <label className="label">Username</label>
            <input className="input" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">First Name</label>
              <input className="input" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
            </div>
            <div>
              <label className="label">Last Name</label>
              <input className="input" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Password{editing && ' (leave blank to keep unchanged)'}</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                className="input pr-10"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400" onClick={() => setShowPassword((v) => !v)}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          {(!editing || form.password) && (
            <div>
              <label className="label">Confirm Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                className="input"
                value={form.confirm_password}
                onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
              />
            </div>
          )}
          <div>
            <label className="label">Role</label>
            <select className="select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
              <option value="superadmin">Super Admin</option>
            </select>
          </div>
          <div>
            <label className="label">Link to Employee (optional)</label>
            <select className="select" value={form.linked_employee} onChange={(e) => setForm({ ...form, linked_employee: e.target.value })}>
              <option value="">None</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={form.is_active_staff} onChange={(e) => setForm({ ...form, is_active_staff: e.target.checked })} />
            <label className="text-sm font-semibold text-ink-700">Active</label>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => handleDelete(deleteTarget.id)}
        title="Delete login"
        message={deleteTarget ? `Delete the login "${deleteTarget.username}"? This can't be undone.` : ''}
      />
    </div>
  )
}
