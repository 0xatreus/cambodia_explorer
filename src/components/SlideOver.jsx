import { useEffect, useRef } from 'react'
import { Clock3, DollarSign, MapPin, Plus, X } from 'lucide-react'
import { CATEGORY_COLORS } from '../data/places'
import { formatMoney } from '../data/money'

export default function SlideOver({ place, open, isAdded, onClose, onAdd, lowData, currency }) {
  const panelRef = useRef(null)
  const lastFocusedRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    lastFocusedRef.current = document.activeElement
    document.body.style.overflow = 'hidden'

    const focusFirst = () =>
      panelRef.current?.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')?.focus()
    const timer = window.setTimeout(focusFirst, 0)
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
      if (event.key !== 'Tab') return
      const focusable = panelRef.current?.querySelectorAll(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
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
    <div
      className="fixed inset-0 z-[1200] bg-[#17302A]/40 backdrop-fade"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="place-title"
        aria-describedby="place-description"
        className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-[20px] bg-[#F8FAF6] p-5 shadow-2xl sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-[28rem] sm:rounded-t-none sm:rounded-l-[20px] sm:p-7 border-l border-[#DCE4DA]"
      >
        <div className="flex items-start justify-between gap-5">
          <div>
            <p
              className="text-xs font-bold uppercase tracking-[0.14em]"
              style={{ color: CATEGORY_COLORS[place.category] || '#1F4D3A' }}
            >
              {place.category} · {place.city}
            </p>
            {place.communityPick && <em className="community-badge mt-2 inline-flex">Community pick</em>}
            <h2 id="place-title" className="mt-2 font-display text-2xl font-bold tracking-tight text-[#17302A]">
              {place.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid min-h-[44px] min-w-[44px] place-items-center rounded-full border border-[#DCE4DA] bg-white text-[#17302A] hover:border-[#1F4D3A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2A33A]"
            aria-label={`Close details for ${place.name}`}
          >
            <X aria-hidden="true" size={20} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </button>
        </div>

        {place.image &&
          (lowData ? (
            <div className="details-image-deferred">Photo deferred in low-data mode</div>
          ) : (
            <img src={place.image} alt="" className="details-place-image rounded-[16px]" />
          ))}

        <div className="details-tags" aria-label="Place tags">
          {place.tags?.map(tag => (
            <span key={tag}>{tag}</span>
          ))}
        </div>

        {place.dietaryTags?.length > 0 && (
          <div className="details-tags" aria-label="Dietary options">
            {place.dietaryTags.map(tag => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        )}

        <p id="place-description" className="mt-4 leading-relaxed text-[#4F6358] text-sm">
          {place.description}
        </p>

        <dl className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-[16px] border border-[#E39A2D]/40 bg-[#FFF3DC] p-4">
            <dt className="flex items-center gap-2 text-xs font-semibold text-[#4F6358]">
              <DollarSign aria-hidden="true" size={16} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              Estimate
            </dt>
            <dd className="mt-1 font-display text-xl font-bold text-[#17302A]">
              {formatMoney(place.cost, currency)}
            </dd>
          </div>
          <div className="rounded-[16px] border border-[#DCE4DA] bg-[#F2F5EF] p-4">
            <dt className="flex items-center gap-2 text-xs font-semibold text-[#4F6358]">
              <Clock3 aria-hidden="true" size={16} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              Time needed
            </dt>
            <dd className="mt-1 font-display text-xl font-bold text-[#17302A]">{place.time}h</dd>
          </div>
        </dl>

        <section className="mt-5 rounded-[16px] border border-[#DCE4DA] bg-[#F2F5EF] p-4" aria-labelledby="tip-heading">
          <h3 id="tip-heading" className="flex items-center gap-2 font-display text-sm font-bold text-[#17302A]">
            <MapPin aria-hidden="true" size={16} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="text-[#2F6B55]" />
            Local tip
          </h3>
          <p className="mt-2 text-xs leading-relaxed text-[#4F6358]">{place.tip}</p>
        </section>

        {place.safetyNote && (
          <section className="mt-4 rounded-[16px] border border-[#E39A2D]/40 bg-[#FFF3DC] p-4" aria-labelledby="safety-heading">
            <h3 id="safety-heading" className="font-display text-sm font-bold text-[#17302A]">Good to know</h3>
            <p className="mt-2 text-xs leading-relaxed text-[#4F6358]">{place.safetyNote}</p>
          </section>
        )}

        <button
          type="button"
          disabled={isAdded}
          onClick={() => onAdd(place)}
          className="mt-6 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full bg-[#1F4D3A] px-5 font-bold text-[#F8FAF6] hover:bg-[#0F2F23] disabled:cursor-not-allowed disabled:bg-[#DCE4DA] disabled:text-[#4F6358] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2A33A] focus-visible:ring-offset-2 transition-colors"
        >
          <Plus aria-hidden="true" size={18} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          {isAdded ? 'Already in itinerary' : 'Add to itinerary'}
        </button>
      </aside>
    </div>
  )
}
