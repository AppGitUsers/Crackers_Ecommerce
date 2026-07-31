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
    setForm(EMPTY_OFFER)
    setShowForm(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const payload = {
      name: form.name, offer_type: form.offer_type, description: form.description,
      is_active: form.is_active, priority: form.priority,
    }
    if (form.offer_type === 'buy_x_get_y') payload.buy_x_get_y = form.buy_x_get_y
    if (form.offer_type === 'amount_discount') payload.amount_discount = form.amount_discount

    await OffersAPI.create(payload)
    setShowForm(false)
    load()
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
        <h1 className="text-2xl font-extrabold text-brand-800">Offers</h1>
        <button className="btn-primary" onClick={openCreate}>+ New Offer</button>
      </div>

      {loading ? <p className="text-brand-500">Loading…</p> : (
        <div className="grid grid-cols-2 gap-4">
          {offers.map((offer) => (
            <div key={offer.id} className="card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-brand-800">{offer.name}</h3>
                  <span className="badge bg-sandal-100 text-brand-700 capitalize">{offer.offer_type.replace(/_/g, ' ')}</span>
                </div>
                <button
                  onClick={() => toggleActive(offer)}
                  className={`badge ${offer.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}
                >
                  {offer.is_active ? 'Active' : 'Inactive'}
                </button>
              </div>
              {offer.offer_type === 'buy_x_get_y' && offer.buy_x_get_y && (
                <p className="text-sm text-brand-600 mt-2">
                  Buy {offer.buy_x_get_y.buy_quantity} get {offer.buy_x_get_y.get_quantity} free
                  ({offer.buy_x_get_y.buy_products.length} eligible product(s))
                </p>
              )}
              {offer.offer_type === 'amount_discount' && offer.amount_discount && (
                <p className="text-sm text-brand-600 mt-2">
                  Spend ₹{offer.amount_discount.min_purchase_amount} → ₹{offer.amount_discount.discount_value}{' '}
                  {offer.amount_discount.discount_type === 'flat_discount' ? 'off' : 'worth free'}
                </p>
              )}
              <button className="text-red-500 text-sm font-semibold mt-3" onClick={() => handleDelete(offer.id)}>Delete</button>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-30 px-4 py-8 overflow-y-auto">
          <form onSubmit={handleSubmit} className="card p-6 w-full max-w-lg space-y-3">
            <h2 className="font-bold text-lg text-brand-800">New Offer</h2>
            <div>
              <label className="text-sm font-semibold text-brand-700">Name (shown in banner)</label>
              <input className="input mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label className="text-sm font-semibold text-brand-700">Type</label>
              <select className="input mt-1" value={form.offer_type} onChange={(e) => setForm({ ...form, offer_type: e.target.value })}>
                <option value="buy_x_get_y">Buy X Get Y</option>
                <option value="amount_discount">Spend ₹X, Get ₹Y Off/Free</option>
              </select>
            </div>

            {form.offer_type === 'buy_x_get_y' && (
              <div className="border border-sandal-200 rounded-lg p-3 space-y-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-brand-700">Buy Qty</label>
                    <input type="number" className="input mt-1" value={form.buy_x_get_y.buy_quantity}
                      onChange={(e) => setForm({ ...form, buy_x_get_y: { ...form.buy_x_get_y, buy_quantity: e.target.value } })} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-brand-700">Get Qty Free</label>
                    <input type="number" className="input mt-1" value={form.buy_x_get_y.get_quantity}
                      onChange={(e) => setForm({ ...form, buy_x_get_y: { ...form.buy_x_get_y, get_quantity: e.target.value } })} />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-brand-700">Eligible "Buy" Products (ctrl/cmd+click to multi-select)</label>
                  <select multiple className="input mt-1 h-28"
                    onChange={multiSelect(products, (val) => setForm({ ...form, buy_x_get_y: { ...form.buy_x_get_y, buy_products: val } }))}>
                    {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-brand-700">Eligible "Free" Products (leave empty = same as bought item)</label>
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
                  <label className="text-xs font-semibold text-brand-700">Minimum Purchase (₹)</label>
                  <input type="number" className="input mt-1" value={form.amount_discount.min_purchase_amount}
                    onChange={(e) => setForm({ ...form, amount_discount: { ...form.amount_discount, min_purchase_amount: e.target.value } })} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-brand-700">Discount Type</label>
                  <select className="input mt-1" value={form.amount_discount.discount_type}
                    onChange={(e) => setForm({ ...form, amount_discount: { ...form.amount_discount, discount_type: e.target.value } })}>
                    <option value="flat_discount">Flat Rupee Discount</option>
                    <option value="free_products_worth">Free Products Worth ₹</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-brand-700">Value (₹)</label>
                  <input type="number" className="input mt-1" value={form.amount_discount.discount_value}
                    onChange={(e) => setForm({ ...form, amount_discount: { ...form.amount_discount, discount_value: e.target.value } })} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-brand-700">Applicable Products (empty = whole cart)</label>
                  <select multiple className="input mt-1 h-28"
                    onChange={multiSelect(products, (val) => setForm({ ...form, amount_discount: { ...form.amount_discount, applicable_products: val } }))}>
                    {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-semibold text-brand-700">Banner Description (optional)</label>
              <input className="input mt-1" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn-primary">Save Offer</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
