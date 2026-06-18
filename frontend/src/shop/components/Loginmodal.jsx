import { useState, useEffect } from 'react'
import { login, register, getMe } from '../api/auth'
import { useShopAuth } from '../context/AuthContext'

export default function LoginModal({ onClose, onSuccess }) {
  const [tab, setTab]           = useState('login')
  const [email, setEmail]       = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const { signIn }              = useShopAuth()

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      let token
      if (tab === 'login') {
        const { data } = await login(email, password)
        token = data.access_token
      } else {
        const { data } = await register(username, email, password)
        token = data.access_token
      }
      localStorage.setItem('shop_token', token)
      const me = await getMe()
      signIn(token, me.data)
      onSuccess?.()
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-sm rounded-lg shadow-2xl overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-stone-100">
          {['login', 'register'].map(t => (
            <button key={t} onClick={() => { setTab(t); setError('') }}
              className={`flex-1 py-4 text-sm tracking-widest uppercase transition-colors
                ${tab === t ? 'text-stone-900 border-b-2 border-stone-900' : 'text-stone-400 hover:text-stone-600'}`}>
              {t === 'login' ? 'Sign In' : 'Register'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-4">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</div>
          )}

          {tab === 'register' && (
            <div>
              <label className="block text-xs tracking-widest uppercase text-stone-400 mb-2">Username</label>
              <input value={username} onChange={e => setUsername(e.target.value)} required
                className="w-full border border-stone-200 rounded px-3 py-2.5 text-sm outline-none focus:border-stone-400 transition-colors font-['DM_Sans']" />
            </div>
          )}

          <div>
            <label className="block text-xs tracking-widest uppercase text-stone-400 mb-2">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full border border-stone-200 rounded px-3 py-2.5 text-sm outline-none focus:border-stone-400 transition-colors font-['DM_Sans']" />
          </div>

          <div>
            <label className="block text-xs tracking-widest uppercase text-stone-400 mb-2">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              className="w-full border border-stone-200 rounded px-3 py-2.5 text-sm outline-none focus:border-stone-400 transition-colors font-['DM_Sans']" />
          </div>
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-stone-100" /></div>
            <div className="relative text-center">
              <span className="bg-white px-3 text-xs text-stone-400 font-['DM_Sans']">or</span>
            </div>
          </div>

          <a href={`${import.meta.env.VITE_BACKEND_URL}/auth/google`}
            className="flex items-center justify-center gap-3 w-full border border-stone-200 rounded py-2.5 text-sm text-stone-600 hover:bg-stone-50 transition-colors font-['DM_Sans']">
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </a>
          <button type="submit" disabled={loading}
            className="w-full bg-stone-900 text-white py-3 text-sm tracking-widest uppercase hover:bg-stone-700 transition-colors disabled:opacity-50 rounded mt-2">
            {loading ? '...' : tab === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  )
}