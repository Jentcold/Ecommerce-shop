import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Layout from '../components/Layout'
import Modal from '../components/Modal'
import StatusBadge from '../components/StatusBadge'
import { getOrders, getOrder, updateStatus } from '../api/orders'
import { useLang } from '../context/LangContext'
import t from '../api/i18n'

const STATUSES = ['', 'pending', 'processing', 'shipped', 'delivered', 'cancelled']

const NEXT_STATUS = {
  pending: 'processing',
  processing: 'shipped',
  shipped: 'delivered',
}

const NEXT_LABEL = {
  pending: 'markProcessing',
  processing: 'markShipped',
  shipped: 'markDelivered',
}

export default function Orders() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [updating, setUpdating] = useState(false)

  const { lang, isAr } = useLang()
  const T = t[lang] || t.en

  const statusFilter = searchParams.get('status') || ''

  const load = () => {
    setLoading(true)

    getOrders(statusFilter || null) 
      .then(r => {
        setOrders(Array.isArray(r?.data) ? r.data : [])
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [statusFilter])

  const openOrder = async (id) => {
    const { data } = await getOrder(id)
    setSelected(data)
  }

  const handleAdvance = async () => {
    if (!selected) return

    const next = NEXT_STATUS[selected.status]
    if (!next) return

    setUpdating(true)

    try {
      const { data } = await updateStatus(selected.id, next)
      setSelected(data)
      load()
    } finally {
      setUpdating(false)
    }
  }

  const handleCancel = async () => {
    if (!selected) return

    if (!confirm(T.confirmCancel)) return

    setUpdating(true)

    try {
      const { data } = await updateStatus(selected.id, 'cancelled')
      setSelected(data)
      load()
    } finally {
      setUpdating(false)
    }
  }

  return (
    <Layout>
      <div className={`flex items-center justify-between mb-6 ${isAr ? 'flex-row-reverse text-right' : ''}`}>
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">
            {T.orders}
          </h1>

          <p className="text-sm text-zinc-500 mt-0.5">
            {orders.length} {statusFilter || T.total}
          </p>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className={`flex gap-1 mb-5 border-b border-zinc-200 ${isAr ? 'flex-row-reverse' : ''}`}>
        {STATUSES.map(s => (
          <button
            key={s}
            onClick={() => setSearchParams(s ? { status: s } : {})}
            className={`px-4 py-2 text-sm capitalize transition-colors border-b-2 -mb-px
              ${
                statusFilter === s
                  ? 'border-zinc-900 text-zinc-900 font-medium'
                  : 'border-transparent text-zinc-400 hover:text-zinc-700'
              }`}
          >
            {s ? T[`status_${s}`] : T.all}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className={`text-xs text-zinc-400 border-b border-zinc-100 bg-zinc-50 ${isAr ? 'text-right' : 'text-left'}`}>
              <th className="px-5 py-3 font-medium">{T.orderId}</th>
              <th className="px-5 py-3 font-medium">{T.address}</th>
              <th className="px-5 py-3 font-medium">{T.phone}</th>
              <th className="px-5 py-3 font-medium">{T.total}</th>
              <th className="px-5 py-3 font-medium">{T.date}</th>
              <th className="px-5 py-3 font-medium">{T.status}</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-zinc-400 text-xs">
                  {T.loading}
                </td>
              </tr>
            )}

            {!loading && orders.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-zinc-400 text-xs">
                  {T.noOrders}
                </td>
              </tr>
            )}

            {orders.map(o => (
              <tr
                key={o.id}
                className="border-b border-zinc-50 hover:bg-zinc-50 transition-colors"
              >
                <td className={`px-5 py-3 font-mono text-zinc-700 ${isAr ? 'text-right' : 'text-left'}`}>
                  #{o.id}
                </td>

                <td className={`px-5 py-3 text-zinc-500 max-w-[160px] truncate ${isAr ? 'text-right' : 'text-left'}`}>
                  {o.shipping_address}
                </td>

                <td className={`px-5 py-3 text-zinc-500 ${isAr ? 'text-right' : 'text-left'}`}>
                  {o.phone || '—'}
                </td>

                <td className={`px-5 py-3 font-medium text-zinc-900 ${isAr ? 'text-right' : 'text-left'}`}>
                  KWD {Number(o.total || 0).toFixed(3)}
                </td>

                <td className={`px-5 py-3 text-zinc-400 text-xs ${isAr ? 'text-right' : 'text-left'}`}>
                  {new Date(o.created_at).toLocaleDateString('en-GB')}
                </td>

                <td className={`px-5 py-3 ${isAr ? 'text-right' : 'text-left'}`}>
                  <StatusBadge
                    status={o.status}
                    label={T[`status_${o.status}`]}
                  />
                </td>

                <td className={`px-5 py-3 ${isAr ? 'text-left' : 'text-right'}`}>
                  <button
                    onClick={() => openOrder(o.id)}
                    className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
                  >
                    {T.view}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Order detail modal */}
      {selected && (
        <Modal
          title={`${T.order} #${selected.id}`}
          onClose={() => setSelected(null)}
        >
          <div className="space-y-4">
            {/* Status + actions */}
            <div className={`flex items-center justify-between ${isAr ? 'flex-row-reverse' : ''}`}>
              <StatusBadge
                status={selected.status}
                label={T[`status_${selected.status}`]}
              />

              <div className={`flex gap-2 ${isAr ? 'flex-row-reverse' : ''}`}>
                {NEXT_STATUS[selected.status] && (
                  <button
                    onClick={handleAdvance}
                    disabled={updating}
                    className="text-xs bg-zinc-900 text-white px-3 py-1.5 rounded hover:bg-zinc-700 transition-colors disabled:opacity-50"
                  >
                    {updating ? '...' : T[NEXT_LABEL[selected.status]]}
                  </button>
                )}

                {['pending', 'processing'].includes(selected.status) && (
                  <button
                    onClick={handleCancel}
                    disabled={updating}
                    className="text-xs border border-red-200 text-red-600 px-3 py-1.5 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    {T.cancelOrder}
                  </button>
                )}
              </div>
            </div>

            {/* Customer info */}
            <div className={`bg-zinc-50 rounded p-3 space-y-1 ${isAr ? 'text-right' : 'text-left'}`}>
              <div className="text-xs text-zinc-500">
                {T.shippingAddress}
              </div>

              <div className="text-sm text-zinc-800">
                {selected.shipping_address}
              </div>

              <div className="text-xs text-zinc-500 mt-1">
                {T.phone}
              </div>

              <div className="text-sm text-zinc-800">
                {selected.phone}
              </div>

              {selected.notes && (
                <>
                  <div className="text-xs text-zinc-500 mt-1">
                    {T.notes}
                  </div>

                  <div className="text-sm text-zinc-800">
                    {selected.notes}
                  </div>
                </>
              )}

              {/* Payment method */}
              <div className="text-xs text-zinc-500 mt-2">Payment Method</div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
                  ${selected.payment_method === 'card' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                  {selected.payment_method === 'card' ? '💳 Card' : '💵 Cash on Delivery'}
                </span>
                {selected.status === 'delivered' && (
                  <span className="text-xs text-green-600 font-medium">
                    {selected.payment_method === 'card' ? '✓ Paid' : '✓ Collected'}
                  </span>
                )}
              </div>
            </div>

            {/* Items */}
            <div>
              <div className={`text-xs text-zinc-500 mb-2 ${isAr ? 'text-right' : 'text-left'}`}>
                {T.items}
              </div>

              <div className="space-y-2">
                {selected.items.map(item => (
                  <div
                    key={item.id}
                    className={`flex justify-between items-center text-sm border border-zinc-100 rounded p-2.5 ${isAr ? 'flex-row-reverse text-right' : ''}`}
                  >
                    <div>
                      <span className="text-zinc-800">
                        {item.product_name || `${T.product} #${item.product_id}`}
                      </span>

                      {item.size && (
                        <span className={`${isAr ? 'mr-2' : 'ml-2'} text-zinc-400 text-xs`}>
                          {T.size}: {item.size}
                        </span>
                      )}

                      <span className={`${isAr ? 'mr-2' : 'ml-2'} text-zinc-400 text-xs`}>
                        × {item.quantity}
                      </span>
                    </div>

                    <div className="font-medium text-zinc-900">
                      KWD {(item.price_at_purchase * item.quantity).toFixed(3)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Receipt */}
            <div className="border border-zinc-100 rounded-lg overflow-hidden">
              <div className="bg-zinc-50 px-4 py-2 border-b border-zinc-100">
                <span className="text-xs font-medium text-zinc-500 tracking-widest uppercase">Receipt</span>
              </div>
              <div className="px-4 py-3 space-y-2 text-sm">
                <div className={`flex justify-between text-zinc-500 text-xs ${isAr ? 'flex-row-reverse' : ''}`}>
                  <span>{T.subtotal}</span>
                  <span>KWD {Number(selected.subtotal).toFixed(3)}</span>
                </div>
                <div className={`flex justify-between text-zinc-500 text-xs ${isAr ? 'flex-row-reverse' : ''}`}>
                  <span>{T.shipping}</span>
                  <span>{selected.shipping === 0 ? T.free : `KWD ${Number(selected.shipping).toFixed(3)}`}</span>
                </div>
                <div className={`flex justify-between font-semibold text-zinc-900 text-sm pt-1 border-t border-zinc-100 ${isAr ? 'flex-row-reverse' : ''}`}>
                  <span>{T.total}</span>
                  <span>KWD {Number(selected.total).toFixed(3)}</span>
                </div>
                <div className={`flex justify-between text-xs pt-1 ${isAr ? 'flex-row-reverse' : ''}`}>
                  <span className="text-zinc-400">Payment</span>
                  <span className={`font-medium ${selected.payment_method === 'card' ? 'text-blue-600' : 'text-green-600'}`}>
                    {selected.payment_method === 'card' ? '💳 Card' : '💵 Cash on Delivery'}
                  </span>
                </div>
                <div className={`flex justify-between text-xs ${isAr ? 'flex-row-reverse' : ''}`}>
                  <span className="text-zinc-400">Order Date</span>
                  <span className="text-zinc-600">
                    {new Date(selected.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </Layout>
  )
}