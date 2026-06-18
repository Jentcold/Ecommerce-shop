import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { useLang } from '../context/LangContext'
import t from '../api/i18n'
import client from '../api/client'

export default function Settings() {
  const { lang, isAr } = useLang()
  const T = t[lang]
  const [saleActive, setSaleActive] = useState(false)
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [msg, setMsg]               = useState('')

  useEffect(() => {
    client.get('/admin/settings/')
      .then(r => setSaleActive(r.data?.sale_active === 'true'))
      .catch(err => console.error("Error loading administration settings profile:", err))
      .finally(() => setLoading(false))
  }, [])

  const toggleSale = async () => {
    setSaving(true)
    const nextValue = !saleActive
    try {
      // Run the network operation before confirming state commits
      await client.patch(`/admin/settings/sale_active?value=${nextValue}`)
      setSaleActive(nextValue)
      
      setMsg(
        nextValue 
          ? (lang === 'ar' ? 'قسم التخفيضات نشط الآن في المتجر.' : 'Sale section is now active on the shop.') 
          : (lang === 'ar' ? 'تم إخفاء قسم التخفيضات.' : 'Sale section is now hidden.')
      )
      setTimeout(() => setMsg(''), 3000)
    } catch (err) {
      console.error("Failed to commit settings configuration patch update:", err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Layout>
      <div className={`mb-6 ${isAr ? 'text-right' : ''}`}>
        <h1 className="text-xl font-semibold text-zinc-900">
          {lang === 'ar' ? 'الإعدادات' : 'Settings'}
        </h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          {lang === 'ar' ? 'إدارة إعدادات المتجر' : 'Manage shop settings'}
        </p>
      </div>

      {loading ? (
        <div className="text-zinc-400 text-sm">{T.loading}</div>
      ) : (
        <div className="max-w-lg space-y-4">
          {/* Sale toggle */}
          <div className="bg-white border border-zinc-200 rounded-lg p-5">
            <div className={`flex items-center justify-between ${isAr ? 'flex-row-reverse' : ''}`}>
              <div className={isAr ? 'text-right' : ''}>
                <h3 className="text-sm font-semibold text-zinc-900">
                  {lang === 'ar' ? 'قسم التخفيضات' : 'Sale Section'}
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {lang === 'ar'
                    ? 'تفعيل أو إيقاف قسم العروض في الصفحة الرئيسية'
                    : 'Show or hide the sale section on the shop homepage'}
                </p>
              </div>
              <button
                onClick={toggleSale}
                disabled={saving}
                className={`relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50
                  ${saleActive ? 'bg-[#b07060]' : 'bg-zinc-300'}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200
                  ${saleActive ? (isAr ? '-translate-x-6' : 'translate-x-6') : 'translate-x-0.5'}`} />
              </button>
            </div>
            
            <div className={`mt-3 flex items-center gap-2 ${isAr ? 'flex-row-reverse' : ''}`}>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                ${saleActive ? 'bg-green-100 text-green-800' : 'bg-zinc-100 text-zinc-500'}`}>
                {saleActive
                  ? (lang === 'ar' ? 'نشط' : 'Active')
                  : (lang === 'ar' ? 'مخفي' : 'Hidden')}
              </span>
              {msg && <span className="text-xs text-zinc-500 font-['DM_Sans']">{msg}</span>}
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}