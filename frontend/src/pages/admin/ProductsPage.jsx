import { useEffect, useState } from 'react'
import { CategoriesAdminAPI, ProductsAPI } from '../../api/endpoints'

const EMPTY_FORM = { category: '', name: '', description: '', price: '', stock_quantity: 0, unit_label: 'box', is_available: true }

export default function ProductsPage() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [categoryFilter, setCategoryFilter] = useState('')

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
    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => fd.append(k, v))

    if (editing) {
      await ProductsAPI.update(editing.id, fd)
    } else {
      await ProductsAPI.create(fd)
    }
    setShowForm(false)
    load()
  }

  async function handleDelete(id) {
    if (!confirm('Delete this product?')) return
    await ProductsAPI.remove(id)
    load()
  }

  async function handleImageUpload(e) {
    if (!editing) return
    const file = e.target.files[0]
    if (!file) return
    await ProductsAPI.uploadImage(editing.id, file, editing.images.length === 0)
    const { data } = await ProductsAPI.detail(editing.id)
    setEditing(data)
  }

  async function toggleAvailability(product) {
    await ProductsAPI.update(product.id, (() => {
      const fd = new FormData()
      fd.append('is_available', !product.is_available)
      return fd
    })())
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold text-ink-900">Products</h1>
        <button className="btn-primary" onClick={openCreate}>+ New Product</button>
      </div>

      <div className="mb-4">
        <select className="input w-56" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {loading ? (
        <p className="text-ink-500">Loading…</p>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-sandal-100 text-ink-600 text-left">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Available</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sandal-100">
              {products.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-semibold text-ink-900 flex items-center gap-2">
                    <div className="w-8 h-8 bg-sandal-100 rounded overflow-hidden flex items-center justify-center shrink-0">
                      {p.primary_image ? <img src={p.primary_image} className="w-full h-full object-cover" /> : '🎇'}
                    </div>
                    {p.name}
                  </td>
                  <td className="px-4 py-3">{p.category_name}</td>
                  <td className="px-4 py-3">₹{p.price}</td>
                  <td className="px-4 py-3">{p.stock_quantity}</td>
                  <td className="px-4 py-3">
                    <button
                      className={`badge ${p.is_available ? 'bg-green-100 text-green-700' : 'bg-ink-100 text-ink-500'}`}
                      onClick={() => toggleAvailability(p)}
                    >
                      {p.is_available ? 'Available' : 'Hidden'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right space-x-3">
                    <button className="text-brand-600 font-semibold hover:text-brand-700" onClick={() => openEdit(p.id)}>Edit</button>
                    <button className="text-brand-600 font-semibold hover:text-brand-700" onClick={() => handleDelete(p.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-30 px-4 py-8 overflow-y-auto">
          <form onSubmit={handleSubmit} className="card p-6 w-full max-w-lg space-y-3">
            <h2 className="font-bold text-lg text-ink-900">{editing ? 'Edit Product' : 'New Product'}</h2>

            <div>
              <label className="text-sm font-semibold text-ink-700">Category</label>
              <select className="input mt-1" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required>
                <option value="">Select category…</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold text-ink-700">Name</label>
              <input className="input mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label className="text-sm font-semibold text-ink-700">Description</label>
              <textarea className="input mt-1" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-semibold text-ink-700">Price (₹)</label>
                <input type="number" step="0.01" className="input mt-1" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
              </div>
              <div>
                <label className="text-sm font-semibold text-ink-700">Stock Qty</label>
                <input type="number" className="input mt-1" value={form.stock_quantity} onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })} required />
              </div>
              <div>
                <label className="text-sm font-semibold text-ink-700">Unit</label>
                <input className="input mt-1" value={form.unit_label} onChange={(e) => setForm({ ...form, unit_label: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.is_available} onChange={(e) => setForm({ ...form, is_available: e.target.checked })} />
              <label className="text-sm font-semibold text-ink-700">Available for sale</label>
            </div>

            {editing && (
              <div className="border-t border-sandal-200 pt-3">
                <label className="text-sm font-semibold text-ink-700">Photos</label>
                <div className="flex flex-wrap gap-2 mt-2 mb-2">
                  {editing.images.map((img) => (
                    <div key={img.id} className="w-16 h-16 rounded-lg overflow-hidden border border-sandal-200">
                      <img src={img.image} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
                {/* capture="environment" opens the phone camera directly; users can still choose "Photo Library" from the same picker for gallery images */}
                <input type="file" accept="image/*" capture="environment" onChange={handleImageUpload} className="text-sm" />
                <p className="text-xs text-ink-400 mt-1">Take a photo or choose from gallery.</p>
              </div>
            )}
            {!editing && (
              <p className="text-xs text-ink-400 border-t border-sandal-200 pt-3">Save the product first, then add photos.</p>
            )}

            <div className="flex gap-2 justify-end pt-2">
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Close</button>
              <button type="submit" className="btn-primary">Save</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
