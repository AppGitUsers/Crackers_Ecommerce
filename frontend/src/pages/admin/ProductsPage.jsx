import { useEffect, useState } from 'react'
import { Plus, ImageOff } from 'lucide-react'
import { CategoriesAdminAPI, ProductsAPI } from '../../api/endpoints'
import { Modal, ConfirmDialog, PageLoader, Toggle, Select, FileInput } from '../../components/admin/ui.jsx'
import { useToast } from '../../context/ToastContext.jsx'

const EMPTY_FORM = { category: '', name: '', description: '', price: '', stock_quantity: 0, unit_label: 'box', is_available: true }

export default function ProductsPage() {
  const toast = useToast()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [togglingIds, setTogglingIds] = useState(new Set())
  const [confirmRemoveImage, setConfirmRemoveImage] = useState(false)

  function load() {
    setLoading(true)
    const params = categoryFilter ? { category: categoryFilter } : {}
    ProductsAPI.list(params)
      .then(({ data }) => setProducts(data.results || data))
      .finally(() => setLoading(false))
  }

  useEffect(() => { CategoriesAdminAPI.list().then(({ data }) => setCategories(data.results || data)) }, [])
  useEffect(() => { load() }, [categoryFilter])

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  async function openEdit(id) {
    const { data } = await ProductsAPI.detail(id)
    setEditing(data)
    setForm({
      category: data.category, name: data.name, description: data.description,
      price: data.price, stock_quantity: data.stock_quantity, unit_label: data.unit_label,
      is_available: data.is_available,
    })
    setShowForm(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => fd.append(k, v))

      if (editing) {
        await ProductsAPI.update(editing.id, fd)
        toast.success('Product updated.')
      } else {
        await ProductsAPI.create(fd)
        toast.success('Product created.')
      }
      setShowForm(false)
      load()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    await ProductsAPI.remove(id)
    toast.success('Product deleted.')
    load()
  }

  async function handleImageUpload(e) {
    if (!editing || uploadingImage) return
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    setUploadingImage(true)
    try {
      await ProductsAPI.uploadImage(editing.id, file)
      const { data } = await ProductsAPI.detail(editing.id)
      setEditing(data)
    } finally {
      setUploadingImage(false)
    }
    load()
  }

  async function handleRemoveImage() {
    if (!editing || editing.images.length === 0) return
    await ProductsAPI.deleteImage(editing.id, editing.images[0].id)
    setEditing({ ...editing, images: [] })
    toast.success('Photo removed.')
    load()
  }

  async function toggleAvailability(product, nextValue) {
    if (togglingIds.has(product.id)) return
    setTogglingIds((prev) => new Set(prev).add(product.id))
    try {
      const fd = new FormData()
      fd.append('is_available', nextValue)
      await ProductsAPI.update(product.id, fd)
      load()
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev)
        next.delete(product.id)
        return next
      })
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Products</h1>
        <button className="btn-primary" onClick={openCreate}>
          <Plus size={16} />
          New Product
        </button>
      </div>

      <div className="mb-4 w-56">
        <Select
          value={categoryFilter}
          onChange={setCategoryFilter}
          placeholder="All Categories"
          options={[{ value: '', label: 'All Categories' }, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
        />
      </div>

      {loading ? (
        <PageLoader />
      ) : (
        <>
          {/* Phone/tablet: card grid, no horizontal scrolling */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:hidden">
            {products.map((p) => (
              <div key={p.id} className="card p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-sandal-100 rounded-lg overflow-hidden flex items-center justify-center shrink-0">
                    {p.primary_image ? <img src={p.primary_image} className="w-full h-full object-cover" /> : <ImageOff size={18} className="text-ink-300" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink-900 truncate">{p.name}</p>
                    <p className="text-xs text-ink-400">{p.category_name}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3 text-sm">
                  <span className="font-semibold text-ink-900">₹{p.price}</span>
                  <span className="text-ink-500">Stock: {p.stock_quantity}</span>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-2">
                    <Toggle checked={p.is_available} disabled={togglingIds.has(p.id)} onChange={(next) => toggleAvailability(p, next)} label="Available for sale" />
                    <span className="text-xs font-semibold text-ink-500">{p.is_available ? 'Available' : 'Hidden'}</span>
                  </div>
                  <div className="space-x-3">
                    <button className="text-brand-600 font-semibold text-sm hover:text-brand-700" onClick={() => openEdit(p.id)}>Edit</button>
                    <button className="text-brand-600 font-semibold text-sm hover:text-brand-700" onClick={() => setDeleteTarget(p)}>Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Laptop and up: table */}
          <div className="table-container hidden lg:block">
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Available</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td className="font-semibold text-ink-900">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-sandal-100 rounded overflow-hidden flex items-center justify-center shrink-0">
                          {p.primary_image ? <img src={p.primary_image} className="w-full h-full object-cover" /> : <ImageOff size={14} className="text-ink-300" />}
                        </div>
                        {p.name}
                      </div>
                    </td>
                    <td>{p.category_name}</td>
                    <td>₹{p.price}</td>
                    <td>{p.stock_quantity}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Toggle checked={p.is_available} disabled={togglingIds.has(p.id)} onChange={(next) => toggleAvailability(p, next)} label="Available for sale" />
                        <span className="text-xs font-semibold text-ink-500">{p.is_available ? 'Available' : 'Hidden'}</span>
                      </div>
                    </td>
                    <td className="text-right space-x-3">
                      <button className="text-brand-600 font-semibold hover:text-brand-700" onClick={() => openEdit(p.id)}>Edit</button>
                      <button className="text-brand-600 font-semibold hover:text-brand-700" onClick={() => setDeleteTarget(p)}>Delete</button>
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
        title={editing ? 'Edit Product' : 'New Product'}
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Close</button>
            <button type="submit" form="product-form" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </>
        }
      >
        <form id="product-form" onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="label">Category</label>
            <Select
              value={form.category}
              onChange={(v) => setForm({ ...form, category: v })}
              placeholder="Select category…"
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
            />
          </div>
          <div>
            <label className="label">Name</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="label">Price (₹)</label>
              <input type="number" step="0.01" className="input" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
            </div>
            <div>
              <label className="label">Stock Qty</label>
              <input type="number" className="input" value={form.stock_quantity} onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })} required />
            </div>
            <div>
              <label className="label">Unit</label>
              <input className="input" value={form.unit_label} onChange={(e) => setForm({ ...form, unit_label: e.target.value })} />
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Toggle checked={form.is_available} onChange={(next) => setForm({ ...form, is_available: next })} label="Available for sale" />
            <label className="text-sm font-semibold text-ink-700">Available for sale</label>
          </div>

          {editing && (
            <div className="border-t border-sandal-200 pt-3">
              <label className="label">Photo</label>
              {editing.images.length > 0 && (
                <div className="w-24 h-24 rounded-lg overflow-hidden border border-sandal-200 mt-2 mb-2">
                  <img src={editing.images[0].image} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex items-center gap-3">
                {/* capture="environment" opens the phone camera directly; users can still choose "Photo Library" from the same picker for gallery images */}
                <FileInput
                  accept="image/*"
                  capture="environment"
                  label={editing.images.length > 0 ? 'Replace Photo' : 'Add Photo'}
                  onChange={handleImageUpload}
                />
                {editing.images.length > 0 && (
                  <button type="button" className="text-brand-600 font-semibold text-sm hover:text-brand-700" onClick={() => setConfirmRemoveImage(true)}>
                    Remove
                  </button>
                )}
              </div>
              <p className="text-xs text-ink-400 mt-1">Take a photo or choose from gallery.</p>
            </div>
          )}
          {!editing && (
            <p className="text-xs text-ink-400 border-t border-sandal-200 pt-3">Save the product first, then add photos.</p>
          )}
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => handleDelete(deleteTarget.id)}
        title="Delete product"
        message={deleteTarget ? `Delete "${deleteTarget.name}"? This can't be undone.` : ''}
      />

      <ConfirmDialog
        open={confirmRemoveImage}
        onClose={() => setConfirmRemoveImage(false)}
        onConfirm={handleRemoveImage}
        title="Remove photo"
        message="Remove this product's photo? This can't be undone."
      />
    </div>
  )
}
