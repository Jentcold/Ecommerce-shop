import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import LoginModal from '../components/LoginModal'
import { useCart } from '../context/CartContext'
import { useShopAuth } from '../context/AuthContext'
import { initiatePayment } from '../api/orders'

const SHIPPING_THRESHOLD = 10
const SHIPPING_COST      = 1.5

const GOVERNORATES = [
  'Al Asimah', 'Hawalli', 'Farwaniya', 'Mubarak Al-Kabeer', 'Ahmadi', 'Jahra'
]

const inputClass = (errors, k) =>
  `w-full border rounded px-3 py-2.5 text-sm outline-none transition-colors font-['DM_Sans'] bg-white
  ${errors[k] ? 'border-red-300 focus:border-red-500' : 'border-[#ede5e0] focus:border-[#1a1715]'}`

function Field({ label, k, errors, optional = false, children }) {
  return (
    <div data-error={!!errors[k]}>
      <label className={`block text-xs tracking-widest uppercase mb-2 font-['DM_Sans'] ${errors[k] ? 'text-red-500' : 'text-[#6b6460]'}`}>
        {label}{!optional && <span className="text-red-400 ml-0.5">*</span>}
        {optional && <span className="text-[#aaa] ml-1 normal-case tracking-normal">(optional)</span>}
      </label>
      {children}
      {errors[k] && <p className="text-xs text-red-500 mt-1 font-['DM_Sans']">{errors[k]}</p>}
    </div>
  )
}

export default function Checkout() {
  const { items, subtotal, clearCart } = useCart()
  const { user }    = useShopAuth()
  const navigate    = useNavigate()

  const [form, setForm] = useState({
    governorate: '', block: '', street: '', building: '', phone: '', notes: '',
  })
  const [errors, setErrors]           = useState({})
  const [loading, setLoading]         = useState(false)
  const [serverError, setServerError] = useState('')
  const [showLogin, setShowLogin]     = useState(false)

  const shipping = subtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_COST
  const total    = subtotal + shipping
  const set      = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })) }

  const validate = () => {
    const newErrors = {}
    if (!form.governorate)                                newErrors.governorate = 'Please select an area'
    if (!form.block.trim())                               newErrors.block       = 'Block is required'
    if (!form.street.trim())                              newErrors.street      = 'Street is required'
    if (!form.building.trim())                            newErrors.building     = 'Building / house number is required'
    if (!form.phone.trim())                               newErrors.phone       = 'Phone number is required'
    else if (!/^\d{8}$/.test(form.phone.trim()))          newErrors.phone       = 'Enter a valid 8-digit phone number'
    return newErrors
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!user) { setShowLogin(true); return }
    if (items.length === 0) return

    const validationErrors = validate()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      const firstError = document.querySelector('[data-error="true"]')
      firstError?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    setLoading(true)
    setServerError('')

    const fullAddress = `${form.governorate}, Block ${form.block}, Street ${form.street}, Building ${form.building}`
    // Force format string with +965 structure for strict system router handling definitions
    const formattedPhone = `+965 ${form.phone.trim()}`

    try {
      const response = await initiatePayment({
        items: items.map(i => ({
          product_id: i.product_id,
          quantity:   i.quantity,
          size:       i.size,
        })),
        shipping_address: fullAddress,
        phone:            formattedPhone,
        notes:            form.notes.trim() || null,
      })

      if (response.data?.payment_url) {
        window.location.href = response.data.payment_url
      } else {
        setServerError('Could not get payment link. Please try again.')
      }
    } catch (err) {
      setServerError(err.response?.data?.detail || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (items.length === 0) { navigate('/'); return null }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="font-['Cormorant_Garamond'] text-3xl font-light text-[#1a1715] mb-8">Checkout</h1>

        {!user && (
          <div className="bg-[#f5ede8] border border-[#e8d5cc] rounded p-4 mb-6 flex items-center justify-between">
            <p className="text-sm text-[#6b6460] font-['DM_Sans']">Sign in to complete your order</p>
            <button onClick={() => setShowLogin(true)}
              className="text-xs tracking-widest uppercase text-[#1a1715] font-medium hover:text-[#b07060] transition-colors font-['DM_Sans']">
              Sign In
            </button>
          </div>
        )}

        {serverError && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded mb-6 font-['DM_Sans']">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="grid md:grid-cols-[1fr_320px] gap-10">
            <div className="space-y-6">

              {/* Shipping */}
              <div>
                <h2 className="font-['Cormorant_Garamond'] text-xl font-light text-[#1a1715] mb-4 pb-3 border-b border-[#ede5e0]">
                  Shipping Address
                </h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Area / Governorate" k="governorate" errors={errors}>
                      <select value={form.governorate} onChange={e => set('governorate', e.target.value)}
                        className={inputClass(errors, 'governorate') + ' text-[#1a1715]'}>
                        <option value="">Select area...</option>
                        {GOVERNORATES.map(g => <option key={g}>{g}</option>)}
                      </select>
                    </Field>
                    <Field label="Block" k="block" errors={errors}>
                      <input value={form.block} onChange={e => set('block', e.target.value)}
                        placeholder="e.g. 3" className={inputClass(errors, 'block')} />
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Street" k="street" errors={errors}>
                      <input value={form.street} onChange={e => set('street', e.target.value)}
                        placeholder="Street name or number" className={inputClass(errors, 'street')} />
                    </Field>
                    <Field label="Building / House No." k="building" errors={errors}>
                      <input value={form.building} onChange={e => set('building', e.target.value)}
                        placeholder="Building or house no." className={inputClass(errors, 'building')} />
                    </Field>
                  </div>
                  <Field label="Phone" k="phone" errors={errors}>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-sm text-[#6b6460] font-['DM_Sans'] select-none pointer-events-none">
                        +965
                      </span>
                      <input type="tel" value={form.phone} 
                        onChange={e => set('phone', e.target.value.replace(/\D/g, ''))}
                        maxLength={8}
                        placeholder="XXXXXXXX" 
                        className={inputClass(errors, 'phone') + ' !pl-16'} />
                    </div>
                  </Field>
                  <Field label="Notes" k="notes" errors={errors} optional>
                    <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
                      rows={2} placeholder="Apartment number, delivery instructions..."
                      className={inputClass(errors, 'notes') + ' resize-none'} />
                  </Field>
                </div>
              </div>

              {/* Payment info */}
              <div>
                <h2 className="font-['Cormorant_Garamond'] text-xl font-light text-[#1a1715] mb-4 pb-3 border-b border-[#ede5e0]">
                  Payment
                </h2>
                <div className="p-4 border border-[#ede5e0] rounded flex items-start gap-3 bg-[#f5ede8]">
                  <span className="text-lg">💳</span>
                  <div>
                    <div className="text-sm font-medium text-[#1a1715] font-['DM_Sans']">Secure Online Payment</div>
                    <div className="text-xs text-[#6b6460] mt-1 font-['DM_Sans']">
                      Pay via KNET, Visa, or Mastercard. You'll be redirected to complete your payment securely.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Order summary */}
            <div className="bg-white border border-[#ede5e0] rounded p-6 h-fit sticky top-20">
              <h2 className="font-['Cormorant_Garamond'] text-xl font-light text-[#1a1715] mb-4">Your Order</h2>
              <div className="space-y-3 mb-4">
                {items.map(item => (
                  <div key={`${item.product_id}-${item.size}`} className="flex justify-between text-sm font-['DM_Sans']">
                    <div>
                      <p className="text-[#1a1715]">{item.name}</p>
                      <p className="text-xs text-[#aaa]">{item.size && `Size ${item.size} · `}× {item.quantity}</p>
                    </div>
                    <p className="text-[#1a1715] font-medium">
                      KWD {((item.discount ? item.price * (1 - item.discount / 100) : item.price) * item.quantity).toFixed(3)}
                    </p>
                  </div>
                ))}
              </div>
              <div className="border-t border-[#ede5e0] pt-3 space-y-2 text-sm font-['DM_Sans']">
                <div className="flex justify-between text-[#6b6460]">
                  <span>Subtotal</span><span>KWD {subtotal.toFixed(3)}</span>
                </div>
                <div className="flex justify-between text-[#6b6460]">
                  <span>Shipping</span><span>{shipping === 0 ? 'Free' : `KWD ${shipping.toFixed(3)}`}</span>
                </div>
                <div className="flex justify-between font-medium text-[#1a1715] pt-2 border-t border-[#ede5e0]">
                  <span>Total</span><span>KWD {total.toFixed(3)}</span>
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full mt-5 bg-[#1a1715] text-white py-3.5 text-xs tracking-widest uppercase hover:bg-[#333] transition-colors disabled:opacity-50 rounded font-['DM_Sans']">
                {loading ? 'Redirecting to Payment...' : `Pay KWD ${total.toFixed(3)} →`}
              </button>
              <p className="text-center text-[11px] text-[#aaa] mt-3 font-['DM_Sans']">
                All fields marked * are required
              </p>
            </div>
          </div>
        </form>
      </div>

      {showLogin && (
        <LoginModal onClose={() => setShowLogin(false)} onSuccess={() => {}} />
      )}
    </Layout>
  )
}