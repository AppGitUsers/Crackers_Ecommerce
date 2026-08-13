import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { FileWarning, PartyPopper } from 'lucide-react'
import { OrdersAPI } from '../../api/endpoints'

const PAYMENT_LABELS = { pending: 'Pending', paid: 'Paid', failed: 'Failed', refunded: 'Refunded' }

export default function InvoicePage() {
  const { token } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    OrdersAPI.invoiceByToken(token)
      .then(({ data }) => setData(data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) return <p className="text-center text-ink-500 py-16">Loading invoice…</p>

  if (notFound || !data) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <FileWarning size={32} className="text-ink-300 mx-auto mb-3" />
        <p className="text-ink-600">This invoice link is invalid or has expired.</p>
      </div>
    )
  }

  const company = data.company || {}

  return (
    <div className="max-w-2xl mx-auto py-6 animate-fade-in-up">
      <div className="card p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center shrink-0">
              <PartyPopper size={18} className="text-gold-400" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-ink-900">{company.company_name || 'Invoice'}</h1>
              <p className="text-xs text-ink-400">{company.company_address}</p>
            </div>
          </div>
          <div className="text-right text-xs text-ink-500">
            {company.company_phone && <p>Ph: {company.company_phone}</p>}
            {company.company_email && <p>{company.company_email}</p>}
            {company.company_gstin && <p>GSTIN: {company.company_gstin}</p>}
          </div>
        </div>

        <div className="divider" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs font-semibold text-ink-400 uppercase tracking-wide mb-1">Bill To</p>
            <p className="font-semibold text-ink-900">{data.customer.name}</p>
            <p className="text-ink-500">{data.customer.phone}</p>
            <p className="text-ink-500">{data.delivery_address || data.customer.address}</p>
          </div>
          <div className="sm:text-right">
            <p className="text-xs font-semibold text-ink-400 uppercase tracking-wide mb-1">Invoice Details</p>
            <p className="text-ink-900">Invoice #: <span className="font-semibold">{data.order_number}</span></p>
            <p className="text-ink-500">{new Date(data.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
            <p className="text-ink-500">Payment: {PAYMENT_LABELS[data.payment_status]}</p>
          </div>
        </div>

        {/* Narrow phones (the common case — this page is mostly opened from a
            WhatsApp link): stacked rows instead of a table, so the amount
            column never gets clipped off-screen. */}
        <div className="mt-6 divide-y divide-sandal-100 sm:hidden">
          {data.items.map((item) => (
            <div key={item.id} className="py-2.5">
              <p className="text-ink-900">
                {item.product_name}
                {item.is_free_item && <span className="badge bg-green-100 text-green-700 ml-2">Free</span>}
              </p>
              <div className="flex justify-between text-xs text-ink-500 mt-0.5">
                <span>{item.quantity} × ₹{item.unit_price}</span>
                <span className="font-semibold text-ink-900">₹{item.subtotal}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 overflow-x-auto hidden sm:block">
          <table className="w-full text-sm">
            <thead className="text-ink-500 text-left border-b border-sandal-200">
              <tr>
                <th className="pb-2">Item</th>
                <th className="pb-2">Qty</th>
                <th className="pb-2">Price</th>
                <th className="pb-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sandal-100">
              {data.items.map((item) => (
                <tr key={item.id}>
                  <td className="py-2 text-ink-900">
                    {item.product_name}
                    {item.is_free_item && <span className="badge bg-green-100 text-green-700 ml-2">Free</span>}
                  </td>
                  <td className="py-2">{item.quantity}</td>
                  <td className="py-2">₹{item.unit_price}</td>
                  <td className="py-2 text-right">₹{item.subtotal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {data.applied_offers_summary && (
          <p className="text-xs text-ink-500 mt-3"><span className="font-semibold text-ink-700">Offers applied:</span> {data.applied_offers_summary}</p>
        )}

        <div className="border-t border-sandal-200 mt-4 pt-3 space-y-1 text-sm max-w-xs ml-auto">
          <div className="flex justify-between"><span className="text-ink-500">Subtotal</span><span className="text-ink-900">₹{data.subtotal_amount}</span></div>
          {Number(data.discount_amount) > 0 && (
            <div className="flex justify-between text-green-600"><span>Discount</span><span>−₹{data.discount_amount}</span></div>
          )}
          <div className="flex justify-between font-bold text-base text-ink-900 border-t border-sandal-200 pt-2 mt-1"><span>Total</span><span>₹{data.total_amount}</span></div>
        </div>

        <p className="text-center text-xs text-ink-400 mt-8">Thank you for your business!</p>
      </div>
    </div>
  )
}
