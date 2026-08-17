import { useEffect, useState } from 'react'
import { Plus, ImageOff, X } from 'lucide-react'
import { OffersAPI, ProductsAPI } from '../../api/endpoints'
import { Modal, ConfirmDialog, PageLoader, Toggle, Select, FileInput } from '../../components/admin/ui.jsx'
import { useToast } from '../../context/ToastContext.jsx'

const OFFER_TYPE_OPTIONS = [
  { value: 'buy_x_get_y', label: 'Buy X Get Y' },
  { value: 'amount_discount', label: 'Spend ₹X, Get ₹Y Off/Free' },
]
const DISCOUNT_TYPE_OPTIONS = [
  { value: 'flat_discount', label: 'Flat Rupee Discount' },
  { value: 'free_products_worth', label: 'Free Products Worth ₹' },
]

const EMPTY_OFFER = {
  name: '', offer_type: 'buy_x_get_y', description: '', is_active: true, priority: 0,
  buy_x_get_y: { buy_quantity: 1, get_quantity: 1, buy_products: [], free_products: [] },
  amount_discount: { min_purchase_amount: '', discount_type: 'flat_discount', discount_value: '', applicable_products: [] },
}

function productNames(ids, products) {
  return ids
    .map((id) => products.find((p) => p.id === id)?.name)
    .filter(Boolean)
}

function ProductMultiSelect({ label, products, selectedIds, onChange }) {
  return (
    <div>
      <label className="label">{label}</label>
      <select
        multiple
        className="input h-28"
        value={selectedIds.map(String)}
        onChange={(e) => onChange(Array.from(e.target.selectedOptions, (o) => Number(o.value)))}
      >
        {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selectedIds.map((id) => {
            const product = products.find((p) => p.id === id)
            if (!product) return null
            return (
              <span key={id} className="inline-flex items-center gap-1 bg-brand-50 text-brand-700 text-xs font-semibold pl-2 pr-1 py-1 rounded-full">
                {product.name}
                <button
                  type="button"
                  onClick={() => onChange(selectedIds.filter((x) => x !== id))}
                  className="w-4 h-4 rounded-full hover:bg-brand-100 flex items-center justify-center"
                  aria-label={`Remove ${product.name}`}
                >
                  <X size={11} />
                </button>
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function OffersPage() {
  const toast = useToast()
  const [offers, setOffers] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_OFFER)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [saving, setSaving] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const [togglingIds, setTogglingIds] = useState(new Set())
  // Collapsed by default — "buy X get Y" almost always means Y of the same
  // product you bought, which is already the backend's default when
  // free_products is empty. Only expand this (and let the admin pick a
  // different free product) when that's actually what's configured.
  const [customFreeProducts, setCustomFreeProducts] = useState(false)

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
    setCustomFreeProducts(false)
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
    // Preserve an existing distinct free-product configuration instead of
    // hiding it (and silently wiping it on next save) — only offers that
    // already use it get the override expanded.
    setCustomFreeProducts(Boolean(offer.buy_x_get_y?.free_products?.length))
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
    if (saving) return
    setSaving(true)
    try {
      const payload = {
        name: form.name, offer_type: form.offer_type, description: form.description,
        is_active: form.is_active, priority: form.priority,
      }
      if (form.offer_type === 'buy_x_get_y') payload.buy_x_get_y = form.buy_x_get_y
      if (form.offer_type === 'amount_discount') payload.amount_discount = form.amount_discount

      if (editing) {
        await OffersAPI.update(editing.id, payload)
        toast.success('Offer updated.')
        load()
      } else {
        const { data } = await OffersAPI.create(payload)
        toast.success('Offer created — add a banner image to finish.')
        load()
        setEditing(data)
        return // keep the form open so a banner image can be attached
      }
      setShowForm(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleImageUpload(e) {
    if (!editing || uploadingBanner) return
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    setUploadingBanner(true)
    try {
      await OffersAPI.uploadBannerImage(editing.id, file)
      toast.success('Banner image uploaded.')
      refreshEditing(editing.id)
    } finally {
      setUploadingBanner(false)
    }
  }

  async function toggleActive(offer, nextValue) {
    if (togglingIds.has(offer.id)) return
    setTogglingIds((prev) => new Set(prev).add(offer.id))
    try {
      await OffersAPI.update(offer.id, { is_active: nextValue })
      load()
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev)
        next.delete(offer.id)
        return next
      })
    }
  }

  async function handleDelete(id) {
    await OffersAPI.remove(id)
    toast.success('Offer deleted.')
    load()
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Offers</h1>
        <button className="btn-primary" onClick={openCreate}>
          <Plus size={16} />
          New Offer
        </button>
      </div>

      {loading ? <PageLoader /> : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {offers.map((offer) => (
            <div key={offer.id} className="card overflow-hidden">
              <div className="aspect-[3/1] bg-sandal-100 flex items-center justify-center overflow-hidden">
                {offer.banner_image ? (
                  <img src={offer.banner_image} alt={offer.name} className="w-full h-full object-cover" />
                ) : (
                  <ImageOff size={28} className="text-ink-300" />
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-ink-900">{offer.name}</h3>
                    <span className="badge badge-ink capitalize">{offer.offer_type.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`badge ${offer.is_active ? 'badge-green' : 'badge-ink'}`}>
                      {offer.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <Toggle checked={offer.is_active} disabled={togglingIds.has(offer.id)} onChange={(next) => toggleActive(offer, next)} label="Offer active" />
                  </div>
                </div>
                {offer.offer_type === 'buy_x_get_y' && offer.buy_x_get_y && (
                  <>
                    <p className="text-sm text-ink-600 mt-2">
                      Buy {offer.buy_x_get_y.buy_quantity} get {offer.buy_x_get_y.get_quantity} free
                    </p>
                    <p className="text-xs text-ink-400 mt-1">
                      On: {productNames(offer.buy_x_get_y.buy_products, products).join(', ') || '—'}
                    </p>
                    {offer.buy_x_get_y.free_products.length > 0 && (
                      <p className="text-xs text-ink-400">
                        Free item: {productNames(offer.buy_x_get_y.free_products, products).join(', ')}
                      </p>
                    )}
                  </>
                )}
                {offer.offer_type === 'amount_discount' && offer.amount_discount && (
                  <p className="text-sm text-ink-600 mt-2">
                    Spend ₹{offer.amount_discount.min_purchase_amount} → ₹{offer.amount_discount.discount_value}{' '}
                    {offer.amount_discount.discount_type === 'flat_discount' ? 'off' : 'worth free'}
                  </p>
                )}
                <div className="flex gap-3 mt-3">
                  <button className="text-brand-600 hover:text-brand-700 text-sm font-semibold" onClick={() => openEdit(offer)}>Edit</button>
                  <button className="text-brand-600 hover:text-brand-700 text-sm font-semibold" onClick={() => setDeleteTarget(offer)}>Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? 'Edit Offer' : 'New Offer'}
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Close</button>
            <button type="submit" form="offer-form" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Offer'}</button>
          </>
        }
      >
        <form id="offer-form" onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="label">Name (shown in banner)</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="label">Type</label>
            <Select value={form.offer_type} onChange={(v) => setForm({ ...form, offer_type: v })} options={OFFER_TYPE_OPTIONS} />
          </div>

          {form.offer_type === 'buy_x_get_y' && (
            <div className="border border-sandal-200 rounded-lg p-3 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Buy Qty</label>
                  <input type="number" className="input" value={form.buy_x_get_y.buy_quantity}
                    onChange={(e) => setForm({ ...form, buy_x_get_y: { ...form.buy_x_get_y, buy_quantity: e.target.value } })} />
                </div>
                <div>
                  <label className="label">Get Qty Free</label>
                  <input type="number" className="input" value={form.buy_x_get_y.get_quantity}
                    onChange={(e) => setForm({ ...form, buy_x_get_y: { ...form.buy_x_get_y, get_quantity: e.target.value } })} />
                </div>
              </div>

              <ProductMultiSelect
                label={'Eligible "Buy" Products (ctrl/cmd+click to multi-select)'}
                products={products}
                selectedIds={form.buy_x_get_y.buy_products}
                onChange={(val) => setForm({ ...form, buy_x_get_y: { ...form.buy_x_get_y, buy_products: val } })}
              />

              <div className="border-t border-sandal-200 pt-3">
                <label className="flex items-center gap-2.5">
                  <Toggle
                    checked={customFreeProducts}
                    onChange={(next) => {
                      setCustomFreeProducts(next)
                      if (!next) {
                        setForm({ ...form, buy_x_get_y: { ...form.buy_x_get_y, free_products: [] } })
                      }
                    }}
                    label="Give a different free product than what's bought"
                  />
                  <span className="text-xs font-semibold text-ink-700">Give a different free product than what's bought</span>
                </label>
                {customFreeProducts ? (
                  <div className="mt-2">
                    <ProductMultiSelect
                      label='Eligible "Free" Products'
                      products={products}
                      selectedIds={form.buy_x_get_y.free_products}
                      onChange={(val) => setForm({ ...form, buy_x_get_y: { ...form.buy_x_get_y, free_products: val } })}
                    />
                  </div>
                ) : (
                  <p className="text-xs text-ink-400 mt-1">By default, the product being bought is the one that becomes free.</p>
                )}
              </div>
            </div>
          )}

          {form.offer_type === 'amount_discount' && (
            <div className="border border-sandal-200 rounded-lg p-3 space-y-2">
              <div>
                <label className="label">Minimum Purchase (₹)</label>
                <input type="number" className="input" value={form.amount_discount.min_purchase_amount}
                  onChange={(e) => setForm({ ...form, amount_discount: { ...form.amount_discount, min_purchase_amount: e.target.value } })} />
              </div>
              <div>
                <label className="label">Discount Type</label>
                <Select
                  value={form.amount_discount.discount_type}
                  onChange={(v) => setForm({ ...form, amount_discount: { ...form.amount_discount, discount_type: v } })}
                  options={DISCOUNT_TYPE_OPTIONS}
                />
              </div>
              <div>
                <label className="label">Value (₹)</label>
                <input type="number" className="input" value={form.amount_discount.discount_value}
                  onChange={(e) => setForm({ ...form, amount_discount: { ...form.amount_discount, discount_value: e.target.value } })} />
              </div>
              <ProductMultiSelect
                label="Applicable Products (empty = whole cart)"
                products={products}
                selectedIds={form.amount_discount.applicable_products}
                onChange={(val) => setForm({ ...form, amount_discount: { ...form.amount_discount, applicable_products: val } })}
              />
            </div>
          )}

          <div>
            <label className="label">Banner Description (optional)</label>
            <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>

          {editing ? (
            <div className="border-t border-sandal-200 pt-3">
              <label className="label">Banner Image</label>
              {editing.banner_image && (
                <div className="w-full aspect-[3/1] rounded-lg overflow-hidden border border-sandal-200 mt-2 mb-2">
                  <img src={editing.banner_image} className="w-full h-full object-cover" />
                </div>
              )}
              <FileInput
                accept="image/*"
                label={uploadingBanner ? 'Uploading…' : 'Upload Banner'}
                disabled={uploadingBanner}
                onChange={handleImageUpload}
              />
              <p className="text-xs text-ink-400 mt-1">Shown behind the offer text in the storefront carousel.</p>
            </div>
          ) : (
            <p className="text-xs text-ink-400 border-t border-sandal-200 pt-3">Save the offer first, then add a banner image.</p>
          )}
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => handleDelete(deleteTarget.id)}
        title="Delete offer"
        message={deleteTarget ? `Delete "${deleteTarget.name}"? This can't be undone.` : ''}
      />
    </div>
  )
}
