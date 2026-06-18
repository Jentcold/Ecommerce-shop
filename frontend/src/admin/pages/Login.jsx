import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login, getMe } from '../api/auth'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const { signIn }              = useAuth()
  const navigate                = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await login(email, password)
      localStorage.setItem('token', data.access_token)
      const me = await getMe()
      if (!me.data.is_admin) {
        localStorage.removeItem('token')
        setError('Access denied — admin accounts only')
        return
      }
      signIn(data.access_token, me.data)
      navigate('/admin')
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-white tracking-wide">Hadeel Aljazeeraa</h1>
          <p className="text-zinc-400 text-sm mt-1">Admin Dashboard</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-zinc-800 rounded-lg p-6 space-y-4">
          {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-3 py-2 rounded">{error}</div>}
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full bg-zinc-700 border border-zinc-600 text-zinc-100 text-sm rounded px-3 py-2.5 outline-none focus:border-zinc-400 transition-colors"
              placeholder="admin@Hadeel Aljazeeraa.com" />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              className="w-full bg-zinc-700 border border-zinc-600 text-zinc-100 text-sm rounded px-3 py-2.5 outline-none focus:border-zinc-400 transition-colors"
              placeholder="••••••••" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-white text-zinc-900 text-sm font-medium py-2.5 rounded hover:bg-zinc-100 transition-colors disabled:opacity-50 mt-2">
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}