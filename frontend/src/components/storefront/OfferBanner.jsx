import { useEffect, useRef, useState } from 'react'

function offerMechanicText(offer) {
  if (offer.offer_type === 'buy_x_get_y' && offer.buy_x_get_y) {
    const { buy_quantity, get_quantity } = offer.buy_x_get_y
    return `Buy ${buy_quantity} Get ${get_quantity} Free`
  }
  if (offer.offer_type === 'amount_discount' && offer.amount_discount) {
    const { min_purchase_amount, discount_type, discount_value } = offer.amount_discount
    const suffix = discount_type === 'flat_discount' ? 'OFF' : 'worth of products FREE'
    return `Buy for ₹${min_purchase_amount}, get ₹${discount_value} ${suffix}`
  }
  return ''
}

function Slide({ offer }) {
  return (
    <div className="relative w-full h-full shrink-0 overflow-hidden bg-ink-900">
      {offer.banner_image && (
        <img src={offer.banner_image} alt={offer.name} className="absolute inset-0 w-full h-full object-cover" />
      )}
      <div
        className={`absolute inset-0 ${
          offer.banner_image
            ? 'bg-gradient-to-r from-black/75 via-black/45 to-transparent'
            : 'bg-gradient-to-r from-brand-700 to-ink-900'
        }`}
      />
      <div className="relative h-full max-w-6xl mx-auto px-14 sm:px-16 flex flex-col justify-center text-white">
        <span className="text-gold-400 text-xs font-bold uppercase tracking-widest mb-1">✨ Limited Time Offer</span>
        <h2 className="text-xl sm:text-3xl font-extrabold leading-tight">{offer.name}</h2>
        <p className="text-sm sm:text-base text-sandal-100 mt-1 max-w-md">
          {offer.description || offerMechanicText(offer)}
        </p>
      </div>
    </div>
  )
}

export default function OfferBanner({ offers }) {
  const count = offers.length
  // Clone the last slide at the front and the first slide at the back, so
  // sliding past either end can snap invisibly back into the real range —
  // the classic technique for a seamless infinite slide track.
  const slides = count > 1 ? [offers[count - 1], ...offers, offers[0]] : offers
  const [position, setPosition] = useState(count > 1 ? 1 : 0)
  const [withTransition, setWithTransition] = useState(true)

  useEffect(() => {
    setPosition(count > 1 ? 1 : 0)
  }, [count])

  useEffect(() => {
    if (count <= 1) return
    const id = setInterval(() => {
      setWithTransition(true)
      setPosition((p) => p + 1)
    }, 4000)
    return () => clearInterval(id)
  }, [count, position])

  useEffect(() => {
    if (withTransition) return
    const id = requestAnimationFrame(() => setWithTransition(true))
    return () => cancelAnimationFrame(id)
  }, [withTransition])

  if (!offers.length) return null

  if (count === 1) {
    return (
      <div className="relative w-full h-48 sm:h-60 overflow-hidden">
        <Slide offer={offers[0]} />
      </div>
    )
  }

  function goPrev() {
    setWithTransition(true)
    setPosition((p) => p - 1)
  }
  function goNext() {
    setWithTransition(true)
    setPosition((p) => p + 1)
  }
  function handleTransitionEnd() {
    if (position === 0) {
      setWithTransition(false)
      setPosition(count)
    } else if (position === count + 1) {
      setWithTransition(false)
      setPosition(1)
    }
  }

  return (
    <div className="relative w-full h-48 sm:h-60 overflow-hidden">
      <div
        className="flex h-full"
        style={{
          transform: `translateX(-${position * 100}%)`,
          transition: withTransition ? 'transform 500ms ease-in-out' : 'none',
        }}
        onTransitionEnd={handleTransitionEnd}
      >
        {slides.map((offer, i) => (
          <div key={i} className="w-full h-full shrink-0">
            <Slide offer={offer} />
          </div>
        ))}
      </div>

      <button
        onClick={goPrev}
        aria-label="Previous offer"
        className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center text-xl leading-none transition-colors z-10"
      >
        ‹
      </button>
      <button
        onClick={goNext}
        aria-label="Next offer"
        className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center text-xl leading-none transition-colors z-10"
      >
        ›
      </button>
    </div>
  )
}
