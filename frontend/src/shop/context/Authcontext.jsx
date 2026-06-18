import { createContext, useContext, useState, useEffect } from 'react'
import { getMe } from '../api/auth'

const AuthContext = createContext(null)

export function ShopAuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('shop_token')
    if (!token) { setLoading(false); return }
    getMe()
      .then(res => setUser(res.data))
      .catch(() => localStorage.removeItem('shop_token'))
      .finally(() => setLoading(false))
  }, [])

  const signIn = (token, userData) => {
    localStorage.setItem('shop_token', token)
    setUser(userData)
  }

  const signOut = () => {
    localStorage.removeItem('shop_token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useShopAuth = () => useContext(AuthContext)