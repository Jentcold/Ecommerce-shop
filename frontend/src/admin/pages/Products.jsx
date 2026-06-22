import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import Modal from '../components/Modal'
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleActive,
  toggleFeatured,
  getSections,
  getCategories,
  uploadImages
} from '../api/products'

import { useLang } from '../context/LangContext'
import t from '../api/i18n'

const EMPTY_FORM = {
  name: '',
  description: '',
  section: '',
  category: '',
  customSection: '',
  customCategory: '',
  brand: '',
  price: '',
  stock: '',
  discount: '',
  is_active: true,
  is_featured: false,
  image_urls: '',
  sizes: [], 
}

const PRESET_SIZES = ['S', 'M', 'L', 'XL', 'XXL']


function PickOrCreateField({ value, onChange, options, T, placeholderSelect, placeholderAdd, placeholderType, disabled }) {
  const isCustom =
    value === '__custom__' || (value && !options.includes(value))

  const [showCustom, setShowCustom] = useState(isCustom)
  const [customVal, setCustomVal] = useState(isCustom ? value : '')

  useEffect(() => {
    if (!disabled) return
    setShowCustom(false)
    setCustomVal('')
  }, [disabled])

  const handleSelect = (e) => {
    if (e.target.value === '__custom__') {
      setShowCustom(true)
      onChange('')
    } else {
      setShowCustom(false)
      setCustomVal('')
      onChange(e.target.value)
    }
  }

  const handleCustom = (e) => {
    setCustomVal(e.target.value)
    onChange(e.target.value)
  }

  return (
    <div className="space-y-2">
      <select
        value={showCustom ? '__custom__' : value}
        onChange={handleSelect}
        required={!showCustom}
        disabled={disabled}
        className="w-full border border-zinc-200 rounded px-3 py-2 text-sm outline-none focus:border-zinc-400 bg-white disabled:bg-zinc-50 disabled:text-zinc-400"
      >
        <option value="">{placeholderSelect}</option>

        {options.map(c => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}

        <option value="__custom__">
          + {placeholderAdd}
        </option>
      </select>

      {showCustom && !disabled && (
        <input
          autoFocus
          required
          value={customVal}
          onChange={handleCustom}
          placeholder={placeholderType}
          className="w-full border border-zinc-200 rounded px-3 py-2 text-sm outline-none focus:border-zinc-400 border-dashed"
        />
      )}
    </div>
  )
}

function ProductForm({
  initial = EMPTY_FORM,
  onSave,
  onCancel,
  saving,
  sections,
  T,
  isAr
}) {
  const [form, setForm] = useState(initial)
  const [sectionCategories, setSectionCategories] = useState([])
  const [loadingCategories, setLoadingCategories] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [customSizeInput, setCustomSizeInput] = useState('')
  const [previewUrls, setPreviewUrls] = useState(
    initial.image_urls ? initial.image_urls.split('\n').map(u => u.trim()).filter(Boolean) : []
  )

  const set = (k, v) =>
    setForm(f => ({ ...f, [k]: v }))
  useEffect(() => {
    if (!form.section) {
      setSectionCategories([])
      return
    }
    setLoadingCategories(true)
    getCategories(form.section)
      .then(r => setSectionCategories(Array.isArray(r?.data) ? r.data : []))
      .catch(() => setSectionCategories([]))
      .finally(() => setLoadingCategories(false))
  }, [form.section])

  const handleSectionChange = (newSection) => {
    setForm(f => ({ ...f, section: newSection, category: f.section === newSection ? f.category : '' }))
  }

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return

    setUploading(true)
    setUploadError('')

    try {
      const urls = await uploadImages(files)
      const newUrls = [...previewUrls, ...urls]
      setPreviewUrls(newUrls)
      set('image_urls', newUrls.join('\n'))
    } catch (err) {
      setUploadError(err.message || 'Upload failed')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const removeImage = (urlToRemove) => {
    const newUrls = previewUrls.filter(u => u !== urlToRemove)
    setPreviewUrls(newUrls)
    set('image_urls', newUrls.join('\n'))
  }

  const toggleSizePreset = (size) => {
    const currentSizes = form.sizes || []
    if (currentSizes.includes(size)) {
      set('sizes', currentSizes.filter(s => s !== size))
    } else {
      set('sizes', [...currentSizes, size])
    }
  }

  const addCustomSize = (e) => {
    e.preventDefault()
    const trimmed = customSizeInput.trim()
    if (!trimmed) return

    const currentSizes = form.sizes || []
    if (!currentSizes.includes(trimmed)) {
      set('sizes', [...currentSizes, trimmed])
    }
    setCustomSizeInput('')
  }

  const removeSizeToken = (sizeToRemove) => {
    set('sizes', (form.sizes || []).filter(s => s !== sizeToRemove))
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    if (!form.section) {
      alert(T.selectSectionFirst)
      return
    }
    if (!form.category) {
      alert(T.selectCategory)
      return
    }

    onSave({
      ...form,
      price: parseFloat(form.price),
      stock: parseInt(form.stock),
      discount: form.discount ? parseFloat(form.discount) : null,
      image_urls: previewUrls,
      sizes: form.sizes || [],
    })
  }

  const getFullUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  const baseUrl = import.meta.env.VITE_BACKEND_URL ;

  return `${baseUrl}${url}`;
};

  return (
    <form
      onSubmit={handleSubmit}
      className={`space-y-4 ${isAr ? 'text-right' : ''}`}
    >
      <div>
        <label className="block text-xs text-zinc-500 mb-1">
          {T.name} *
        </label>
        <input
          required
          value={form.name}
          onChange={e => set('name', e.target.value)}
          className="w-full border border-zinc-200 rounded px-3 py-2 text-sm outline-none focus:border-zinc-400"
        />
      </div>

      {/* ─── Section then Category, side by side (flips order in Arabic) ─── */}
      <div className={`flex gap-3 ${isAr ? 'flex-row-reverse' : ''}`}>
        <div className="flex-1">
          <label className="block text-xs text-zinc-500 mb-1">
            {T.sectionField} *
          </label>
          <PickOrCreateField
            value={form.section}
            onChange={handleSectionChange}
            options={sections}
            T={T}
            placeholderSelect={T.selectSection}
            placeholderAdd={T.addNewSection}
            placeholderType={T.typeSection}
          />
        </div>

        <div className="flex-1">
          <label className="block text-xs text-zinc-500 mb-1">
            {T.categoryField} * {loadingCategories && <span className="text-zinc-300">({T.loading})</span>}
          </label>
          <PickOrCreateField
            value={form.category}
            onChange={v => set('category', v)}
            options={sectionCategories}
            T={T}
            placeholderSelect={form.section ? T.selectCategory : T.selectSectionFirst}
            placeholderAdd={T.addNewCategory}
            placeholderType={T.typeCategory}
            disabled={!form.section}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-zinc-500 mb-1">
          {T.description} *
        </label>
        <textarea
          required
          rows={3}
          value={form.description}
          onChange={e => set('description', e.target.value)}
          className="w-full border border-zinc-200 rounded px-3 py-2 text-sm outline-none focus:border-zinc-400 resize-none"
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-zinc-500 mb-1">
            {T.price} (KWD) *
          </label>
          <input
            required
            type="number"
            min="0"
            step="0.001"
            value={form.price}
            onChange={e => set('price', e.target.value)}
            className="w-full border border-zinc-200 rounded px-3 py-2 text-sm outline-none focus:border-zinc-400"
          />
        </div>

        <div>
          <label className="block text-xs text-zinc-500 mb-1">
            {T.stock} *
          </label>
          <input
            required
            type="number"
            min="0"
            value={form.stock}
            onChange={e => set('stock', e.target.value)}
            className="w-full border border-zinc-200 rounded px-3 py-2 text-sm outline-none focus:border-zinc-400"
          />
        </div>

        <div>
          <label className="block text-xs text-zinc-500 mb-1">
            {T.discount} %
          </label>
          <input
            type="number"
            min="0"
            max="100"
            value={form.discount}
            onChange={e => set('discount', e.target.value)}
            className="w-full border border-zinc-200 rounded px-3 py-2 text-sm outline-none focus:border-zinc-400"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-zinc-500 mb-1">
          {T.brandField}
        </label>
        <input
          value={form.brand}
          onChange={e => set('brand', e.target.value)}
          className="w-full border border-zinc-200 rounded px-3 py-2 text-sm outline-none focus:border-zinc-400"
        />
      </div>

      {/* ─── SIZE VARIANT CONFIGURATION GROUP BOX ─── */}
      <div className="border border-zinc-100 bg-zinc-50/50 rounded p-3 space-y-3">
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1.5">
            {isAr ? 'المقاسات المتاحة' : 'Available Sizes'}
          </label>
          <div className={`flex flex-wrap gap-1.5 ${isAr ? 'flex-row-reverse' : ''}`}>
            {PRESET_SIZES.map((size) => {
              const isSelected = (form.sizes || []).includes(size)
              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => toggleSizePreset(size)}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors border ${
                    isSelected
                      ? 'bg-zinc-900 text-white border-zinc-900'
                      : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300'
                  }`}
                >
                  {size}
                </button>
              )
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs text-zinc-400">
            {isAr ? 'إضافة مقاس مخصص (مثال: 42، 10 مل)' : 'Add Custom Variant Size (e.g., 42, 10ml)'}
          </label>
          <div className={`flex gap-2 ${isAr ? 'flex-row-reverse' : ''}`}>
            <input
              type="text"
              value={customSizeInput}
              onChange={(e) => setCustomSizeInput(e.target.value)}
              placeholder={isAr ? 'مقاس مخصص...' : 'Custom token...'}
              className="flex-1 max-w-[200px] border border-zinc-200 rounded px-2.5 py-1 text-xs outline-none focus:border-zinc-400 bg-white"
            />
            <button
              type="button"
              onClick={addCustomSize}
              className="bg-zinc-200 hover:bg-zinc-300 text-zinc-700 text-xs px-3 py-1 rounded transition-colors font-medium"
            >
              {isAr ? 'إضافة' : 'Add'}
            </button>
          </div>
        </div>

        {(form.sizes || []).length > 0 && (
          <div className={`flex flex-wrap gap-1 pt-1 ${isAr ? 'flex-row-reverse' : ''}`}>
            {(form.sizes || []).map((size) => (
              <span
                key={size}
                className="inline-flex items-center gap-1 bg-zinc-200/60 text-zinc-800 text-xs px-2 py-0.5 rounded border border-zinc-200/40"
              >
                {size}
                <button
                  type="button"
                  onClick={() => removeSizeToken(size)}
                  className="text-zinc-400 hover:text-red-600 text-[10px] font-bold"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="block text-xs text-zinc-500 mb-2">
          {T.imageUrls || 'Product Images'}
        </label>

        {previewUrls.length > 0 && (
          <div className={`flex flex-wrap gap-2 mb-3 ${isAr ? 'flex-row-reverse' : ''}`}>
            {previewUrls.map((url, i) => (
              <div key={i} className="relative group">
                <img
                  src={getFullUrl(url)}
                  alt={`Product image ${i + 1}`}
                  className="w-20 h-24 object-cover rounded border border-zinc-200"
                  onError={e => { e.target.style.display = 'none' }}
                />
                <button
                  type="button"
                  onClick={() => removeImage(url)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <label className={`flex items-center justify-center gap-2 w-full border-2 border-dashed rounded px-4 py-4 cursor-pointer transition-colors
          ${uploading ? 'border-zinc-300 bg-zinc-50 cursor-not-allowed' : 'border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50'}
          ${isAr ? 'flex-row-reverse' : ''}`}
        >
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            onChange={handleFileChange}
            disabled={uploading}
            className="hidden"
          />
          {uploading ? (
            <span className="text-xs text-zinc-400">{T.saving || 'Uploading...'}</span>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-400">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
              </svg>
              <span className="text-xs text-zinc-500">
                {previewUrls.length > 0 ? (T.addMoreImages || 'Add more images') : (T.clickToUpload || 'Click to upload images')}
              </span>
              <span className="text-xs text-zinc-400">(JPEG, PNG, WebP — max 5MB each)</span>
            </>
          )}
        </label>
        {uploadError && (
          <p className="text-xs text-red-500 mt-1">{uploadError}</p>
        )}
      </div>

      <div className={`flex gap-4 ${isAr ? 'flex-row-reverse' : ''}`}>
        <label className="flex items-center gap-2 text-sm text-zinc-600 cursor-pointer">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={e => set('is_active', e.target.checked)}
          />
          {T.active}
        </label>

        <label className="flex items-center gap-2 text-sm text-zinc-600 cursor-pointer">
          <input
            type="checkbox"
            checked={form.is_featured}
            onChange={e => set('is_featured', e.target.checked)}
          />
          {T.featured}
        </label>
      </div>

      <div className={`flex justify-end gap-2 pt-2 border-t border-zinc-100 ${isAr ? 'flex-row-reverse' : ''}`}>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100 rounded transition-colors"
        >
          {T.cancel}
        </button>

        <button
          type="submit"
          disabled={saving || uploading}
          className="px-4 py-2 text-sm bg-zinc-900 text-white rounded hover:bg-zinc-700 transition-colors disabled:opacity-50"
        >
          {saving ? T.saving : T.saveProduct}
        </button>
      </div>
    </form>
  )
}

export default function Products() {
  const [products, setProducts] = useState([])
  const [sections, setSections] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [sectionFilter, setSectionFilter] = useState('All')

  const { lang, isAr } = useLang()
  const T = t[lang] || t.en

  const load = () =>
    Promise.all([
      getProducts().then(r =>
        setProducts(Array.isArray(r?.data) ? r.data : [])
      ),
      getSections().then(r =>
        setSections(Array.isArray(r?.data) ? r.data : [])
      ),
    ]).finally(() => setLoading(false))

  useEffect(() => {
    load()
  }, [])

  const filtered = products.filter(p => {
    const matchesSection =
      sectionFilter === 'All' || p.section === sectionFilter

    const matchesSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category?.toLowerCase().includes(search.toLowerCase()) ||
      p.section?.toLowerCase().includes(search.toLowerCase())

    return matchesSection && matchesSearch
  })

  const handleSave = async (data) => {
    setSaving(true)

    try {
      if (modal === 'create')
        await createProduct(data)
      else
        await updateProduct(modal.id, data)

      setModal(null)
      load()
    } catch (err) {
      alert(err.response?.data?.detail || T.errorSavingProduct)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id, name) => {
    if (!confirm(`${T.deleteProduct} "${name}"?`)) return

    await deleteProduct(id)
    load()
  }

  const getInitialForm = (p) => ({
    name: p.name,
    description: p.description,
    section: p.section || '',
    category: p.category,
    brand: p.brand || '',
    price: p.price,
    stock: p.stock,
    discount: p.discount || '',
    is_active: p.is_active,
    is_featured: p.is_featured,
    image_urls: p.images?.map(i => i.url).join('\n') || '',
    sizes: p.sizes || [],
  })

  return (
    <Layout>
      <div className={`flex items-center justify-between mb-6 ${isAr ? 'flex-row-reverse text-right' : ''}`}>
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">
            {T.products}
          </h1>

          <p className="text-sm text-zinc-500 mt-0.5">
            {products.length} {T.total}
          </p>
        </div>

        <button
          onClick={() => setModal('create')}
          className="bg-zinc-900 text-white text-sm px-4 py-2 rounded hover:bg-zinc-700 transition-colors"
        >
          + {T.addProduct}
        </button>
      </div>

      <div className={`flex flex-col sm:flex-row gap-3 mb-4 sm:items-center justify-between ${isAr ? 'sm:flex-row-reverse' : ''}`}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={T.searchProducts}
          className={`border border-zinc-200 rounded px-3 py-2 text-sm outline-none focus:border-zinc-400 w-52 ${
            isAr ? 'text-right' : 'text-left'
          }`}
        />

        <div className={`flex gap-1 flex-wrap ${isAr ? 'flex-row-reverse' : ''}`}>
          {['All', ...sections].map(s => (
            <button
              key={s}
              onClick={() => setSectionFilter(s)}
              className={`px-3 py-1.5 rounded text-xs border transition-colors
                ${
                  sectionFilter === s
                    ? 'bg-zinc-900 text-white border-zinc-900'
                    : 'border-zinc-200 text-zinc-500 hover:border-zinc-400'
                }`}
            >
              {s === 'All' ? T.all : s}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm" dir={isAr ? 'rtl' : 'ltr'}>
          <thead>
            <tr className={`text-xs text-zinc-400 border-b border-zinc-100 bg-zinc-50 ${isAr ? 'text-right' : 'text-left'}`}>
              <th className="px-5 py-3 font-medium">{T.product}</th>
              <th className="px-5 py-3 font-medium">{T.sectionField}</th>
              <th className="px-5 py-3 font-medium">{T.category}</th>
              <th className="px-5 py-3 font-medium">{T.price}</th>
              <th className="px-5 py-3 font-medium">{T.stock}</th>
              <th className="px-5 py-3 font-medium">{T.status}</th>
              <th className="px-5 py-3 font-medium">{T.featured}</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td
                  colSpan={8}
                  className="px-5 py-8 text-center text-zinc-400 text-xs"
                >
                  {T.loading}
                </td>
              </tr>
            )}

            {!loading && filtered.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-5 py-8 text-center text-zinc-400 text-xs"
                >
                  {T.noProducts}
                </td>
              </tr>
            )}

            {filtered.map(p => (
              <tr
                key={p.id}
                className="border-b border-zinc-50 hover:bg-zinc-50 transition-colors"
              >
                <td className={`px-5 py-3 ${isAr ? 'text-right' : 'text-left'}`}>
                  <div className="font-medium text-zinc-900">
                    {p.name}
                  </div>

                  {p.brand && (
                    <div className="text-xs text-zinc-400">
                      {p.brand}
                    </div>
                  )}

                  {p.sizes && p.sizes.length > 0 && (
                    <div className="flex gap-1 mt-1 text-[11px] text-zinc-400">
                      <span>{isAr ? 'المقاسات:' : 'Sizes:'}</span>
                      <span>{p.sizes.join(', ')}</span>
                    </div>
                  )}
                </td>

                <td className={`px-5 py-3 text-zinc-500 ${isAr ? 'text-right' : 'text-left'}`}>
                  {p.section || '—'}
                </td>

                <td className={`px-5 py-3 text-zinc-500 ${isAr ? 'text-right' : 'text-left'}`}>
                  {p.category}
                </td>

                <td className={`px-5 py-3 text-zinc-900 font-medium ${isAr ? 'text-right' : 'text-left'}`}>
                  KWD {Number(p.price).toFixed(3)}

                  {p.discount && (
                    <span className={`${isAr ? 'mr-1' : 'ml-1'} text-xs text-green-600`}>
                      -{p.discount}%
                    </span>
                  )}
                </td>

                <td className={`px-5 py-3 ${isAr ? 'text-right' : 'text-left'}`}>
                  <span className={p.stock <= 5 ? 'text-red-600 font-medium' : 'text-zinc-700'}>
                    {p.stock}
                  </span>
                </td>

                <td className={`px-5 py-3 ${isAr ? 'text-right' : 'text-left'}`}>
                  <button
                    onClick={() => toggleActive(p.id).then(load)}
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors cursor-pointer
                      ${
                        p.is_active
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
                      }`}
                  >
                    {p.is_active ? T.active_badge : T.hidden_badge}
                  </button>
                </td>

                <td className={`px-5 py-3 ${isAr ? 'text-right' : 'text-left'}`}>
                  <button
                    onClick={() => toggleFeatured(p.id).then(load)}
                    className={`text-lg transition-opacity ${
                      p.is_featured
                        ? 'opacity-100'
                        : 'opacity-20 hover:opacity-50'
                    }`}
                  >
                    ★
                  </button>
                </td>

                <td className="px-5 py-3">
                  <div className="flex items-center gap-2 justify-end">
                    <button
                      onClick={() => setModal(p)}
                      className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
                    >
                      {T.edit}
                    </button>

                    <button
                      onClick={() => handleDelete(p.id, p.name)}
                      className="text-xs text-zinc-400 hover:text-red-600 transition-colors"
                    >
                      {T.delete}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal
          title={
            modal === 'create'
              ? T.addProduct
              : `${T.edit} — ${modal.name}`
          }
          onClose={() => setModal(null)}
        >
          <ProductForm
            initial={
              modal === 'create'
                ? EMPTY_FORM
                : getInitialForm(modal)
            }
            onSave={handleSave}
            onCancel={() => setModal(null)}
            saving={saving}
            sections={sections}
            T={T}
            isAr={isAr}
          />
        </Modal>
      )}
    </Layout>
  )
}