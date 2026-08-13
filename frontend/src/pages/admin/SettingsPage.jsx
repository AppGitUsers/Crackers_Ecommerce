import { useEffect, useState } from 'react'
import { Plus, Settings as SettingsIcon } from 'lucide-react'
import { SettingsAPI } from '../../api/endpoints'
import { Modal, ConfirmDialog, PageLoader, Empty } from '../../components/admin/ui.jsx'

const EMPTY_FORM = { key: '', value: '' }

export default function SettingsPage() {
  const [settings, setSettings] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [deleteTarget, setDeleteTarget] = useState(null)

  function load() {
    setLoading(true)
    SettingsAPI.list().then(({ data }) => setSettings(data.results || data)).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  function openEdit(setting) {
    setEditing(setting)
    setForm({ key: setting.key, value: setting.value })
    setShowForm(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (editing) {
      await SettingsAPI.update(editing.id, { value: form.value })
    } else {
      await SettingsAPI.create(form)
    }
    setShowForm(false)
    load()
  }

  async function handleDelete(id) {
    await SettingsAPI.remove(id)
    load()
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Company details shown on invoices. Add a new row for any new setting you need.</p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          <Plus size={16} />
          New Setting
        </button>
      </div>

      {loading ? (
        <PageLoader />
      ) : settings.length === 0 ? (
        <Empty message="No settings yet" icon={<SettingsIcon size={32} />} />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:hidden">
            {settings.map((s) => (
              <div key={s.id} className="card p-4 cursor-pointer" onClick={() => openEdit(s)}>
                <p className="text-xs font-semibold text-ink-400 uppercase tracking-wide">{s.key}</p>
                <p className="text-sm text-ink-900 mt-1 break-words">{s.value || <span className="text-ink-300">Not set</span>}</p>
              </div>
            ))}
          </div>

          <div className="table-container hidden lg:block">
            <table className="table">
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Value</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {settings.map((s) => (
                  <tr key={s.id}>
                    <td className="font-semibold text-ink-900">{s.key}</td>
                    <td className="text-ink-700">{s.value || <span className="text-ink-300">Not set</span>}</td>
                    <td className="text-right space-x-3">
                      <button className="text-brand-600 font-semibold hover:text-brand-700" onClick={() => openEdit(s)}>Edit</button>
                      <button className="text-brand-600 font-semibold hover:text-brand-700" onClick={() => setDeleteTarget(s)}>Delete</button>
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
        title={editing ? `Edit "${editing.key}"` : 'New Setting'}
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            <button type="submit" form="setting-form" className="btn-primary">Save</button>
          </>
        }
      >
        <form id="setting-form" onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="label">Key</label>
            <input
              className="input"
              value={form.key}
              onChange={(e) => setForm({ ...form, key: e.target.value })}
              disabled={!!editing}
              placeholder="e.g. company_address"
              required
            />
          </div>
          <div>
            <label className="label">Value</label>
            <textarea className="input" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => handleDelete(deleteTarget.id)}
        title="Delete setting"
        message={deleteTarget ? `Delete "${deleteTarget.key}"? Anything that reads this key (e.g. the invoice) will fall back to blank.` : ''}
      />
    </div>
  )
}
