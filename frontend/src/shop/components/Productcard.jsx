import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useShopAuth } from '../context/AuthContext'
import LoginModal from './LoginModal'

export default function ProductCard({ product }) {
  const { addItem }         = useCart()
  const { user }            = useShopAuth()
  const [showLogin, setShowLogin] = useState(false)
  const [added, setAdded]   = useState(false)
  const navigate            = useNavigate()

  const image        = product.images?.[0]?.url
  const finalPrice   = product.discount
    ? (product.price * (1 - product.discount / 100)).toFixed(3)
    : product.price.toFixed(3)

  const handleQuickAdd = (e) => {
    e.stopPropagation()
    if (!user) { setShowLogin(true); return }
    addItem(product, null, 1)
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  return (
    <>
      <div className="group cursor-pointer" onClick={() => navigate(`/product/${product.id}`)}>
        {/* Image Container */}
        <div className="relative aspect-[3/4] bg-[#f5ede8] rounded overflow-hidden mb-3">
          {image ? (
            <div style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '12px',
              overflow: 'hidden'
            }}>
              <img 
                src={image} 
                alt={product.name} 
                className="group-hover:scale-105 transition-transform duration-500"
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  width: 'auto',
                  height: 'auto',
                  objectFit: 'contain',
                  display: 'block'
                }}
              />
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg width="60" height="80" viewBox="0 0 60 80">
                <ellipse cx="30" cy="40" rx="18" ry="28" fill="rgba(196,137,122,0.35)"/>
                <ellipse cx="30" cy="40" rx="10" ry="20" fill="rgba(196,137,122,0.2)"/>
              </svg>
            </div>
          )}

          {/* Badges (z-10 keeps them layered cleanly over the image wrap) */}
          {product.discount && (
            <span className="absolute top-3 left-3 z-10 bg-[#b07060] text-white text-[10px] px-2 py-0.5 rounded tracking-widest uppercase">
              -{product.discount}%
            </span>
          )}
          
          {product.is_featured && (
            <span className={`absolute top-3 z-10 ${product.discount ? 'left-16' : 'left-3'} bg-[#1a1715] text-white text-[10px] px-2 py-0.5 rounded tracking-widest uppercase`}>
              Featured
            </span>
          )}

          {/* Quick add panel */}
          <button
            onClick={handleQuickAdd}
            className="absolute bottom-0 left-0 right-0 z-10 bg-[#1a1715]/85 text-white text-[11px] tracking-widest uppercase py-3 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-200">
            {added ? '✓ Added' : '+ Add to Cart'}
          </button>
        </div>

        {/* Info */}
        <div>
          <p className="text-[13px] text-[#1a1715] font-medium leading-tight">{product.name}</p>
          {product.brand && <p className="text-[11px] text-[#6b6460] mt-0.5">{product.brand}</p>}
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-[13px] font-medium text-[#1a1715]">KWD {finalPrice}</span>
            {product.discount && (
              <span className="text-[11px] text-[#aaa] line-through">KWD {product.price.toFixed(3)}</span>
            )}
          </div>
          {product.stock <= 5 && product.stock > 0 && (
            <p className="text-[11px] text-[#b07060] mt-0.5">Only {product.stock} left</p>
          )}
          {product.stock === 0 && (
            <p className="text-[11px] text-[#aaa] mt-0.5">Out of stock</p>
          )}
        </div>
      </div>

      {showLogin && (
        <LoginModal
          onClose={() => setShowLogin(false)}
          onSuccess={() => { addItem(product, null, 1); setAdded(true); setTimeout(() => setAdded(false), 1500) }}
        />
      )}
    </>
  )
}