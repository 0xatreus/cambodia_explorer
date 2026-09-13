import { useEffect, useRef } from 'react'
import { Clock3, DollarSign, MapPin, Plus, X } from 'lucide-react'
import { CATEGORY_COLORS } from '../data/places'

export default function SlideOver({ place, open, isAdded, onClose, onAdd, lowData }) {
  const panelRef = useRef(null)
  const lastFocusedRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    lastFocusedRef.current = document.activeElement
    document.body.style.overflow = 'hidden'

    const focusFirst = () => panelRef.current?.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')?.focus()
    const timer = window.setTimeout(focusFirst, 0)
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
      if (event.key !== 'Tab') return
      const focusable = panelRef.current?.querySelectorAll('button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
      if (!focusable?.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
      lastFocusedRef.current?.focus?.()
    }
  }, [open, onClose])

  if (!open || !place) return null

  return (
    <div className="fixed inset-0 z-[1100] bg-slate-950/40" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="place-title" aria-describedby="place-description" className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl motion-safe:animate-[slide-up_180ms_ease-out] sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-[28rem] sm:rounded-none sm:p-7">
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700" style={{ color: CATEGORY_COLORS[place.category] }}>{place.category} · {place.city}</p>
            <h2 id="place-title" className="mt-2 text-2xl font-bold tracking-tight">{place.name}</h2>
          </div>
          <button type="button" onClick={onClose} className="grid min-h-11 min-w-11 place-items-center rounded-full border border-stone-200 text-slate-700 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700" aria-label={`Close details for ${place.name}`}><X aria-hidden="true" size={20} /></button>
        </div>
        {place.image && (lowData ? <div className="details-image-deferred">Photo deferred in low-data mode</div> : <img src={place.image} alt="" className="details-place-image" />)}
        <div className="details-tags" aria-label="Place tags">{place.tags?.map(tag => <span key={tag}>{tag}</span>)}</div>
        {place.dietaryTags?.length > 0 && <div className="details-tags" aria-label="Dietary options">{place.dietaryTags.map(tag => <span key={tag}>{tag}</span>)}</div>}
        <p id="place-description" className="mt-4 leading-7 text-slate-700">{place.description}</p>
        <dl className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-amber-50 p-4"><dt className="flex items-center gap-2 text-sm text-slate-600"><DollarSign aria-hidden="true" size={16} />Estimate</dt><dd className="mt-1 text-xl font-bold">${place.cost}</dd></div>
          <div className="rounded-xl bg-emerald-50 p-4"><dt className="flex items-center gap-2 text-sm text-slate-600"><Clock3 aria-hidden="true" size={16} />Time needed</dt><dd className="mt-1 text-xl font-bold">{place.time}h</dd></div>
        </dl>
        <section className="mt-5 rounded-xl border border-stone-200 bg-stone-50 p-4" aria-labelledby="tip-heading">
          <h3 id="tip-heading" className="flex items-center gap-2 font-bold"><MapPin aria-hidden="true" size={17} /> Local tip</h3>
          <p className="mt-2 text-sm leading-6 text-slate-700">{place.tip}</p>
        </section>
        {place.safetyNote && <section className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4" aria-labelledby="safety-heading"><h3 id="safety-heading" className="font-bold">Good to know</h3><p className="mt-2 text-sm leading-6 text-slate-700">{place.safetyNote}</p></section>}
        <button type="button" disabled={isAdded} onClick={() => onAdd(place)} className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"><Plus aria-hidden="true" size={19} />{isAdded ? 'Already in itinerary' : 'Add to itinerary'}</button>
      </aside>
    </div>
  )
}
