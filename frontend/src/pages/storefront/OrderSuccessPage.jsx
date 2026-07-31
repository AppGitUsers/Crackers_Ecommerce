import { Link, useLocation, useParams } from 'react-router-dom'

export default function OrderSuccessPage() {
  const { orderNumber } = useParams()
  const location = useLocation()
  const order = location.state?.order

  return (
    <div className="max-w-lg mx-auto text-center py-10">
      <div className="text-5xl mb-3">🎉</div>
      <h1 className="text-2xl font-extrabold text-ink-900">Order Placed!</h1>
      <p className="text-ink-600 mt-2">
        Your order <span className="font-bold text-ink-900">{orderNumber}</span> has been received.
        We'll call you shortly to confirm and collect payment.
      </p>

      {order && (
        <div className="card p-5 mt-6 text-left">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-ink-500">Subtotal</span>
            <span className="text-ink-900">₹{order.subtotal_amount}</span>
          </div>
          {Number(order.discount_amount) > 0 && (
            <div className="flex justify-between text-sm mb-1 text-green-600">
              <span>Offer Discount</span>
              <span>−₹{order.discount_amount}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg border-t border-sandal-200 pt-2 mt-2 text-ink-900">
            <span>Total</span>
            <span>₹{order.total_amount}</span>
          </div>
        </div>
      )}

      <div className="flex gap-3 justify-center mt-6">
        <Link to="/" className="btn-secondary">Continue Shopping</Link>
        <Link to="/my-orders" className="btn-primary">Track My Orders</Link>
      </div>
    </div>
  )
}
