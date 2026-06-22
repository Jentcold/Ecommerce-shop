import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import Layout from '../components/Layout'
import ProductCard from '../components/ProductCard'
import SectionSearchBar from '../components/SectionSearchBar'
import { getProducts, getOnSale, searchProducts, getSections, getCategories } from '../api/products'
import client from '../api/client'

const PAGE_SIZE = 20
const SEARCH_DEBOUNCE_MS = 300

export default function Home() {
  const [products, setProducts]       = useState([])   // accumulated, paginated grid items
  const [offset, setOffset]           = useState(0)
  const [hasMore, setHasMore]         = useState(true)
  const [loadingPage, setLoadingPage] = useState(false) // loading a single page (initial or "load more")

  const [saleProducts, setSaleProducts] = useState([])
  const [sectionTree, setSectionTree]   = useState({}) // { "Women": ["Socks", "Leggings"], ... }
  const [activeSection, setActiveSection]   = useState(null) // null = All
  const [activeCategory, setActiveCategory] = useState(null)
  const [saleActive, setSaleActive]   = useState(false)

  const [search, setSearch]           = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const sentinelRef = useRef(null)
  const requestKeyRef = useRef(0) // guards against stale responses overwriting newer ones

  const isSearching = debouncedSearch.trim().length > 0

  // ── LOAD SALE BANNER + SHOP SETTINGS (independent of pagination) ──────────
  useEffect(() => {
    getOnSale({ limit: 100 })
      .then(r => setSaleProducts(r.data?.items || []))
      .catch(err => console.error("Error loading sale products:", err))

    client.get('/products/shop/settings')
      .then(r => setSaleActive(r.data?.sale_active === 'true'))
      .catch(err => {
        console.warn("Could not read layout configurations gracefully:", err)
        setSaleActive(false)
      })
  }, [])

  // ── LOAD SECTION → CATEGORY TREE FROM THE BACKEND ─────────────────────────
  useEffect(() => {
    getSections()
      .then(async (r) => {
        const sectionNames = Array.isArray(r?.data) ? r.data : []
        const tree = {}
        await Promise.all(
          sectionNames.map(async (name) => {
            try {
              const catRes = await getCategories(name)
              tree[name] = Array.isArray(catRes?.data) ? catRes.data : []
            } catch (err) {
              console.error(`Error loading categories for section "${name}":`, err)
              tree[name] = []
            }
          })
        )
        setSectionTree(tree)
      })
      .catch(err => console.error("Error loading sections:", err))
  }, [])

  // ── DEBOUNCE SEARCH INPUT ───────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [search])

  // ── FETCH A PAGE — shared by both browsing (section/category) and search ──
  // Source function switches based on whether a search term is active, but
  // both paths return the same { items, has_more } shape and append the same way.
  const fetchPage = useCallback((targetOffset, { reset }) => {
    const myKey = ++requestKeyRef.current
    setLoadingPage(true)

    const request = isSearching
      ? searchProducts(debouncedSearch.trim(), {
          section:  activeSection  || undefined,
          category: activeCategory || undefined,
          limit:    PAGE_SIZE,
          offset:   targetOffset,
        })
      : getProducts({
          section:  activeSection  || undefined,
          category: activeCategory || undefined,
          limit:    PAGE_SIZE,
          offset:   targetOffset,
        })

    request
      .then(r => {
        if (myKey !== requestKeyRef.current) return // a newer request superseded this one
        const { items = [], has_more = false } = r.data || {}
        setProducts(prev => (reset ? items : [...prev, ...items]))
        setHasMore(has_more)
        setOffset(targetOffset + items.length)
      })
      .catch(err => console.error("Error loading products:", err))
      .finally(() => {
        if (myKey === requestKeyRef.current) setLoadingPage(false)
      })
  }, [activeSection, activeCategory, isSearching, debouncedSearch])

  // Reset to page 0 whenever the filter OR the (debounced) search term changes.
  useEffect(() => {
    setProducts([])
    setOffset(0)
    setHasMore(true)
    fetchPage(0, { reset: true })
  }, [activeSection, activeCategory, debouncedSearch]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = useCallback(() => {
    if (loadingPage || !hasMore) return
    fetchPage(offset, { reset: false })
  }, [loadingPage, hasMore, offset, fetchPage])

  // ── INFINITE SCROLL ─────────────────────────────────────────────────────
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore() },
      { rootMargin: '400px' } // start loading a bit before the sentinel is actually visible
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [loadMore])

  const handleSelectCategory = (sectionName, categoryName) => {
    const isSameSelection = activeSection === sectionName && activeCategory === categoryName
    setActiveSection(isSameSelection ? null : sectionName)
    setActiveCategory(isSameSelection ? null : categoryName)
  }

  const handleSearchChange = (value) => {
    setSearch(value)
  }

  // Sort: featured first, then discounted, then normal (browsing only — search
  // results are returned by relevance/order from the backend, left as-is)
  const sortedProducts = useMemo(() => {
    if (isSearching) return products
    return [...products].sort((a, b) => {
      const scoreA = (a.is_featured ? 2 : 0) + (a.discount ? 1 : 0)
      const scoreB = (b.is_featured ? 2 : 0) + (b.discount ? 1 : 0)
      return scoreB - scoreA
    })
  }, [products, isSearching])

  const loading = loadingPage && products.length === 0

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

      {/* Oval section + search bar */}
      <SectionSearchBar
        sections={sectionTree}
        activeSection={activeSection}
        activeCategory={activeCategory}
        onSelectCategory={handleSelectCategory}
        search={search}
        onSearchChange={handleSearchChange}
      />

      <div className="max-w-6xl mx-auto px-6 py-6">

        {/* Sale section — sourced from its own dedicated endpoint, independent of pagination */}
        {saleActive && !isSearching && saleProducts.length > 0 && (
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

        {/* Dynamic Search Status Text Context Indicator */}
        <p className="text-xs text-[#aaa] tracking-widest uppercase mb-6 font-['DM_Sans']">
          {loading ? 'Loading...' : `${sortedProducts.length} product${sortedProducts.length !== 1 ? 's' : ''}`}
          {activeSection && ` in ${activeSection}${activeCategory ? ` · ${activeCategory}` : ''}`}
          {isSearching && ` for "${debouncedSearch}"`}
        </p>

        {/* Fallback Display if Query List Array is Empty */}
        {!loading && sortedProducts.length === 0 && (
          <div className="text-center py-20 text-[#aaa] font-['DM_Sans'] text-sm">
            {isSearching
              ? `No products found for "${debouncedSearch}"${activeSection ? ` in ${activeSection}${activeCategory ? ` · ${activeCategory}` : ''}` : ''}`
              : activeSection
                ? `No products found in ${activeSection}${activeCategory ? ` · ${activeCategory}` : ''}`
                : 'No products found'}
          </div>
        )}

        {/* Main Product Grid Container Element Layout Showcase */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {sortedProducts.map(p => <ProductCard key={p.id} product={p} />)}
        </div>

        {/* Infinite scroll sentinel + loading indicator */}
        <div ref={sentinelRef} className="h-10 flex items-center justify-center mt-8">
          {loadingPage && products.length > 0 && (
            <span className="text-xs text-[#aaa] tracking-widest uppercase font-['DM_Sans']">Loading more...</span>
          )}
          {!hasMore && products.length > 0 && (
            <span className="text-xs text-[#aaa] tracking-widest uppercase font-['DM_Sans']">You've reached the end</span>
          )}
        </div>
      </div>
    </Layout>
  )
}