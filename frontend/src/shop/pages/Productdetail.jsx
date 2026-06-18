import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import LoginModal from '../components/LoginModal'
import { getProduct } from '../api/products'
import { getProductReviews } from '../api/reviews' 
import { useCart } from '../context/CartContext'
import { useShopAuth } from '../context/AuthContext'

export default function ProductDetail() {
  const { id }                = useParams()
  const navigate            = useNavigate()
  const { addItem }         = useCart()
  const { user }            = useShopAuth()
  const [product, setProduct] = useState(null)
  const [reviews, setReviews] = useState([]) 
  const [loading, setLoading] = useState(true)
  const [selectedSize, setSelectedSize] = useState(null)
  const [showLogin, setShowLogin]       = useState(false)
  const [added, setAdded]               = useState(false)
  const [activeImage, setActiveImage]   = useState(0)
  const [sizeError, setSizeError]       = useState(false)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getProduct(id),
      getProductReviews(id).catch(() => ({ data: [] })) 
    ])
      .then(([productRes, reviewsRes]) => {
        setProduct(productRes.data)
        setReviews(reviewsRes.data || [])
      })
      .catch(() => navigate('/'))
      .finally(() => setLoading(false))
  }, [id, navigate])

  if (loading) return (
    <Layout>
      <div className="flex items-center justify-center py-32 text-[#aaa] text-sm font-['DM_Sans']">Loading...</div>
    </Layout>
  )
  if (!product) return null

  // ─── DYNAMIC BACKEND SIZES LOGIC ───
  // Reads sizes array from DB. Supports fallback if backend sends it stringified.
  const sizes = Array.isArray(product.sizes)
    ? product.sizes
    : typeof product.sizes === 'string'
      ? JSON.parse(product.sizes || '[]')
      : []

  const hasSizes = sizes.length > 0

  const finalPrice = product.discount
    ? (product.price * (1 - product.discount / 100)).toFixed(3)
    : product.price.toFixed(3)

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null

  const handleAddToCart = () => {
    // Only block execution if the product actually has variants to select from
    if (hasSizes && !selectedSize) { 
      setSizeError(true)
      return 
    }
    if (!user) { 
      setShowLogin(true)
      return 
    }
    
    // Pass null or the chosen size depending on product type
    addItem(product, hasSizes ? selectedSize : null)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  const renderStars = (rating) => {
    return (
      <div className="flex gap-0.5 text-amber-500">
        {[...Array(5)].map((_, i) => (
          <span key={i} className="text-sm">
            {i < rating ? '★' : '☆'}
          </span>
        ))}
      </div>
    )
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Back */}
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-xs tracking-widest uppercase text-[#6b6460] hover:text-[#1a1715] transition-colors mb-8 font-['DM_Sans']">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back
        </button>

        <div className="grid md:grid-cols-2 gap-12">
          {/* Images Layout Container */}
          <div className="space-y-3">
            {/* Main Viewport Card */}
            <div 
              className="aspect-[3/4] bg-[#f5ede8] rounded relative"
              style={{ overflow: 'hidden' }}
            >
              {product.images?.length > 0 ? (
                <div style={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0, bottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '12px'
                }}>
                  <img 
                    src={product.images[activeImage]?.url} 
                    alt={product.name} 
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
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg width="80" height="110" viewBox="0 0 80 110">
                    <ellipse cx="40" cy="55" rx="24" ry="36" fill="rgba(196,137,122,0.35)"/>
                  </svg>
                </div>
              )}
            </div>

            {/* Thumbnail Selection Strip */}
            {product.images?.length > 1 && (
              <div className="flex gap-2">
                {product.images.map((img, i) => (
                  <button 
                    key={i} 
                    onClick={() => setActiveImage(i)}
                    className="w-16 h-20 rounded border-2 transition-all bg-[#f5ede8] relative"
                    style={{
                      borderColor: activeImage === i ? '#1a1715' : 'transparent',
                      overflow: 'hidden'
                    }}
                  >
                    <div style={{
                      position: 'absolute',
                      top: 0, left: 0, right: 0, bottom: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '2px'
                    }}>
                      <img 
                        src={img.url} 
                        alt="" 
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
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex flex-col gap-5 pt-2">
            {product.brand && (
              <p className="text-xs tracking-widest uppercase text-[#6b6460] font-['DM_Sans']">{product.brand}</p>
            )}
            
            <div className="space-y-1">
              <h1 className="font-['Cormorant_Garamond'] text-4xl font-light text-[#1a1715] leading-tight">{product.name}</h1>
              {avgRating && (
                <div className="flex items-center gap-2 font-['DM_Sans'] text-xs text-[#6b6460]">
                  {renderStars(Math.round(avgRating))}
                  <span>{avgRating} ({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})</span>
                </div>
              )}
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <span className="text-2xl font-medium text-[#b07060] font-['DM_Sans']">KWD {finalPrice}</span>
              {product.discount && (
                <span className="text-sm text-[#aaa] line-through font-['DM_Sans']">KWD {product.price.toFixed(3)}</span>
              )}
            </div>

            <p className="text-sm text-[#6b6460] leading-relaxed font-['DM_Sans']">{product.description}</p>

            {/* Dynamic Sizes Section */}
            {hasSizes && (
              <div>
                <p className={`text-xs tracking-widest uppercase mb-3 font-['DM_Sans'] ${sizeError ? 'text-red-500' : 'text-[#6b6460]'}`}>
                  {sizeError ? 'Please select a size' : 'Select Size'}
                </p>
                <div className="flex gap-2 flex-wrap">
                  {sizes.map(size => (
                    <button 
                      key={size} 
                      onClick={() => { setSelectedSize(size); setSizeError(false) }}
                      className={`min-w-[44px] h-11 px-3 border rounded text-sm transition-all font-['DM_Sans']
                        ${selectedSize === size
                          ? 'bg-[#1a1715] text-white border-[#1a1715]'
                          : 'border-[#ede5e0] text-[#1a1715] hover:border-[#1a1715]'
                        }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Stock warning */}
            {product.stock <= 5 && product.stock > 0 && (
              <p className="text-xs text-[#b07060] font-['DM_Sans']">Only {product.stock} left in stock</p>
            )}
            {product.stock === 0 && (
              <p className="text-xs text-[#aaa] font-['DM_Sans']">Out of stock</p>
            )}

            {/* Add to cart */}
            <button
              onClick={handleAddToCart}
              disabled={product.stock === 0}
              className="bg-[#1a1715] text-white py-4 text-xs tracking-widest uppercase hover:bg-[#333] transition-colors disabled:opacity-40 rounded font-['DM_Sans'] mt-2">
              {added ? '✓ Added to Cart' : product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
            </button>

            {/* Tags */}
            {product.category && (
              <div className="flex gap-2 flex-wrap pt-2 border-t border-[#ede5e0]">
                <span className="text-xs px-3 py-1 bg-[#f5ede8] rounded-full text-[#6b6460] font-['DM_Sans'] capitalize">{product.category}</span>
              </div>
            )}
          </div>
        </div>

        {/* Reviews Showcase Section */}
        <div className="mt-20 pt-10 border-t border-[#ede5e0]">
          <h2 className="font-['Cormorant_Garamond'] text-2xl font-light text-[#1a1715] mb-8">
            Customer Reviews ({reviews.length})
          </h2>
          
          {reviews.length === 0 ? (
            <p className="text-sm text-[#aaa] font-['DM_Sans'] italic">No reviews yet for this product.</p>
          ) : (
            <div className="space-y-6 max-w-3xl">
              {reviews.map((review) => (
                <div key={review.id} className="pb-6 border-b border-[#f7f2ee] last:border-0">
                  <div className="flex items-center justify-between gap-4 mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-[#1a1715] font-['DM_Sans']">
                        {review.username || 'Verified Buyer'}
                      </span>
                      {renderStars(review.rating)}
                    </div>
                    <span className="text-xs text-[#aaa] font-['DM_Sans']">
                      {new Date(review.created_at).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                  {review.comment && (
                    <p className="text-sm text-[#6b6460] leading-relaxed font-['DM_Sans'] pl-0.5">
                      {review.comment}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showLogin && (
        <LoginModal
          onClose={() => setShowLogin(false)}
          onSuccess={() => { addItem(product, hasSizes ? selectedSize : null); setAdded(true); setTimeout(() => setAdded(false), 2000) }}
        />
      )}
    </Layout>
  )
}