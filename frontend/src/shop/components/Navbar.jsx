import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useShopAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import LoginModal from './LoginModal'

export default function Navbar() {
  const { user, signOut }         = useShopAuth()
  const { count }                 = useCart()
  const [showLogin, setShowLogin] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const navigate                  = useNavigate()

  const handleSignOut = () => {
    setSigningOut(true)
    setTimeout(() => {
      signOut()
      setSigningOut(false)
      navigate('/')
    }, 600)
  }

  return (
    <>
      <nav className="sticky top-0 z-40 bg-[#fdfaf8] border-b border-[#ede5e0] px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="font-['Cormorant_Garamond'] text-xl font-light tracking-widest text-[#1a1715]">
          Hadeel Aljazeeraa
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-5">
          {user ? (
            <div className="flex items-center gap-5">
              {/* Logged in indicator */}
              <div className="hidden md:flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <span className="text-xs text-[#6b6460] font-['DM_Sans'] max-w-[140px] truncate">
                  {user.username || user.email}
                </span>
              </div>

              <Link to="/account"
                className="text-xs tracking-widest uppercase text-[#6b6460] hover:text-[#1a1715] transition-colors font-['DM_Sans']">
                Account
              </Link>

              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="text-xs tracking-widest uppercase text-[#6b6460] hover:text-red-500 transition-colors font-['DM_Sans'] disabled:opacity-50">
                {signingOut ? 'Signing out...' : 'Sign Out'}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowLogin(true)}
              className="text-xs tracking-widest uppercase text-[#6b6460] hover:text-[#1a1715] transition-colors font-['DM_Sans']">
              Sign In
            </button>
          )}

          {/* Cart */}
          <Link to="/cart" className="relative">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1a1715" strokeWidth="1.5">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 01-8 0"/>
            </svg>
            {count > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-[#b07060] text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-['DM_Sans']">
                {count}
              </span>
            )}
          </Link>
        </div>
      </nav>

      {showLogin && (
        <LoginModal
          onClose={() => setShowLogin(false)}
          onSuccess={() => setShowLogin(false)}
        />
      )}
    </>
  )
}