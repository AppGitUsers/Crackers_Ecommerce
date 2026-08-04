import { useEffect, useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { OffersAPI } from '../../api/endpoints'
import { useCart } from '../../context/CartContext'
import OfferBanner from './OfferBanner.jsx'

export default function StorefrontLayout() {
  const [offers, setOffers] = useState([])
  const { totalItems } = useCart()

  useEffect(() => {
    // `cancelled` guards against React (StrictMode in dev, or any future
    // remount) firing this effect twice: without it, whichever of the two
    // requests resolves LAST wins — if that's a transient failure racing
    // behind a successful first request, it silently wipes out good data
    // with an empty array and the banner just doesn't show.
    let cancelled = false

    async function load(retriesLeft = 2) {
      try {
        const { data } = await OffersAPI.active()
        if (!cancelled) setOffers(data)
      } catch {
        if (cancelled) return
        if (retriesLeft > 0) {
          setTimeout(() => load(retriesLeft - 1), 800)
        } else {
          setOffers([])
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {offers.length > 0 && <OfferBanner offers={offers} />}

      <header className="bg-white border-b-2 border-brand-500 sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shrink-0">
              <Sparkles size={18} className="text-gold-400" />
            </span>
            <span className="text-xl font-extrabold text-ink-900 tracking-tight">
              Sivakasi <span className="text-brand-600">Crackers</span>
            </span>
          </Link>
          <nav className="flex items-center gap-4 text-sm font-semibold">
            <Link to="/my-orders" className="text-ink-700 hover:text-brand-600 transition-colors">My Orders</Link>
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

      <footer className="bg-ink-900 text-sandal-200 text-sm py-6 mt-10">
        <div className="max-w-6xl mx-auto px-4">
          © {new Date().getFullYear()} Sivakasi Crackers. Orders confirmed by phone call after checkout.
        </div>
      </footer>
    </div>
  )
}
