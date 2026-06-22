import { useState, useRef, useEffect, useLayoutEffect } from 'react'
export default function SectionSearchBar({
  sections = {},
  activeSection,
  activeCategory,
  onSelectCategory,
  search,
  onSearchChange,
}) {
  const [openSection, setOpenSection] = useState(null)
  const [dropdownLeft, setDropdownLeft] = useState(0)
  const containerRef = useRef(null)
  const barRef = useRef(null)
  const buttonRefs = useRef({}) // { [sectionName]: HTMLButtonElement }

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpenSection(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Recompute the dropdown's horizontal offset whenever it opens, by measuring
  // the clicked button's position relative to the bar wrapper.
  useLayoutEffect(() => {
    if (!openSection) return
    const btn = buttonRefs.current[openSection]
    const bar = barRef.current
    if (!btn || !bar) return

    const btnRect = btn.getBoundingClientRect()
    const barRect = bar.getBoundingClientRect()
    let left = btnRect.left - barRect.left

    // Clamp so the dropdown (width ~192px / w-48) never overflows past the
    // bar's right edge on narrow screens.
    const dropdownWidth = 192
    const maxLeft = barRect.width - dropdownWidth
    if (left > maxLeft) left = Math.max(0, maxLeft)

    setDropdownLeft(left)
  }, [openSection])

  const sectionNames = Object.keys(sections)

  const handleSectionClick = (name) => {
    setOpenSection(prev => (prev === name ? null : name))
  }

  const handlePick = (sectionName, categoryName) => {
    onSelectCategory(sectionName, categoryName)
    setOpenSection(null)
  }

  return (
    <div ref={containerRef} className="relative max-w-3xl mx-auto px-6 mt-4 mb-10">
      <div ref={barRef} className="relative z-30 bg-[#f8f3ef] border border-[#ede5e0] rounded-full shadow-sm flex items-center h-14 px-2">
        {/* Sections — left side. overflow-x-auto only ever scrolls horizontally;
            the dropdown panel below is NOT a child of this row, so it can
            never get clipped/repositioned by the scroll container. */}
        <div className="flex items-center gap-1 flex-1 overflow-x-auto no-scrollbar">
          {sectionNames.length === 0 && (
            <span className="px-4 text-xs text-[#aaa] font-['DM_Sans'] whitespace-nowrap">No sections yet</span>
          )}
          {sectionNames.map(name => {
            const isOpen   = openSection === name
            const isActive = activeSection === name
            return (
              <button
                key={name}
                ref={(el) => { buttonRefs.current[name] = el }}
                onClick={() => handleSectionClick(name)}
                className={`flex items-center gap-1.5 px-4 h-10 rounded-full text-xs tracking-widest uppercase whitespace-nowrap transition-colors font-['DM_Sans']
                  ${isActive
                    ? 'bg-[#1a1715] text-white'
                    : 'text-[#6b6460] hover:bg-[#efe6e0] hover:text-[#1a1715]'
                  }`}
              >
                {name}
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
                  className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
            )
          })}
        </div>

        {/* Divider */}
        <div className="w-px h-7 bg-[#ede5e0] mx-1 flex-shrink-0" />

        {/* Search — right side */}
        <div className="relative flex items-center flex-shrink-0 w-44 md:w-64">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2"
            className="absolute left-3.5 pointer-events-none">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Search..."
            className="w-full bg-transparent rounded-full pl-9 pr-8 py-2 text-sm text-[#1a1715] outline-none font-['DM_Sans'] placeholder:text-[#aaa]"
          />
          {search && (
            <button onClick={() => onSearchChange('')}
              className="absolute right-3 text-[#aaa] hover:text-[#1a1715] text-base leading-none">×</button>
          )}
        </div>
      </div>

      {/* Dropdown panel — positioned directly under the clicked button via
          measured offset, sitting outside the scrollable row so it can't be
          clipped by overflow-x-auto. */}
      {openSection && sections[openSection] && (
        <div
          className="absolute top-full mt-2 z-40 w-48 bg-white border border-[#ede5e0] rounded-lg shadow-lg overflow-hidden py-1.5"
          style={{ left: `${24 + dropdownLeft}px` }}
        >
          <button
            onClick={() => handlePick(openSection, null)}
            className={`w-full text-left px-4 py-2 text-xs tracking-wide font-['DM_Sans'] transition-colors
              ${activeSection === openSection && !activeCategory
                ? 'text-[#1a1715] font-medium bg-[#f5ede8]'
                : 'text-[#6b6460] hover:bg-[#fdfaf8] hover:text-[#1a1715]'
              }`}
          >
            All {openSection}
          </button>
          {sections[openSection].map(cat => (
            <button
              key={cat}
              onClick={() => handlePick(openSection, cat)}
              className={`w-full text-left px-4 py-2 text-xs tracking-wide font-['DM_Sans'] transition-colors
                ${activeSection === openSection && activeCategory === cat
                  ? 'text-[#1a1715] font-medium bg-[#f5ede8]'
                  : 'text-[#6b6460] hover:bg-[#fdfaf8] hover:text-[#1a1715]'
                }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}