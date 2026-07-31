import { useEffect, useState } from 'react'
import { CategoriesAdminAPI } from '../../api/endpoints'

const EMPTY_FORM = { name: '', description: '', is_active: true, display_order: 0 }

export default function CategoriesPage() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [imageFile, setImageFile] = useState(null)

  function load() {
    setLoading(true)
    CategoriesAdminAPI.list()
      .then(({ data }) => setCategories(data.results || data))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setImageFile(null)
    setShowForm(true)
  }

  function openEdit(cat) {
    setEditing(cat)
    setForm({ name: cat.name, description: cat.description, is_active: cat.is_active, display_order: cat.display_order })
    setImageFile(null)
    setShowForm(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => fd.append(k, v))
    if (imageFile) fd.append('image', imageFile)

    if (editing) {
      await CategoriesAdminAPI.update(editing.id, fd)
    } else {
      await CategoriesAdminAPI.create(fd)
    }
    setShowForm(false)
    load()
  }

  async function handleDelete(id) {
    if (!confirm('Delete this category? Products under it will need reassigning.')) return
    await CategoriesAdminAPI.remove(id)
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold text-ink-900">Categories</h1>
        <button className="btn-primary" onClick={openCreate}>+ New Category</button>
      </div>

      {loading ? (
        <p className="text-ink-500">Loading…</p>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-sandal-100 text-ink-600 text-left">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Products</th>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sandal-100">
              {categories.map((cat) => (
                <tr key={cat.id}>
                  <td className="px-4 py-3 font-semibold text-ink-900">{cat.name}</td>
                  <td className="px-4 py-3">{cat.product_count}</td>
                  <td className="px-4 py-3">{cat.display_order}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${cat.is_active ? 'bg-green-100 text-green-700' : 'bg-ink-100 text-ink-500'}`}>
                      {cat.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-3">
                    <button className="text-brand-600 font-semibold hover:text-brand-700" onClick={() => openEdit(cat)}>Edit</button>
                    <button className="text-brand-600 font-semibold hover:text-brand-700" onClick={() => handleDelete(cat.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-30 px-4">
          <form onSubmit={handleSubmit} className="card p-6 w-full max-w-md space-y-3">
            <h2 className="font-bold text-lg text-ink-900">{editing ? 'Edit Category' : 'New Category'}</h2>
            <div>
              <label className="text-sm font-semibold text-ink-700">Name</label>
              <input className="input mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label className="text-sm font-semibold text-ink-700">Description</label>
              <textarea className="input mt-1" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-semibold text-ink-700">Image</label>
              <input type="file" accept="image/*" className="input mt-1" onChange={(e) => setImageFile(e.target.files[0])} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-semibold text-ink-700">Display Order</label>
                <input type="number" className="input mt-1" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: e.target.value })} />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                <label className="text-sm font-semibold text-ink-700">Active</label>
              </div>
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
