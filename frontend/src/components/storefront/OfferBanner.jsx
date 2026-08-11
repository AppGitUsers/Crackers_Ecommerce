import { useEffect, useRef, useState } from 'react'
import { Sparkles, ChevronLeft, ChevronRight } from 'lucide-react'
import { offerMechanicText } from '../../utils/offers'

function Slide({ offer }) {
  // If the banner image 404s or the request drops (slow/flaky network,
  // media server hiccup), fall back to the plain gradient instead of
  // leaving the browser's broken-image box showing through the overlay's
  // transparent side.
  const [imgFailed, setImgFailed] = useState(false)
  const showImage = Boolean(offer.banner_image) && !imgFailed

  return (
    <div className="relative w-full h-full shrink-0 overflow-hidden bg-ink-900">
      {offer.banner_image && !imgFailed && (
        <img
          src={offer.banner_image}
          alt={offer.name}
          className="absolute inset-0 w-full h-full object-cover"
          onError={() => setImgFailed(true)}
        />
      )}
      <div
        className={`absolute inset-0 ${
          showImage
            ? 'bg-gradient-to-r from-black/75 via-black/45 to-transparent'
            : 'bg-gradient-to-r from-brand-700 to-ink-900'
        }`}
      />
      <div className="relative h-full max-w-[1600px] mx-auto px-14 sm:px-16 flex flex-col justify-center text-white">
        <span className="text-gold-400 text-xs font-bold uppercase tracking-widest mb-1 flex items-center gap-1.5">
          <Sparkles size={12} />
          Limited Time Offer
        </span>
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
        className="absolute left-1 sm:left-3 top-1/2 -translate-y-1/2 flex items-center justify-center text-white/80 hover:text-white transition-all active:scale-90 z-10"
      >
        <ChevronLeft size={30} strokeWidth={1.5} className="scale-y-150 drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)]" />
      </button>
      <button
        onClick={goNext}
        aria-label="Next offer"
        className="absolute right-1 sm:right-3 top-1/2 -translate-y-1/2 flex items-center justify-center text-white/80 hover:text-white transition-all active:scale-90 z-10"
      >
        <ChevronRight size={30} strokeWidth={1.5} className="scale-y-150 drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)]" />
      </button>
    </div>
  )
}
