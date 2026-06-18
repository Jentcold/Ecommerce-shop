import { useEffect, useState } from 'react'
import { getOrders } from '../api/orders'
import { getProducts } from '../api/products'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import StatusBadge from '../components/StatusBadge'
import { useLang } from '../context/LangContext'
import t from '../api/i18n'

const STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled']

function StatCard({ label, value, sub, isAr }) {
  return (
    <div className={`bg-white rounded-lg border border-zinc-200 p-5 ${isAr ? 'text-right' : 'text-left'}`}>
      <div className="text-xs text-zinc-500 mb-1">{label}</div>
      <div className="text-2xl font-semibold text-zinc-900">{value}</div>
      {sub && <div className="text-xs text-zinc-400 mt-1">{sub}</div>}
    </div>
  )
}

export default function Dashboard() {
  const [orders, setOrders]     = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading]   = useState(true)
  const { lang, isAr }          = useLang()
  const T                       = t[lang] || t.en

  useEffect(() => {
    Promise.all([getOrders(), getProducts()])
      .then(([o, p]) => { setOrders(o.data || []); setProducts(p.data || []) })
      .catch(() => { setOrders([]); setProducts([]) })
      .finally(() => setLoading(false))
  }, [])

  const revenue      = orders.filter(o => o.status !== 'cancelled' && o.status !== 'pending').reduce((s, o) => s + (Number(o.total) || 0), 0)
  const pendingCount = orders.filter(o => o.status === 'pending').length  // unpaid orders
  const activeCount  = products.filter(p => p.is_active).length
  const recent       = [...orders].slice(0, 5)

  const statusCounts = STATUSES.reduce((acc, s) => {
    acc[s] = orders.filter(o => o.status === s).length
    return acc
  }, {})

  if (loading) return <Layout><div className={`text-zinc-400 text-sm ${isAr ? 'text-right' : ''}`}>{T.loading}</div></Layout>

  return (
    <Layout>
      <div className={`mb-6 ${isAr ? 'text-right' : ''}`}>
        <h1 className="text-xl font-semibold text-zinc-900">{T.dashboard}</h1>
        <p className="text-sm text-zinc-500 mt-0.5">{T.welcomeBack}</p>
      </div>

      {/* Stat cards */}
      <div className={`grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 ${isAr ? 'direction-rtl' : ''}`}>
        <StatCard
          label={T.totalRevenue}
          value={`KWD ${revenue.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`}
          sub={T.excludingCancelled}
          isAr={isAr}
        />
        <StatCard
          label={T.totalOrders}
          value={orders.length}
          sub={`${pendingCount} ${T.pending}`}
          isAr={isAr}
        />
        <StatCard
          label={T.productsLabel}
          value={products.length}
          sub={`${activeCount} ${T.active}`}
          isAr={isAr}
        />
        <StatCard
          label={T.lowStock}
          value={products.filter(p => p.stock <= 5).length}
          sub={T.unitsLeft}
          isAr={isAr}
        />
      </div>

      {/* Order status breakdown */}
      <div className={`grid grid-cols-2 lg:grid-cols-5 gap-3 mb-8 ${isAr ? 'flex-row-reverse' : ''}`}>
        {STATUSES.map(s => (
          <Link key={s} to={`/admin/orders?status=${s}`}
            className={`bg-white border border-zinc-200 rounded-lg p-4 hover:border-zinc-300 transition-colors ${isAr ? 'text-right' : 'text-left'}`}>
            <div className="text-lg font-semibold text-zinc-900">{statusCounts[s]}</div>
            <StatusBadge status={s} label={T[`status_${s}`]} />
          </Link>
        ))}
      </div>

      {/* Recent orders */}
      <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
        
        {/* FIXED: Forcing dynamic structural direction string layout */}
        <div 
          className="flex items-center justify-between px-5 py-4 border-b border-zinc-100"
          dir={isAr ? "rtl" : "ltr"}
        >
          <h2 className="text-sm font-semibold text-zinc-800">
            {T.recentOrders}
          </h2>
          <Link to="/admin/orders" className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors">
            {T.viewAll}
          </Link>
        </div>
        
        <table className="w-full text-sm">
          <thead>
            <tr className={`text-xs text-zinc-400 border-b border-zinc-100 bg-zinc-50 ${isAr ? 'text-right' : 'text-left'}`}>
              <th className="px-5 py-3 font-medium">{T.order}</th>
              <th className="px-5 py-3 font-medium">{T.address}</th>
              <th className="px-5 py-3 font-medium">{T.total}</th>
              <th className="px-5 py-3 font-medium">{T.status}</th>
            </tr>
          </thead>
          <tbody>
            {recent.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-zinc-400 text-xs">
                  {T.noOrders}
                </td>
              </tr>
            )}
            {recent.map(order => (
              <tr key={order.id} className="border-b border-zinc-50 hover:bg-zinc-50 transition-colors">
                <td className={`px-5 py-3 font-mono text-zinc-700 ${isAr ? 'text-right' : 'text-left'}`}>
                  #{order.id}
                </td>
                <td className={`px-5 py-3 text-zinc-500 max-w-[180px] truncate ${isAr ? 'text-right' : 'text-left'}`}>
                  {order.shipping_address}
                </td>
                <td className={`px-5 py-3 font-medium text-zinc-900 ${isAr ? 'text-right' : 'text-left'}`}>
                  KWD {Number(order.total || 0).toFixed(3)}
                </td>
                <td className={`px-5 py-3 ${isAr ? 'text-right' : 'text-left'}`}>
                  <StatusBadge status={order.status} label={T[`status_${order.status}`]} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  )
}