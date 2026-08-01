import { useEffect, useState } from 'react'
import { OffersAPI, ProductsAPI } from '../../api/endpoints'

const EMPTY_OFFER = {
  name: '', offer_type: 'buy_x_get_y', description: '', is_active: true, priority: 0,
  buy_x_get_y: { buy_quantity: 1, get_quantity: 1, buy_products: [], free_products: [] },
  amount_discount: { min_purchase_amount: '', discount_type: 'flat_discount', discount_value: '', applicable_products: [] },
}

export default function OffersPage() {
  const [offers, setOffers] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_OFFER)

  function load() {
    setLoading(true)
    OffersAPI.list().then(({ data }) => setOffers(data.results || data)).finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    ProductsAPI.list().then(({ data }) => setProducts(data.results || data))
  }, [])

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_OFFER)
    setShowForm(true)
  }

  function openEdit(offer) {
    setEditing(offer)
    setForm({
      name: offer.name,
      offer_type: offer.offer_type,
      description: offer.description,
      is_active: offer.is_active,
      priority: offer.priority,
      buy_x_get_y: offer.buy_x_get_y
        ? {
            buy_quantity: offer.buy_x_get_y.buy_quantity,
            get_quantity: offer.buy_x_get_y.get_quantity,
            buy_products: offer.buy_x_get_y.buy_products,
            free_products: offer.buy_x_get_y.free_products,
          }
        : EMPTY_OFFER.buy_x_get_y,
      amount_discount: offer.amount_discount
        ? {
            min_purchase_amount: offer.amount_discount.min_purchase_amount,
            discount_type: offer.amount_discount.discount_type,
            discount_value: offer.amount_discount.discount_value,
            applicable_products: offer.amount_discount.applicable_products,
          }
        : EMPTY_OFFER.amount_discount,
    })
    setShowForm(true)
  }

  async function refreshEditing(id) {
    const { data } = await OffersAPI.list()
    const list = data.results || data
    setOffers(list)
    setEditing(list.find((o) => o.id === id) || null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const payload = {
      name: form.name, offer_type: form.offer_type, description: form.description,
      is_active: form.is_active, priority: form.priority,
    }
    if (form.offer_type === 'buy_x_get_y') payload.buy_x_get_y = form.buy_x_get_y
    if (form.offer_type === 'amount_discount') payload.amount_discount = form.amount_discount

    if (editing) {
      await OffersAPI.update(editing.id, payload)
      load()
    } else {
      const { data } = await OffersAPI.create(payload)
      load()
      setEditing(data)
      return // keep the form open so a banner image can be attached
    }
    setShowForm(false)
  }

  async function handleImageUpload(e) {
    if (!editing) return
    const file = e.target.files[0]
    if (!file) return
    await OffersAPI.uploadBannerImage(editing.id, file)
    refreshEditing(editing.id)
  }

  async function toggleActive(offer) {
    await OffersAPI.update(offer.id, { is_active: !offer.is_active })
    load()
  }

  async function handleDelete(id) {
    if (!confirm('Delete this offer?')) return
    await OffersAPI.remove(id)
    load()
  }

  function multiSelect(list, setList) {
    return (e) => setList(Array.from(e.target.selectedOptions, (o) => Number(o.value)))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold text-ink-900">Offers</h1>
        <button className="btn-primary" onClick={openCreate}>+ New Offer</button>
      </div>

      {loading ? <p className="text-ink-500">Loading…</p> : (
        <div className="grid grid-cols-2 gap-4">
          {offers.map((offer) => (
            <div key={offer.id} className="card overflow-hidden">
              <div className="aspect-[3/1] bg-sandal-100 flex items-center justify-center overflow-hidden">
                {offer.banner_image ? (
                  <img src={offer.banner_image} alt={offer.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl text-ink-300">🎆</span>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-ink-900">{offer.name}</h3>
                    <span className="badge bg-sandal-100 text-ink-700 capitalize">{offer.offer_type.replace(/_/g, ' ')}</span>
                  </div>
                  <button
                    onClick={() => toggleActive(offer)}
                    className={`badge ${offer.is_active ? 'bg-green-100 text-green-700' : 'bg-ink-100 text-ink-500'}`}
                  >
                    {offer.is_active ? 'Active' : 'Inactive'}
                  </button>
                </div>
                {offer.offer_type === 'buy_x_get_y' && offer.buy_x_get_y && (
                  <p className="text-sm text-ink-600 mt-2">
                    Buy {offer.buy_x_get_y.buy_quantity} get {offer.buy_x_get_y.get_quantity} free
                    ({offer.buy_x_get_y.buy_products.length} eligible product(s))
                  </p>
                )}
                {offer.offer_type === 'amount_discount' && offer.amount_discount && (
                  <p className="text-sm text-ink-600 mt-2">
                    Spend ₹{offer.amount_discount.min_purchase_amount} → ₹{offer.amount_discount.discount_value}{' '}
                    {offer.amount_discount.discount_type === 'flat_discount' ? 'off' : 'worth free'}
                  </p>
                )}
                <div className="flex gap-3 mt-3">
                  <button className="text-brand-600 hover:text-brand-700 text-sm font-semibold" onClick={() => openEdit(offer)}>Edit</button>
                  <button className="text-brand-600 hover:text-brand-700 text-sm font-semibold" onClick={() => handleDelete(offer.id)}>Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-30 px-4 py-8 overflow-y-auto">
          <form onSubmit={handleSubmit} className="card p-6 w-full max-w-lg space-y-3">
            <h2 className="font-bold text-lg text-ink-900">{editing ? 'Edit Offer' : 'New Offer'}</h2>
            <div>
              <label className="text-sm font-semibold text-ink-700">Name (shown in banner)</label>
              <input className="input mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label className="text-sm font-semibold text-ink-700">Type</label>
              <select className="input mt-1" value={form.offer_type} onChange={(e) => setForm({ ...form, offer_type: e.target.value })}>
                <option value="buy_x_get_y">Buy X Get Y</option>
                <option value="amount_discount">Spend ₹X, Get ₹Y Off/Free</option>
              </select>
            </div>

            {form.offer_type === 'buy_x_get_y' && (
              <div className="border border-sandal-200 rounded-lg p-3 space-y-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-ink-700">Buy Qty</label>
                    <input type="number" className="input mt-1" value={form.buy_x_get_y.buy_quantity}
                      onChange={(e) => setForm({ ...form, buy_x_get_y: { ...form.buy_x_get_y, buy_quantity: e.target.value } })} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-ink-700">Get Qty Free</label>
                    <input type="number" className="input mt-1" value={form.buy_x_get_y.get_quantity}
                      onChange={(e) => setForm({ ...form, buy_x_get_y: { ...form.buy_x_get_y, get_quantity: e.target.value } })} />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-ink-700">Eligible "Buy" Products (ctrl/cmd+click to multi-select)</label>
                  <select multiple className="input mt-1 h-28"
                    onChange={multiSelect(products, (val) => setForm({ ...form, buy_x_get_y: { ...form.buy_x_get_y, buy_products: val } }))}>
                    {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-ink-700">Eligible "Free" Products (leave empty = same as bought item)</label>
                  <select multiple className="input mt-1 h-28"
                    onChange={multiSelect(products, (val) => setForm({ ...form, buy_x_get_y: { ...form.buy_x_get_y, free_products: val } }))}>
                    {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
            )}

            {form.offer_type === 'amount_discount' && (
              <div className="border border-sandal-200 rounded-lg p-3 space-y-2">
                <div>
                  <label className="text-xs font-semibold text-ink-700">Minimum Purchase (₹)</label>
                  <input type="number" className="input mt-1" value={form.amount_discount.min_purchase_amount}
                    onChange={(e) => setForm({ ...form, amount_discount: { ...form.amount_discount, min_purchase_amount: e.target.value } })} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-ink-700">Discount Type</label>
                  <select className="input mt-1" value={form.amount_discount.discount_type}
                    onChange={(e) => setForm({ ...form, amount_discount: { ...form.amount_discount, discount_type: e.target.value } })}>
                    <option value="flat_discount">Flat Rupee Discount</option>
                    <option value="free_products_worth">Free Products Worth ₹</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-ink-700">Value (₹)</label>
                  <input type="number" className="input mt-1" value={form.amount_discount.discount_value}
                    onChange={(e) => setForm({ ...form, amount_discount: { ...form.amount_discount, discount_value: e.target.value } })} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-ink-700">Applicable Products (empty = whole cart)</label>
                  <select multiple className="input mt-1 h-28"
                    onChange={multiSelect(products, (val) => setForm({ ...form, amount_discount: { ...form.amount_discount, applicable_products: val } }))}>
                    {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-semibold text-ink-700">Banner Description (optional)</label>
              <input className="input mt-1" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>

            {editing ? (
              <div className="border-t border-sandal-200 pt-3">
                <label className="text-sm font-semibold text-ink-700">Banner Image</label>
                {editing.banner_image && (
                  <div className="w-full aspect-[3/1] rounded-lg overflow-hidden border border-sandal-200 mt-2 mb-2">
                    <img src={editing.banner_image} className="w-full h-full object-cover" />
                  </div>
                )}
                <input type="file" accept="image/*" onChange={handleImageUpload} className="text-sm" />
                <p className="text-xs text-ink-400 mt-1">Shown behind the offer text in the storefront carousel.</p>
              </div>
            ) : (
              <p className="text-xs text-ink-400 border-t border-sandal-200 pt-3">Save the offer first, then add a banner image.</p>
            )}

            <div className="flex gap-2 justify-end pt-2">
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Close</button>
              <button type="submit" className="btn-primary">Save Offer</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
