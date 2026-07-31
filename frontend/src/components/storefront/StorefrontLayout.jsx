import { useEffect, useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { OffersAPI } from '../../api/endpoints'
import { useCart } from '../../context/CartContext'
import OfferBanner from './OfferBanner.jsx'

export default function StorefrontLayout() {
  const [offers, setOffers] = useState([])
  const { totalItems } = useCart()

  useEffect(() => {
    OffersAPI.active()
      .then(({ data }) => setOffers(data))
      .catch(() => setOffers([]))
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      {offers.length > 0 && <OfferBanner offers={offers} />}

      <header className="bg-white border-b border-sandal-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl">🎆</span>
            <span className="text-xl font-extrabold text-brand-600 tracking-tight">Sivakasi Crackers</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm font-semibold">
            <Link to="/my-orders" className="text-brand-700 hover:text-brand-500">My Orders</Link>
            <Link to="/cart" className="relative btn-primary flex items-center gap-2">
              Cart
              {totalItems > 0 && (
                <span className="bg-white text-brand-600 rounded-full text-xs font-bold w-5 h-5 flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        <Outlet />
      </main>

      <footer className="bg-brand-900 text-sandal-100 text-sm py-6 mt-10">
        <div className="max-w-6xl mx-auto px-4">
          © {new Date().getFullYear()} Sivakasi Crackers. Orders confirmed by phone call after checkout.
        </div>
      </footer>
    </div>
  )
}
