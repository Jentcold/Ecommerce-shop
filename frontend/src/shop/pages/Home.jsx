import { useEffect, useState, useMemo } from 'react'
import Layout from '../components/Layout'
import ProductCard from '../components/ProductCard'
import { getProducts } from '../api/products'
import client from '../api/client'

export default function Home() {
  const [products, setProducts]       = useState([])
  const [allProducts, setAllProducts] = useState([])
  const [category, setCategory]       = useState('All')
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [saleActive, setSaleActive]   = useState(false)

  // ── LOAD CORE PUBLIC DATA & BANNER CONFIGURATIONS ─────────────────────────
  useEffect(() => {
    setLoading(true)
    
    Promise.all([
      // Fetch public store products list
      getProducts(null)
        .then(r => setAllProducts(r.data))
        .catch(err => console.error("Error loading home catalog items:", err)),
        
      // Fetch public shop settings (No more 403 errors!)
      client.get('/products/shop/settings')
        .then(r => {
          setSaleActive(r.data?.sale_active === 'true')
        })
        .catch(err => {
          console.warn("Could not read layout configurations gracefully:", err)
          setSaleActive(false)
        })
    ]).finally(() => setLoading(false))
  }, [])

  // ── HANDLE CATEGORY FILTER CHANGES ─────────────────────────────────────────
  useEffect(() => {
    setLoading(true)
    getProducts(category === 'All' ? null : category)
      .then(r => setProducts(r.data))
      .finally(() => setLoading(false))
  }, [category])

  // Get list of distinct active categories for filters
  const categories = useMemo(() => {
    const cats = [...new Set(allProducts.map(p => p.category).filter(Boolean))]
    return ['All', ...cats]
  }, [allProducts])

  // Sort: featured first, then discounted, then normal
  const sorted = useMemo(() => {
    return [...products].sort((a, b) => {
      const scoreA = (a.is_featured ? 2 : 0) + (a.discount ? 1 : 0)
      const scoreB = (b.is_featured ? 2 : 0) + (b.discount ? 1 : 0)
      return scoreB - scoreA
    })
  }, [products])

  // Sale products — filtering for active discounted items only
  const saleProducts = useMemo(() =>
    allProducts.filter(p => p.discount && p.is_active),
  [allProducts])

  // Fuzzy search algorithm with score weight balancing
  const filtered = useMemo(() => {
    if (!search.trim()) return sorted
    const term = search.toLowerCase().trim()
    return sorted
      .map(p => {
        const name  = p.name?.toLowerCase() || ''
        const desc  = p.description?.toLowerCase() || ''
        const cat   = p.category?.toLowerCase() || ''
        const brand = p.brand?.toLowerCase() || ''
        let score = 0
        if (name === term)          score += 100
        if (name.startsWith(term))  score += 60
        if (name.includes(term))    score += 40
        if (brand.includes(term))   score += 30
        if (cat.includes(term))     score += 20
        if (desc.includes(term))    score += 10
        search.split(' ').filter(Boolean).forEach(w => {
          if (name.includes(w))  score += 15
          if (brand.includes(w)) score += 10
          if (cat.includes(w))   score += 8
          if (desc.includes(w))  score += 3
        })
        return { product: p, score }
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ product }) => product)
  }, [sorted, search])

  return (
    <Layout>
      {/* Compact hero */}
      <div className="bg-[#f5ede8] px-6 py-8 md:py-10 text-center">
        <h1 className="font-['Cormorant_Garamond'] text-3xl md:text-4xl font-light text-[#1a1715] leading-tight">
          Everyday Softness, <em>Perfectly Crafted</em>
        </h1>
        <p className="mt-2 text-[#6b6460] text-sm max-w-md mx-auto font-['DM_Sans']">
          Quality socks, leggings, and garments — delivered across Kuwait.
        </p>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">

        {/* Sale section — only shows when admin activates it via public configurations */}
        {saleActive && saleProducts.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <span className="bg-[#b07060] text-white text-xs px-3 py-1 rounded-full tracking-widest uppercase font-['DM_Sans']">
                Sale
              </span>
              <h2 className="font-['Cormorant_Garamond'] text-2xl font-light text-[#1a1715]">
                On Sale Now
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {saleProducts.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
            <div className="border-b border-[#ede5e0] mt-10" />
          </div>
        )}

        {/* Search + Filter UI Layout Panel */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
          <div className="flex gap-2 flex-wrap">
            {categories.map(cat => (
              <button key={cat} onClick={() => { setCategory(cat); setSearch('') }}
                className={`px-4 py-1.5 rounded-full text-xs tracking-widest uppercase border transition-all font-['DM_Sans']
                  ${category === cat
                    ? 'bg-[#1a1715] text-white border-[#1a1715]'
                    : 'border-[#ede5e0] text-[#6b6460] hover:border-[#1a1715] hover:text-[#1a1715] bg-white'
                  }`}>
                {cat}
              </button>
            ))}
          </div>
          <div className="relative w-full md:w-64">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search products..."
              className="w-full border border-[#ede5e0] rounded px-4 py-2 text-sm text-[#1a1715] outline-none focus:border-[#1a1715] transition-colors bg-white font-['DM_Sans'] placeholder:text-[#aaa]" />
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#aaa] hover:text-[#1a1715] text-lg leading-none">×</button>
            )}
          </div>
        </div>

        {/* Dynamic Search Status Text Context Indicator */}
        <p className="text-xs text-[#aaa] tracking-widest uppercase mb-6 font-['DM_Sans']">
          {loading ? 'Loading...' : `${filtered.length} product${filtered.length !== 1 ? 's' : ''}`}
          {search && ` for "${search}"`}
        </p>

        {/* Fallback Display if Query List Array is Empty */}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-20 text-[#aaa] font-['DM_Sans'] text-sm">
            {search ? `No products found for "${search}"` : 'No products found'}
          </div>
        )}

        {/* Main Product Grid Container Element Layout Showcase */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filtered.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      </div>
    </Layout>
  )
}