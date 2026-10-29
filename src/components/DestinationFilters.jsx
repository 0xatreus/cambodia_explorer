import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react'
import { DIETARY_TAGS, PROVINCES, VIBE_TAGS } from '../data/places'

const POPULAR = ['Siem Reap', 'Phnom Penh', 'Preah Sihanouk', 'Kampot', 'Battambang', 'Mondulkiri']

/** Horizontal chip scroller: fades only appear on a side that has more content. */
function useScrollEdges(ref, deps) {
  const [edges, setEdges] = useState({ left: false, right: false })
  const update = useCallback(() => {
    const el = ref.current
    if (!el) return
    const left = el.scrollLeft > 2
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 2
    setEdges(prev => (prev.left === left && prev.right === right ? prev : { left, right }))
  }, [ref])
  useLayoutEffect(() => {
    update()
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return undefined
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [update, ...deps])
  return [edges, update]
}

function ToggleChip({ pressed, onClick, children, className = '' }) {
  return (
    <button type="button" className={`chip${pressed ? ' is-selected' : ''} ${className}`} aria-pressed={pressed} onClick={onClick}>
      {pressed && <Check size={14} strokeWidth={2.5} aria-hidden="true" />}
      {children}
    </button>
  )
}

export default function DestinationFilters({
  activeProvince, onSelectProvince, tripCounts,
  categories, activeCategory, onSelectCategory,
  activeVibes, onToggleVibe,
}) {
  const scrollerRef = useRef(null)
  const chipRefs = useRef({})
  const [provincesOpen, setProvincesOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const visible = useMemo(() => (POPULAR.includes(activeProvince) ? POPULAR : [...POPULAR, activeProvince]), [activeProvince])
  const [edges, updateEdges] = useScrollEdges(scrollerRef, [visible])
  const activeCount = activeVibes.length + (activeCategory !== 'All' ? 1 : 0)

  // Keep the selected province centred in the row, scrolling only the row (not the page).
  useEffect(() => {
    const row = scrollerRef.current
    const chip = chipRefs.current[activeProvince]
    if (!row || !chip) return
    const target = chip.offsetLeft - (row.clientWidth - chip.offsetWidth) / 2
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    row.scrollTo({ left: Math.max(0, target), behavior: reduce ? 'auto' : 'smooth' })
  }, [activeProvince])

  const pickProvince = name => { onSelectProvince(name); setProvincesOpen(false) }

  return (
    <div className="filter-bar">
      <div className="filter-group where-group" role="group" aria-labelledby="where-label">
        <span id="where-label" className="filter-label">Where</span>
        <div className={`chip-scroller-frame${edges.left ? ' fade-left' : ''}${edges.right ? ' fade-right' : ''}`}>
          <div className="chip-scroller" ref={scrollerRef} onScroll={updateEdges}>
            {visible.map(name => {
              const count = tripCounts[name] || 0
              return (
                <button
                  type="button"
                  key={name}
                  ref={node => { chipRefs.current[name] = node }}
                  className={`chip province-chip${name === activeProvince ? ' is-selected' : ''}`}
                  aria-pressed={name === activeProvince}
                  onClick={() => onSelectProvince(name)}
                >
                  {name === activeProvince && <Check size={14} strokeWidth={2.5} aria-hidden="true" />}
                  {name}
                  {count > 0 && <span className="chip-count" aria-hidden="true">{count}</span>}
                  {count > 0 && <span className="sr-only"> ({count} saved {count === 1 ? 'stop' : 'stops'})</span>}
                </button>
              )
            })}
          </div>
        </div>
        <div className="all-provinces">
          <button type="button" className="chip all-provinces-trigger" aria-haspopup="dialog" aria-expanded={provincesOpen} onClick={() => setProvincesOpen(open => !open)}>
            All provinces <ChevronDown size={14} aria-hidden="true" />
          </button>
          {provincesOpen && <ProvincePicker active={activeProvince} tripCounts={tripCounts} onPick={pickProvince} onClose={() => setProvincesOpen(false)} />}
        </div>
      </div>

      <button type="button" className={`chip filters-trigger${activeCount ? ' has-filters' : ''}`} aria-expanded={filtersOpen} aria-controls="vibe-group" onClick={() => setFiltersOpen(true)}>
        <SlidersHorizontal size={15} aria-hidden="true" /> Filters{activeCount > 0 && <span className="chip-count">{activeCount}</span>}
      </button>

      <div id="vibe-group" className={`filter-group vibe-group${filtersOpen ? ' is-open' : ''}`} role="group" aria-labelledby="vibe-label">
        <div className="sheet-head">
          <span id="vibe-label" className="filter-label">Vibe</span>
          <button type="button" className="sheet-close" aria-label="Close filters" onClick={() => setFiltersOpen(false)}><X size={18} aria-hidden="true" /></button>
        </div>
        <div className="vibe-sections">
          <div className="vibe-section" role="group" aria-label="Type of place">
            <b>Type</b>
            <div className="chip-wrap">
              {categories.map(category => (
                <ToggleChip key={category} pressed={activeCategory === category} onClick={() => onSelectCategory(category)}>{category}</ToggleChip>
              ))}
            </div>
          </div>
          <div className="vibe-section" role="group" aria-label="Mood">
            <b>Mood</b>
            <div className="chip-wrap">
              {VIBE_TAGS.map(tag => <ToggleChip key={tag.id} pressed={activeVibes.includes(tag.id)} onClick={() => onToggleVibe(tag.id)}>{tag.label}</ToggleChip>)}
            </div>
          </div>
          <div className="vibe-section" role="group" aria-label="Dietary">
            <b>Dietary</b>
            <div className="chip-wrap">
              {DIETARY_TAGS.map(tag => <ToggleChip key={tag.id} pressed={activeVibes.includes(tag.id)} onClick={() => onToggleVibe(tag.id)}>{tag.label}</ToggleChip>)}
            </div>
          </div>
        </div>
        <button type="button" className="sheet-done" onClick={() => setFiltersOpen(false)}>Show places</button>
      </div>
      {filtersOpen && <div className="sheet-backdrop" onClick={() => setFiltersOpen(false)} aria-hidden="true" />}
    </div>
  )
}

function ProvincePicker({ active, tripCounts, onPick, onClose }) {
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)
  const panelRef = useRef(null)
  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? PROVINCES.filter(p => `${p.name} ${p.aka || ''}`.toLowerCase().includes(q)) : PROVINCES
  }, [query])

  useEffect(() => {
    inputRef.current?.focus()
    const onKey = event => { if (event.key === 'Escape') onClose() }
    const onDown = event => {
      if (panelRef.current && !panelRef.current.contains(event.target) && !event.target.closest('.all-provinces-trigger')) onClose()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onDown) }
  }, [onClose])

  return (
    <div className="province-picker" role="dialog" aria-label="All provinces" ref={panelRef}>
      <div className="province-picker__head">
        <div className="province-picker__search">
          <Search size={16} aria-hidden="true" />
          <input ref={inputRef} type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search 25 provinces" aria-label="Search provinces" />
        </div>
        <button type="button" className="sheet-close" aria-label="Close province list" onClick={onClose}><X size={18} aria-hidden="true" /></button>
      </div>
      <ul className="province-picker__list">
        {results.map(province => (
          <li key={province.name}>
            <button type="button" aria-pressed={province.name === active} className={province.name === active ? 'is-selected' : ''} onClick={() => onPick(province.name)}>
              <span>
                {province.name}
                {province.aka && <small>{province.aka}</small>}
              </span>
              {tripCounts[province.name] > 0 && <em>{tripCounts[province.name]} saved</em>}
              {province.name === active && <Check size={16} aria-hidden="true" />}
            </button>
          </li>
        ))}
        {!results.length && <li className="province-picker__empty">No province matches “{query}”.</li>}
      </ul>
    </div>
  )
}
