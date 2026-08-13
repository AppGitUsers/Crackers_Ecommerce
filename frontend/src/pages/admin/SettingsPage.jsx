import { useEffect, useState } from 'react'
import { Plus, Trash2, Save, CheckCircle2 } from 'lucide-react'
import { SettingsAPI } from '../../api/endpoints'
import { ConfirmDialog, PageLoader, Empty } from '../../components/admin/ui.jsx'
import { useToast } from '../../context/ToastContext.jsx'

function humanizeKey(key) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export default function SettingsPage() {
  const toast = useToast()
  const [settings, setSettings] = useState([])
  const [values, setValues] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [addingNew, setAddingNew] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')

  function load() {
    setLoading(true)
    SettingsAPI.list()
      .then(({ data }) => {
        const list = data.results || data
        setSettings(list)
        setValues(Object.fromEntries(list.map((s) => [s.id, s.value])))
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function handleSaveAll(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const changed = settings.filter((s) => (values[s.id] ?? '') !== s.value)
      await Promise.all(changed.map((s) => SettingsAPI.update(s.id, { value: values[s.id] })))
      setJustSaved(true)
      setTimeout(() => setJustSaved(false), 2500)
      load()
    } finally {
      setSaving(false)
    }
  }

  async function handleAddNew(e) {
    e.preventDefault()
    await SettingsAPI.create({ key: newKey.trim(), value: newValue })
    toast.success('Setting added.')
    setNewKey('')
    setNewValue('')
    setAddingNew(false)
    load()
  }

  async function handleDelete(id) {
    await SettingsAPI.remove(id)
    toast.success('Setting deleted.')
    load()
  }

  if (loading) return <PageLoader />

  return (
    <div className="max-w-2xl">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Company details shown on invoices.</p>
        </div>
      </div>

      {settings.length === 0 ? (
        <Empty message="No settings yet — add your first one below." />
      ) : (
        <form onSubmit={handleSaveAll} className="card p-5 space-y-4">
          {settings.map((s) => (
            <div key={s.id} className="flex items-end gap-2">
              <div className="flex-1 min-w-0">
                <label className="label">{humanizeKey(s.key)}</label>
                <input
                  className="input"
                  value={values[s.id] ?? ''}
                  onChange={(e) => setValues((v) => ({ ...v, [s.id]: e.target.value }))}
                  placeholder={`Enter ${humanizeKey(s.key).toLowerCase()}`}
                />
              </div>
              <button
                type="button"
                className="btn-ghost text-brand-600 hover:bg-brand-50 shrink-0"
                onClick={() => setDeleteTarget(s)}
                title={`Remove "${s.key}"`}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}

          <div className="flex items-center gap-3 pt-3 border-t border-sandal-200">
            <button type="submit" className="btn-primary" disabled={saving}>
              <Save size={16} />
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
            {justSaved && (
              <span className="inline-flex items-center gap-1.5 text-sm text-green-600 font-semibold">
                <CheckCircle2 size={16} />
                Saved
              </span>
            )}
          </div>
        </form>
      )}

      <div className="card p-5 mt-4">
        {addingNew ? (
          <form onSubmit={handleAddNew} className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[180px]">
              <label className="label">Key</label>
              <input
                className="input"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="e.g. bank_account_number"
                required
              />
            </div>
            <div className="flex-1 min-w-[180px]">
              <label className="label">Value</label>
              <input className="input" value={newValue} onChange={(e) => setNewValue(e.target.value)} />
            </div>
            <button type="submit" className="btn-primary">Add</button>
            <button type="button" className="btn-secondary" onClick={() => setAddingNew(false)}>Cancel</button>
          </form>
        ) : (
          <button className="btn-outline" onClick={() => setAddingNew(true)}>
            <Plus size={16} />
            Add New Setting
          </button>
        )}
      </div>

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
