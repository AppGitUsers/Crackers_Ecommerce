import { ImageOff } from 'lucide-react'
import { useCart } from '../../context/CartContext'

export default function ProductCard({ product }) {
  const { items, addItem, setQuantity } = useCart()
  const cartLine = items.find((i) => i.product_id === product.id)

  const inCartQty = cartLine?.quantity || 0
  const [intPart, decPart] = Number(product.price).toFixed(2).split('.')

  return (
    <div className="group card p-4 flex flex-col transition-all duration-300 hover:shadow-elevated hover:-translate-y-0.5">
      <div className="aspect-square rounded-lg overflow-hidden mb-3 flex items-center justify-center ring-1 ring-black/5 bg-gradient-to-br from-sandal-50 to-sandal-100">
        {product.primary_image ? (
          <img
            src={product.primary_image}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <ImageOff size={28} className="text-sandal-400" strokeWidth={1.5} />
        )}
      </div>
      <h3 className="font-semibold text-ink-900 leading-snug">{product.name}</h3>
      <p className="text-xs text-ink-500 mb-1">{product.category_name}</p>
      <div className="mt-auto pt-2">
        <span className="font-extrabold text-brand-600 text-lg">
          ₹{intPart}<span className="text-xs font-bold align-top">.{decPart}</span>
        </span>
        <span className="text-xs text-ink-400 block -mt-0.5">/ {product.unit_label}</span>
      </div>

      {!product.in_stock ? (
        <span className="badge bg-ink-100 text-ink-500 mt-2 text-center">Out of stock</span>
      ) : inCartQty > 0 ? (
        <div className="relative mt-3 h-12">
          {/* Wave-topped "shelf" the stepper sits on */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 48" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0,18 C50,0 150,0 200,18 L200,48 L0,48 Z" className="fill-brand-100" />
          </svg>
          <div className="relative h-full flex items-center justify-center gap-3">
            <button
              className="w-8 h-8 rounded-full bg-white border border-brand-200 text-brand-600 font-bold flex items-center justify-center active:scale-90 transition-transform shadow-sm"
              onClick={() => setQuantity(product.id, inCartQty - 1)}
            >
              −
            </button>
            <span className="font-bold text-ink-900 w-4 text-center">{inCartQty}</span>
            <button
              className="w-8 h-8 rounded-full bg-brand-500 hover:bg-brand-600 text-white font-bold flex items-center justify-center active:scale-90 transition-transform shadow-sm"
              onClick={() => setQuantity(product.id, inCartQty + 1)}
            >
              +
            </button>
          </div>
        </div>
      ) : (
        <button
          className="group relative mt-3 h-12 w-full active:scale-95 transition-transform"
          onClick={() => addItem(product, 1)}
        >
          {/* The whole wave-topped shelf is the button, not just an icon on it */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 48" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0,18 C50,0 150,0 200,18 L200,48 L0,48 Z" className="fill-brand-100 group-hover:fill-brand-200 transition-colors" />
          </svg>
          <span className="relative flex items-center justify-center h-full font-bold text-brand-700 text-sm">
            Add
          </span>
        </button>
      )}
    </div>
  )
}
