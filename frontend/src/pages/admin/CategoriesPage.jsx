import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { CategoriesAdminAPI } from '../../api/endpoints'
import { Modal, ConfirmDialog, PageLoader } from '../../components/admin/ui.jsx'

const EMPTY_FORM = { name: '', description: '', is_active: true, display_order: 0 }

export default function CategoriesPage() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [imageFile, setImageFile] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

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
    await CategoriesAdminAPI.remove(id)
    load()
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Categories</h1>
        <button className="btn-primary" onClick={openCreate}>
          <Plus size={16} />
          New Category
        </button>
      </div>

      {loading ? (
        <PageLoader />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Products</th>
                <th>Order</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat.id}>
                  <td className="font-semibold text-ink-900">{cat.name}</td>
                  <td>{cat.product_count}</td>
                  <td>{cat.display_order}</td>
                  <td>
                    <span className={`badge ${cat.is_active ? 'badge-green' : 'badge-ink'}`}>
                      {cat.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="text-right space-x-3">
                    <button className="text-brand-600 font-semibold hover:text-brand-700" onClick={() => openEdit(cat)}>Edit</button>
                    <button className="text-brand-600 font-semibold hover:text-brand-700" onClick={() => setDeleteTarget(cat)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? 'Edit Category' : 'New Category'}
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            <button type="submit" form="category-form" className="btn-primary">Save</button>
          </>
        }
      >
        <form id="category-form" onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="label">Name</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label className="label">Image</label>
            <input type="file" accept="image/*" className="input" onChange={(e) => setImageFile(e.target.files[0])} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Display Order</label>
              <input type="number" className="input" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: e.target.value })} />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
              <label className="text-sm font-semibold text-ink-700">Active</label>
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => handleDelete(deleteTarget.id)}
        title="Delete category"
        message={deleteTarget ? `Delete "${deleteTarget.name}"? Products under it will need reassigning.` : ''}
      />
    </div>
  )
}
