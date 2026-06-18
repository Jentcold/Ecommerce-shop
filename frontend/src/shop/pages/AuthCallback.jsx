// src/shop/pages/AuthCallback.jsx
import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getMe } from '../api/auth'
import { useShopAuth } from '../context/AuthContext'

export default function AuthCallback() {
  const [searchParams] = useSearchParams()
  const { signIn }     = useShopAuth()
  const navigate       = useNavigate()

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) { navigate('/'); return }

    localStorage.setItem('shop_token', token)
    getMe()
      .then(res => {
        signIn(token, res.data)
        navigate('/')
      })
      .catch(() => {
        localStorage.removeItem('shop_token')
        navigate('/')
      })
  }, [])

  return (
    <div className="min-h-screen bg-[#fdfaf8] flex items-center justify-center">
      <p className="text-sm text-[#6b6460] font-['DM_Sans']">Signing you in...</p>
    </div>
  )
}