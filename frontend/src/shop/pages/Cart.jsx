import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { useCart } from '../context/CartContext'
import { useShopAuth } from '../context/AuthContext'

const SHIPPING_THRESHOLD = 10
const SHIPPING_COST      = 1.5

export default function Cart() {
  const { items, removeItem, updateQuantity, subtotal } = useCart()
  const { user }    = useShopAuth()
  const navigate    = useNavigate()

  const shipping    = subtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_COST
  const total       = subtotal + shipping

  if (items.length === 0) return (
    <Layout>
      <div className="max-w-lg mx-auto px-6 py-32 text-center">
        <h2 className="font-['Cormorant_Garamond'] text-3xl font-light text-[#1a1715] mb-3">Your cart is empty</h2>
        <p className="text-sm text-[#6b6460] mb-8 font-['DM_Sans']">Looks like you haven't added anything yet.</p>
        <button onClick={() => navigate('/')}
          className="bg-[#1a1715] text-white px-8 py-3 text-xs tracking-widest uppercase hover:bg-[#333] transition-colors rounded font-['DM_Sans']">
          Browse Products
        </button>
      </div>
    </Layout>
  )

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="font-['Cormorant_Garamond'] text-3xl font-light text-[#1a1715] mb-8">Shopping Cart</h1>

        <div className="grid md:grid-cols-[1fr_320px] gap-10">
          {/* Items */}
          <div className="space-y-4">
            {items.map(item => (
              <div key={`${item.product_id}-${item.size}`}
                className="flex gap-4 p-4 bg-white border border-[#ede5e0] rounded">
                {/* Image */}
                <div className="w-20 h-28 bg-[#f5ede8] rounded overflow-hidden flex-shrink-0">
                  {item.image
                    ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center">
                        <svg width="30" height="40" viewBox="0 0 30 40">
                          <ellipse cx="15" cy="20" rx="9" ry="14" fill="rgba(196,137,122,0.4)"/>
                        </svg>
                      </div>
                  }
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1a1715] font-['DM_Sans']">{item.name}</p>
                  {item.size && <p className="text-xs text-[#6b6460] mt-0.5 font-['DM_Sans']">Size: {item.size}</p>}
                  <p className="text-sm font-medium text-[#1a1715] mt-1 font-['DM_Sans']">
                    KWD {item.discount
                      ? (item.price * (1 - item.discount / 100)).toFixed(3)
                      : item.price.toFixed(3)}
                  </p>

                  {/* Qty */}
                  <div className="flex items-center gap-2 mt-3">
                    <button onClick={() => updateQuantity(item.product_id, item.size, item.quantity - 1)}
                      className="w-7 h-7 border border-[#ede5e0] rounded text-sm hover:border-[#1a1715] transition-colors font-['DM_Sans']">−</button>
                    <span className="text-sm w-6 text-center font-['DM_Sans']">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.product_id, item.size, item.quantity + 1)}
                      className="w-7 h-7 border border-[#ede5e0] rounded text-sm hover:border-[#1a1715] transition-colors font-['DM_Sans']">+</button>
                  </div>
                </div>

                {/* Remove + line total */}
                <div className="flex flex-col items-end justify-between">
                  <button onClick={() => removeItem(item.product_id, item.size)}
                    className="text-[#aaa] hover:text-red-500 transition-colors text-lg leading-none">×</button>
                  <p className="text-sm font-medium text-[#1a1715] font-['DM_Sans']">
                    KWD {((item.discount ? item.price * (1 - item.discount / 100) : item.price) * item.quantity).toFixed(3)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="bg-white border border-[#ede5e0] rounded p-6 h-fit sticky top-20">
            <h2 className="font-['Cormorant_Garamond'] text-xl font-light text-[#1a1715] mb-5">Order Summary</h2>
            <div className="space-y-3 text-sm font-['DM_Sans']">
              <div className="flex justify-between text-[#6b6460]">
                <span>Subtotal</span><span>KWD {subtotal.toFixed(3)}</span>
              </div>
              <div className="flex justify-between text-[#6b6460]">
                <span>Shipping</span>
                <span>{shipping === 0 ? 'Free' : `KWD ${shipping.toFixed(3)}`}</span>
              </div>
              {shipping > 0 && (
                <p className="text-[11px] text-[#aaa]">Free shipping on orders over KWD {SHIPPING_THRESHOLD}</p>
              )}
              <div className="flex justify-between font-medium text-[#1a1715] pt-3 border-t border-[#ede5e0]">
                <span>Total</span><span>KWD {total.toFixed(3)}</span>
              </div>
            </div>
            <button
              onClick={() => navigate(user ? '/checkout' : '/checkout')}
              className="w-full mt-6 bg-[#1a1715] text-white py-3.5 text-xs tracking-widest uppercase hover:bg-[#333] transition-colors rounded font-['DM_Sans']">
              Proceed to Checkout
            </button>
            <button onClick={() => navigate('/')}
              className="w-full mt-3 text-xs tracking-widest uppercase text-[#6b6460] hover:text-[#1a1715] transition-colors font-['DM_Sans']">
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    </Layout>
  )
}