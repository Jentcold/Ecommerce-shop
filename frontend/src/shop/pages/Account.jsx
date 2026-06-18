import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Layout from '../components/Layout'
import LoginModal from '../components/LoginModal'
import { useShopAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { getMyOrders, cancelOrder } from '../api/orders'
import { createReview, getMyReviews } from '../api/reviews'
import client from '../api/client'

const STATUS_STYLES = {
  pending:    'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  shipped:    'bg-purple-100 text-purple-800',
  delivered:  'bg-green-100 text-green-800',
  cancelled:  'bg-stone-100 text-stone-500',
}

// ── Star rating component ────────────────────────────────────────────────────
function StarRating({ value, onChange }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(star => (
        <button key={star} type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className={`text-2xl transition-colors ${(hover || value) >= star ? 'text-[#b07060]' : 'text-[#ddd]'}`}>
          ★
        </button>
      ))}
    </div>
  )
}

// ── Review form for a delivered order item ───────────────────────────────────
function ReviewForm({ orderId, productId, onDone }) {
  const [rating, setRating]   = useState(0)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!rating) { setError('Please select a rating'); return }
    setLoading(true)
    try {
      const res = await createReview({ product_id: Number(productId), order_id: Number(orderId), rating, comment })
      onDone({ id: res.data?.id, rating, comment, product_id: Number(productId), order_id: Number(orderId) })
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit review')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 p-4 bg-[#fdfaf8] border border-[#ede5e0] rounded-md space-y-3 max-w-lg">
      <div>
        <p className="text-xs text-[#6b6460] mb-1 font-['DM_Sans']">Rating</p>
        <StarRating value={rating} onChange={setRating} />
      </div>
      <div>
        <p className="text-xs text-[#6b6460] mb-1 font-['DM_Sans']">Comment (optional)</p>
        <textarea value={comment} onChange={e => setComment(e.target.value)} rows={2}
          className="w-full border border-[#ede5e0] rounded px-3 py-2 text-sm outline-none focus:border-[#1a1715] font-['DM_Sans'] resize-none" />
      </div>
      {error && <p className="text-xs text-red-500 font-['DM_Sans']">{error}</p>}
      <button type="submit" disabled={loading}
        className="text-xs bg-[#1a1715] text-white px-4 py-2 rounded hover:bg-[#333] transition-colors font-['DM_Sans'] disabled:opacity-50">
        {loading ? 'Submitting...' : 'Submit Review'}
      </button>
    </form>
  )
}

export default function Account() {
  const { clearCart }           = useCart()
  const { user, signOut }       = useShopAuth()
  const navigate                = useNavigate()
  const [searchParams]          = useSearchParams()
  const [tab, setTab]           = useState('orders')
  const [orders, setOrders]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [reviewsLoading, setReviewsLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [reviewedItems, setReviewedItems] = useState({})
  const [showReviewFor, setShowReviewFor] = useState(null)
  const [showLogin, setShowLogin] = useState(false)

  // Profile edit state
  const [username, setUsername]   = useState('')
  const [email, setEmail]         = useState('')
  const [profileMsg, setProfileMsg] = useState('')
  const [profileErr, setProfileErr] = useState('')

  // Password state
  const [currentPw, setCurrentPw]   = useState('')
  const [newPw, setNewPw]           = useState('')
  const [confirmPw, setConfirmPw]   = useState('')
  const [passwordMsg, setPasswordMsg] = useState('')
  const [passwordErr, setPasswordErr] = useState('')

  const justPlaced = searchParams.get('order') === 'placed'

  useEffect(() => {
    if (!user) return
    setUsername(user.username || '')
    setEmail(user.email || '')

    if (justPlaced) {
      clearCart()
    }

    Promise.all([
      getMyOrders().catch(() => ({ data: [] })),
      getMyReviews().catch(() => ({ data: [] })),
    ]).then(([ordersRes, reviewsRes]) => {
      setOrders(ordersRes.data || [])

      const alreadyReviewed = {}
      for (const r of (reviewsRes.data || [])) {
        alreadyReviewed[`${r.order_id}-${r.product_id}`] = {
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          product_name: r.product_name,
        }
      }
      setReviewedItems(alreadyReviewed)
      setReviewsLoading(false)
    }).finally(() => setLoading(false))
  }, [user, justPlaced])

  if (!user) return (
    <Layout>
      <div className="max-w-lg mx-auto px-6 py-32 text-center">
        <h2 className="font-['Cormorant_Garamond'] text-3xl font-light text-[#1a1715] mb-3">My Account</h2>
        <p className="text-sm text-[#6b6460] mb-8 font-['DM_Sans']">Sign in to view your orders and manage your account.</p>
        <button onClick={() => setShowLogin(true)}
          className="bg-[#1a1715] text-white px-8 py-3 text-xs tracking-widest uppercase hover:bg-[#333] transition-colors rounded font-['DM_Sans']">
          Sign In
        </button>
        {showLogin && <LoginModal onClose={() => setShowLogin(false)} onSuccess={() => {}} />}
      </div>
    </Layout>
  )

  const handleCancel = async (id) => {
    if (!confirm('Cancel this order?')) return
    await cancelOrder(id)
    setOrders(prev => prev.map(o => String(o.id) === String(id) ? { ...o, status: 'cancelled' } : o))
  }

  const handleDeleteReview = async (key, reviewId) => {
    if (!confirm('Are you sure you want to delete this review?')) return
    try {
      await client.delete(`/reviews/${reviewId}`)
      setReviewedItems(prev => {
        const updated = { ...prev }
        delete updated[key]
        return updated
      })
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete review')
    }
  }

  const handleProfileSave = async (e) => {
  e.preventDefault()
  setProfileErr('')
  setProfileMsg('')

  const isEmailChanged = email.trim().toLowerCase() !== user?.email?.toLowerCase()

  const payload = { username, email }

  if (isEmailChanged) {
    if (!currentPw.trim()) {
      setProfileErr('Please enter your current password to update your email address.')
      return
    }
    payload.current_password = currentPw
  }

  try {
    const res = await client.put('/users/me', payload)
    setProfileMsg('Profile updated successfully.')
    
    setCurrentPw('') 
  } catch (err) {
    const status = err.response?.status
    const detail = err.response?.data?.detail

    if (status === 401) {
      setProfileErr('Current password is incorrect.')
    } else {
      if (Array.isArray(detail)) {
        setProfileErr(detail[0]?.msg || 'Validation error')
      } else {
        setProfileErr(detail || 'Failed to update profile')
      }
    }
  }
}

const handlePasswordSave = async (e) => {
  e.preventDefault()
  setPasswordErr('')
  setPasswordMsg('')
  
  if (!currentPw.trim())   { setPasswordErr('Please enter your current password'); return }
  if (newPw !== confirmPw) { setPasswordErr('New passwords do not match'); return }
  if (newPw.length < 8)    { setPasswordErr('New password must be at least 8 characters'); return }
  if (currentPw === newPw) { setPasswordErr('New password must be different from your current password'); return }
  
  try {
    await client.put('/users/me', { 
      current_password: currentPw, 
      password: newPw 
    })
    
    setPasswordMsg('Password updated successfully.')
    setCurrentPw(''); setNewPw(''); setConfirmPw('')
  } catch (err) {
    const status = err.response?.status
    const detail = err.response?.data?.detail

    if (status === 401) {
      setPasswordErr('Current password is incorrect')
    } else {
      if (Array.isArray(detail)) {
        setPasswordErr(detail[0]?.msg || 'Validation error')
      } else {
        setPasswordErr(detail || 'Failed to update password')
      }
    }
  }
}

  const inputCls = "w-full border border-[#ede5e0] rounded px-3 py-2.5 text-sm outline-none focus:border-[#1a1715] transition-colors font-['DM_Sans']"
  const labelCls = "block text-xs tracking-widest uppercase text-[#6b6460] mb-2 font-['DM_Sans']"

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="font-['Cormorant_Garamond'] text-3xl font-light text-[#1a1715]">My Account</h1>
            <p className="text-sm text-[#6b6460] mt-1 font-['DM_Sans']">{user.email}</p>
          </div>
          <button onClick={() => { signOut(); navigate('/') }}
            className="text-xs tracking-widest uppercase text-[#6b6460] hover:text-red-500 transition-colors font-['DM_Sans']">
            Sign Out
          </button>
        </div>

        {/* Order placed banner */}
        {justPlaced && (
          <div className="bg-[#f5ede8] border border-[#e8d5cc] rounded p-4 mb-6 flex items-start gap-3">
            <span className="text-[#b07060] text-lg">✓</span>
            <div>
              <p className="text-sm font-medium text-[#1a1715] font-['DM_Sans']">Order placed successfully!</p>
              <p className="text-xs text-[#6b6460] mt-0.5 font-['DM_Sans']">
                A confirmation email has been sent to {user.email}. We'll get your order ready soon.
              </p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-0 border-b border-[#ede5e0] mb-6">
          {[
            { key: 'orders',   label: 'My Orders' },
            { key: 'reviews',  label: 'My Reviews' },
            { key: 'profile',  label: 'Profile' },
            { key: 'password', label: 'Password' },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-5 py-3 text-xs tracking-widest uppercase font-['DM_Sans'] border-b-2 -mb-px transition-colors
                ${tab === key
                  ? 'border-[#1a1715] text-[#1a1715] font-medium'
                  : 'border-transparent text-[#6b6460] hover:text-[#1a1715]'
                }`}>
              {label}
            </button>
          ))}
        </div>

        {/* ── Orders tab ───────────────────────────────────────────────────── */}
        {tab === 'orders' && (
          <>
            {loading && <p className="text-sm text-[#aaa] font-['DM_Sans']">Loading...</p>}
            {!loading && orders.length === 0 && (
              <div className="text-center py-16">
                <p className="text-sm text-[#6b6460] mb-4 font-['DM_Sans']">No orders yet.</p>
                <button onClick={() => navigate('/')}
                  className="bg-[#1a1715] text-white px-8 py-3 text-xs tracking-widest uppercase hover:bg-[#333] transition-colors rounded font-['DM_Sans']">
                  Shop Now
                </button>
              </div>
            )}
            <div className="space-y-3">
              {orders.map(order => {
                const isExpanded = String(expanded) === String(order.id)
                return (
                  <div key={order.id} className="bg-white border border-[#ede5e0] rounded overflow-hidden">
                    <button
                      onClick={() => setExpanded(isExpanded ? null : order.id)}
                      className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#fdfaf8] transition-colors">
                      <div className="flex items-center gap-4 text-left">
                        <span className="font-mono text-sm text-[#1a1715]">#{order.id}</span>
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium capitalize font-['DM_Sans'] ${STATUS_STYLES[order.status]}`}>
                          {order.status}
                        </span>
                        <span className="text-sm text-[#6b6460] font-['DM_Sans']">KWD {Number(order.total).toFixed(3)}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-[#aaa] font-['DM_Sans']">
                          {new Date(order.created_at).toLocaleDateString('en-GB')}
                        </span>
                        <span className="text-[#aaa] text-sm">{isExpanded ? '▴' : '▾'}</span>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-5 pb-5 border-t border-[#ede5e0] pt-4 space-y-4 divide-y divide-[#faf5f2]">
                        <p className="text-xs text-[#6b6460] font-['DM_Sans'] pb-2">
                          Delivering to: {order.shipping_address}
                        </p>

                        {!order.items || order.items.length === 0 ? (
                          <p className="text-xs text-[#aaa] font-['DM_Sans'] italic pt-2">
                            No item information available for this order.
                          </p>
                        ) : (
                          order.items.map(item => (
                            <div key={item.id} className="pt-3 first:pt-0">
                              <div className="flex justify-between items-start text-sm font-['DM_Sans']">
                                <div>
                                  <span className="text-[#1a1715] font-medium">
                                    {item.product_name || `Product #${item.product_id}`}
                                  </span>
                                  {item.size && <span className="text-[#6b6460] bg-[#f5ede8] px-2 py-0.5 ml-2 text-xs rounded">Size {item.size}</span>}
                                  <span className="text-[#aaa] ml-2 text-xs">× {item.quantity}</span>
                                </div>
                                <span className="text-[#1a1715] font-medium font-mono">
                                  KWD {(Number(item.price_at_purchase || 0) * item.quantity).toFixed(3)}
                                </span>
                              </div>

                              {/* Review hooks — only for delivered orders */}
                              {order.status === 'delivered' && (
                                <div className="mt-2">
                                  {reviewsLoading ? null : reviewedItems[`${order.id}-${item.product_id}`] ? (
                                    <div className="mt-2 p-3 bg-[#fdfaf8] border border-[#ede5e0] rounded text-xs font-['DM_Sans']">
                                      <div className="flex items-center justify-between">
                                        <span className="text-green-600 font-medium">✓ Review Submitted</span>
                                        <button onClick={() => handleDeleteReview(`${order.id}-${item.product_id}`, reviewedItems[`${order.id}-${item.product_id}`].id)}
                                          className="text-red-400 hover:text-red-600 underline">Delete</button>
                                      </div>
                                      <p className="mt-1 text-[#6b6460]">Rating: {reviewedItems[`${order.id}-${item.product_id}`].rating} ★</p>
                                      {reviewedItems[`${order.id}-${item.product_id}`].comment && (
                                        <p className="text-stone-500 italic mt-0.5">"{reviewedItems[`${order.id}-${item.product_id}`].comment}"</p>
                                      )}
                                    </div>
                                  ) : showReviewFor?.orderId === order.id && showReviewFor?.productId === item.product_id ? (
                                    <ReviewForm
                                      orderId={order.id}
                                      productId={item.product_id}
                                      onDone={(newReview) => {
                                        setReviewedItems(prev => ({ ...prev, [`${order.id}-${item.product_id}`]: newReview }))
                                        setShowReviewFor(null)
                                      }}
                                    />
                                  ) : (
                                    <button
                                      onClick={() => setShowReviewFor({ orderId: order.id, productId: item.product_id })}
                                      className="text-xs text-[#b07060] hover:text-[#1a1715] underline underline-offset-4 transition-all font-['DM_Sans'] mt-1">
                                      Write a Product Review
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          ))
                        )}

                        {['pending', 'processing'].includes(order.status) && (
                          <div className="pt-4">
                            <button onClick={() => handleCancel(order.id)}
                              className="text-xs text-red-500 hover:text-red-700 transition-colors font-['DM_Sans'] tracking-widest uppercase border border-red-200 hover:border-red-500 px-3 py-1.5 rounded">
                              Cancel Entire Order
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* ── Reviews tab ───────────────────────────────────────────────────── */}
        {tab === 'reviews' && (
          <div className="space-y-4">
            {reviewsLoading && <p className="text-sm text-[#aaa] font-['DM_Sans']">Loading reviews...</p>}
            {!reviewsLoading && Object.keys(reviewedItems).length === 0 && (
              <p className="text-sm text-[#6b6460] font-['DM_Sans']">You haven't written any product reviews yet.</p>
            )}
            {!reviewsLoading && Object.entries(reviewedItems).map(([key, r]) => (
              <div key={key} className="p-4 border border-[#ede5e0] rounded bg-white flex justify-between items-start font-['DM_Sans']">
                <div>
                  <h4 className="text-sm font-medium text-[#1a1715]">{r.product_name || `Product (ID: ${key.split('-')[1]})`}</h4>
                  <p className="text-xs text-[#b07060] mt-0.5">Rating: {r.rating} ★</p>
                  {r.comment && <p className="text-sm text-[#6b6460] mt-2 bg-[#fdfaf8] p-2 rounded border border-[#f5ede8] italic">"{r.comment}"</p>}
                </div>
                <button onClick={() => handleDeleteReview(key, r.id)}
                  className="text-xs tracking-widest uppercase text-red-400 hover:text-red-600 font-medium transition-colors">
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── Profile tab ──────────────────────────────────────────────────── */}
        {tab === 'profile' && (
          <form onSubmit={handleProfileSave} className="max-w-md space-y-4">
            <div>
              <label className={labelCls}>Username</label>
              <input value={username} onChange={e => setUsername(e.target.value)} className={inputCls} />
            </div>
            
            <div>
              <label className={labelCls}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputCls} />
              <p className="text-xs text-[#aaa] mt-1 font-['DM_Sans']">Changing your email will require re-verification.</p>
            </div>

            {/* ── REVEAL PASSWORD FIELD ONLY IF EMAIL IS MODIFIED ── */}
            {email.trim().toLowerCase() !== user?.email?.toLowerCase() && (
              <div className="bg-[#fdfaf8] border border-[#ede5e0] p-4 rounded space-y-2 transition-all">
                <label className={labelCls}>Confirm Current Password</label>
                <input 
                  type="password" 
                  value={currentPw} 
                  onChange={e => setCurrentPw(e.target.value)} 
                  placeholder="Required to change email"
                  className={inputCls} 
                />
              </div>
            )}

            {profileMsg && <p className="text-xs text-green-600 font-['DM_Sans']">✓ {profileMsg}</p>}
            {profileErr && <p className="text-xs text-red-500 font-['DM_Sans']">{profileErr}</p>}
            
            <button type="submit"
              className="bg-[#1a1715] text-white px-6 py-2.5 text-xs tracking-widest uppercase hover:bg-[#333] transition-colors rounded font-['DM_Sans']">
              Save Changes
            </button>
          </form>
        )}

        {/* ── Password tab ─────────────────────────────────────────────────── */}
        {tab === 'password' && (
          <form onSubmit={handlePasswordSave} className="max-w-md space-y-4">
            <div>
              <label className={labelCls}>Current Password</label>
              <input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)}
                placeholder="Enter your current password" className={inputCls} />
            </div>
            <div className="border-t border-[#ede5e0] pt-4 space-y-4">
              <div>
                <label className={labelCls}>New Password</label>
                <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)}
                  placeholder="At least 8 characters" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Confirm New Password</label>
                <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} className={inputCls} />
              </div>
            </div>
            {passwordMsg && <p className="text-xs text-green-600 font-['DM_Sans']">✓ {passwordMsg}</p>}
            {passwordErr && <p className="text-xs text-red-500 font-['DM_Sans']">{passwordErr}</p>}
            <button type="submit"
              className="bg-[#1a1715] text-white px-6 py-2.5 text-xs tracking-widest uppercase hover:bg-[#333] transition-colors rounded font-['DM_Sans']">
              Update Password
            </button>
          </form>
        )}
      </div>
    </Layout>
  )
}