import { useEffect, useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { Sparkles, Package, ShoppingCart, ShieldCheck, PhoneCall } from 'lucide-react'
import { OffersAPI } from '../../api/endpoints'
import { useCart } from '../../context/CartContext'
import OfferBanner from './OfferBanner.jsx'
import SearchBar from './SearchBar.jsx'

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

      <div className="sticky top-0 z-20 px-3 sm:px-4 pt-3">
        <header className="max-w-[1600px] mx-auto bg-black rounded-full shadow-elevated px-3 sm:px-5 py-2 flex items-center justify-between gap-2 sm:gap-4">
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <span className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-sky-600 flex items-center justify-center shrink-0">
              <Sparkles size={16} className="text-white" />
            </span>
            <span className="hidden sm:block text-lg font-extrabold text-white tracking-tight">
              Achammal <span className="text-brand-400">Pyrotech</span>
            </span>
          </Link>

          <SearchBar />

          <nav className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link to="/my-orders" className="flex items-center gap-1.5 text-sandal-100 hover:text-white text-sm font-semibold transition-colors px-2">
              <Package size={17} />
              <span className="hidden sm:inline">My Orders</span>
            </Link>
            <Link
              to="/cart"
              className="relative w-10 h-10 rounded-full bg-brand-500 hover:bg-brand-600 flex items-center justify-center transition-all active:scale-90"
              aria-label="Cart"
            >
              <ShoppingCart size={17} className="text-white" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-sky-500 text-white rounded-full text-[10px] font-bold w-5 h-5 flex items-center justify-center ring-2 ring-black">
                  {totalItems}
                </span>
              )}
            </Link>
          </nav>
        </header>
      </div>

      <main className="flex-1 max-w-[1600px] mx-auto w-full px-4 sm:px-6 lg:px-10 py-8">
        <Outlet />
      </main>

      <footer className="bg-black text-sandal-200 mt-10 rounded-t-[2.5rem]">
        <div className="max-w-[1600px] mx-auto px-6 lg:px-10 py-8">
          <div className="flex items-center gap-2.5 mb-4">
            <span className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-sky-600 flex items-center justify-center shrink-0">
              <Sparkles size={14} className="text-white" />
            </span>
            <span className="text-base font-extrabold text-white tracking-tight">
              Achammal <span className="text-brand-400">Pyrotech</span>
            </span>
          </div>
          <div className="flex flex-wrap gap-3 mb-6">
            <span className="flex items-center gap-1.5 bg-white/5 text-xs font-semibold px-3 py-1.5 rounded-full">
              <ShieldCheck size={13} className="text-sky-400" />
              Genuine Achammal Pyrotech
            </span>
            <span className="flex items-center gap-1.5 bg-white/5 text-xs font-semibold px-3 py-1.5 rounded-full">
              <PhoneCall size={13} className="text-sky-400" />
              Confirmed By Phone Call
            </span>
          </div>
          <div className="text-sm border-t border-white/10 pt-4">
            © {new Date().getFullYear()} Achammal Pyrotech. Orders confirmed by phone call after checkout.
          </div>
        </div>
      </footer>
    </div>
  )
}
