import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, CheckCircle2, Clock3, X } from 'lucide-react'
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet'
import { GENERAL_CHECKLIST, LOCATION_CHECKLISTS } from '../data/checklists'
import { getTransportOptions, LOCAL_TRANSPORT } from '../data/transport'
import { CITIES } from '../data/places'
import { formatMoney } from '../data/money'

function buildDays(items, tripDays) {
  const days = items.reduce((plan, place) => {
    const currentDay = plan[plan.length - 1]
    if (!currentDay || currentDay.city !== place.city || currentDay.hours + place.time > 7) {
      plan.push({ city: place.city, hours: place.time, cost: place.cost, places: [place] })
    } else {
      currentDay.hours += place.time
      currentDay.cost += place.cost
      currentDay.places.push(place)
    }
    return plan
  }, [])
  while (days.length < tripDays) days.push({ city: null, hours: 0, cost: 0, places: [] })
  return days
}

export default function GeneratePlanModal({ open, items, tripDays, currency, onClose, onReorder }) {
  const panelRef = useRef(null)
  const overlayRef = useRef(null)
  const preservedScrollTopRef = useRef(null)
  const previousFocusRef = useRef(null)
  const [checkedPrepIds, setCheckedPrepIds] = useState(new Set())
  const [checkedPlaceIds, setCheckedPlaceIds] = useState(new Set())
  const [orderedItems, setOrderedItems] = useState(items)
  const [selectedTransport, setSelectedTransport] = useState({})

  useEffect(() => setOrderedItems(items), [items])
  useLayoutEffect(() => {
    if (preservedScrollTopRef.current === null || !overlayRef.current) return
    const scrollTop = preservedScrollTopRef.current
    overlayRef.current.scrollTop = scrollTop
    preservedScrollTopRef.current = null
  }, [orderedItems, items])

  const locations = useMemo(() => [...new Set(orderedItems.map(place => place.city))], [orderedItems])
  const transportLegs = useMemo(
    () =>
      locations
        .slice(0, -1)
        .map((from, index) => ({
          from,
          to: locations[index + 1],
          options: getTransportOptions(from, locations[index + 1]),
        })),
    [locations]
  )
  const selectedTransportCost = transportLegs.reduce((total, leg) => {
    const option = leg.options[selectedTransport[`${leg.from}-${leg.to}`] || 0]
    if (!option || option.costMin == null) return total
    return total + (option.costMin + (option.costMax ?? option.costMin)) / 2
  }, 0)

  const toggleChecklistItem = id =>
    setCheckedPrepIds(current => {
      const next = new Set(current)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const togglePlaceItem = id =>
    setCheckedPlaceIds(current => {
      const next = new Set(current)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const moveCity = (city, direction) => {
    const scrollTop = overlayRef.current?.scrollTop || 0
    preservedScrollTopRef.current = scrollTop
    const groups = locations.map(location => ({
      location,
      places: orderedItems.filter(place => place.city === location),
    }))
    const index = groups.findIndex(group => group.location === city)
    const nextIndex = index + direction
    if (index < 0 || nextIndex < 0 || nextIndex >= groups.length) return
    const nextGroups = [...groups]
    ;[nextGroups[index], nextGroups[nextIndex]] = [nextGroups[nextIndex], nextGroups[index]]
    const nextItems = nextGroups.flatMap(group => group.places)
    setOrderedItems(nextItems)
    onReorder?.(nextItems)
    window.requestAnimationFrame(() => {
      if (!overlayRef.current) return
      overlayRef.current.scrollTop = scrollTop
      window.requestAnimationFrame(() => {
        if (overlayRef.current) overlayRef.current.scrollTop = scrollTop
      })
    })
  }

  useEffect(() => {
    if (!open) return undefined
    previousFocusRef.current = document.activeElement
    document.body.style.overflow = 'hidden'
    const timer = window.setTimeout(() => panelRef.current?.querySelector('button, input')?.focus(), 0)
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
      if (event.key !== 'Tab') return
      const focusable = panelRef.current?.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      )
      if (!focusable?.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
      previousFocusRef.current?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      ref={overlayRef}
      className="itinerary-modal-overlay fixed inset-0 z-[1200] overflow-y-auto bg-[#17302A]/50 p-3 sm:p-6"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="checklist-title"
        className="mx-auto my-4 max-w-4xl rounded-[20px] bg-[#F8FAF6] p-5 shadow-2xl sm:my-8 sm:p-8 border border-[#DCE4DA]"
      >
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="eyebrow text-[#2F6B55]">Ready to travel</p>
            <h2 id="checklist-title" className="mt-2 font-display text-2xl font-bold sm:text-3xl text-[#17302A]">
              Your day-by-day checklist
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid min-h-[44px] min-w-[44px] place-items-center rounded-full border border-[#DCE4DA] bg-white text-[#17302A] hover:border-[#1F4D3A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2A33A]"
            aria-label="Close generated checklist"
          >
            <X aria-hidden="true" size={20} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="mt-8 rounded-[18px] border border-dashed border-[#C9D3C8] bg-white p-8 text-center">
            <h3 className="font-display text-lg font-bold text-[#17302A]">No places selected yet</h3>
            <p className="mt-2 text-[#4F6358] text-sm">
              Close this window, add some places to your trip, then generate your checklist.
            </p>
          </div>
        ) : (
          <>
            <section className="prep-checklist" aria-labelledby="prep-title">
              <div className="prep-checklist__heading">
                <div>
                  <p className="prep-kicker">A calmer departure</p>
                  <h3 id="prep-title">Before you go</h3>
                </div>
                <span>
                  {checkedPrepIds.size}/
                  {GENERAL_CHECKLIST.length +
                    locations.reduce((count, city) => count + (LOCATION_CHECKLISTS[city]?.length || 0), 0)}{' '}
                  done
                </span>
              </div>
              <div className="prep-checklist__group">
                <h4>Every Cambodia trip</h4>
                {GENERAL_CHECKLIST.map(item => (
                  <ChecklistItem
                    key={item.id}
                    item={item}
                    checked={checkedPrepIds.has(item.id)}
                    onToggle={toggleChecklistItem}
                  />
                ))}
              </div>
              {locations.map(city => (
                <div className="prep-checklist__group" key={city}>
                  <h4>{city}</h4>
                  {(LOCATION_CHECKLISTS[city] || []).map(item => (
                    <ChecklistItem
                      key={item.id}
                      item={item}
                      checked={checkedPrepIds.has(item.id)}
                      onToggle={toggleChecklistItem}
                    />
                  ))}
                </div>
              ))}
            </section>

            <section className="transport-section" aria-labelledby="transport-title">
              <div className="transport-section__heading">
                <div>
                  <p className="prep-kicker">Choose your shape</p>
                  <h3 id="transport-title">Your route</h3>
                </div>
                <span>{formatMoney(selectedTransportCost, currency)} est. transport</span>
              </div>
              <p className="transport-disclaimer">
                Your route follows the order of cities in your saved stops. Move a city up or down, then choose how you want to travel between each leg.
              </p>
              <div className="route-rail" aria-label="Selected city route">
                {locations.map((city, index) => (
                  <div className="route-stop" key={city}>
                    <div className="route-stop__node">{index + 1}</div>
                    <b>{city}</b>
                    <div className="route-stop__controls">
                      <button
                        type="button"
                        onMouseDown={event => event.preventDefault()}
                        onClick={() => moveCity(city, -1)}
                        disabled={index === 0}
                        aria-label={`Move ${city} earlier`}
                      >
                        <ArrowUp size={14} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                      </button>
                      <button
                        type="button"
                        onMouseDown={event => event.preventDefault()}
                        onClick={() => moveCity(city, 1)}
                        disabled={index === locations.length - 1}
                        aria-label={`Move ${city} later`}
                      >
                        <ArrowDown size={14} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                      </button>
                    </div>
                    {index < locations.length - 1 && <i className="route-stop__line" />}
                  </div>
                ))}
              </div>
              <RoutePreviewMap locations={locations} />
              <p className="transport-disclaimer">
                Times and prices change by season, operator, and weather. Confirm schedules and the final fare before booking.
              </p>
              {transportLegs
                .filter(leg => leg.options.length)
                .map(leg => (
                  <TransportGroup
                    key={`${leg.from}-${leg.to}`}
                    title={`${leg.from} to ${leg.to}`}
                    options={leg.options}
                    selectedIndex={selectedTransport[`${leg.from}-${leg.to}`] || 0}
                    onSelect={index =>
                      setSelectedTransport(current => ({ ...current, [`${leg.from}-${leg.to}`]: index }))
                    }
                  />
                ))}
              {locations.map(city => (
                <TransportGroup key={city} title={`Around ${city}`} options={LOCAL_TRANSPORT[city] || []} local />
              ))}
            </section>

            <div className="mt-6 space-y-4">
              {buildDays(orderedItems, tripDays).map((day, index) => (
                <section
                  key={index}
                  className="rounded-[18px] border border-[#DCE4DA] bg-white p-4 sm:p-5 shadow-sm"
                  aria-labelledby={`day-${index + 1}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 id={`day-${index + 1}`} className="font-display text-lg font-bold text-[#17302A]">
                      Day {index + 1}
                    </h3>
                    {day.places.length > 0 && (
                      <p className="flex items-center gap-1.5 text-xs font-semibold text-[#4F6358]">
                        <Clock3 aria-hidden="true" size={15} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                        {day.hours}h · {formatMoney(day.cost, currency)}
                      </p>
                    )}
                  </div>
                  {day.places.length === 0 ? (
                    <p className="mt-4 text-xs text-[#4F6358]">
                      Rest day. Leave room for weather, laundry, or a place you discover on the way.
                    </p>
                  ) : (
                    <ul className="mt-4 divide-y divide-[#DCE4DA]">
                      {day.places.map((place) => {
                        const inputId = `check-${place.id}`
                        return (
                          <li key={place.id} className="py-3 first:pt-0 last:pb-0">
                            <label htmlFor={inputId} className="flex min-h-[44px] cursor-pointer items-start gap-3">
                              <input
                                id={inputId}
                                type="checkbox"
                                checked={checkedPlaceIds.has(place.id)}
                                onChange={() => togglePlaceItem(place.id)}
                                className="mt-1 h-5 w-5 rounded border-[#DCE4DA] accent-[#1F4D3A] focus:ring-2 focus:ring-[#F2A33A]"
                              />
                              <span>
                                <span
                                  className={`block font-display font-semibold text-sm text-[#17302A] ${
                                    checkedPlaceIds.has(place.id) ? 'line-through text-[#4F6358]' : ''
                                  }`}
                                >
                                  {place.name}
                                </span>
                                <span className="mt-0.5 block text-xs text-[#4F6358]">
                                  {place.city} · {formatMoney(place.cost, currency)} · {place.time}h
                                </span>
                                <span className="mt-0.5 block text-xs italic text-[#4F6358]">
                                  Tip: {place.tip}
                                </span>
                              </span>
                            </label>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </section>
              ))}
            </div>
            <p className="mt-6 flex items-center gap-2 text-xs font-medium text-[#1F4D3A]">
              <CheckCircle2 aria-hidden="true" size={18} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              Check off each stop as your trip takes shape.
            </p>
          </>
        )}
      </section>
    </div>
  )
}

function ChecklistItem({ item, checked, onToggle }) {
  return (
    <label className={`prep-item${checked ? ' is-checked' : ''}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={() => onToggle(item.id)}
      />
      <span>{item.label}</span>
    </label>
  )
}

function TransportGroup({ title, options, local = false, selectedIndex, onSelect }) {
  if (!options.length) return null
  return (
    <div className="transport-group">
      <h4>{title}</h4>
      <div className="transport-options">
        {options.map((option, index) => (
          <button
            type="button"
            className={`transport-option${!local && selectedIndex === index ? ' is-selected' : ''}`}
            onClick={() => !local && onSelect?.(index)}
            key={`${title}-${option.title}`}
            aria-pressed={!local && selectedIndex === index}
          >
            <div className="transport-option__top">
              <span>{option.mode}</span>
              <b>{option.title}</b>
              <em>{local ? option.cost : `${option.time} · ${option.cost}`}</em>
            </div>
            <p>{option.detail}</p>
            <small>{option.fit || 'Reference option'}</small>
          </button>
        ))}
      </div>
    </div>
  )
}

function RoutePreviewMap({ locations }) {
  const points = locations.map(city => CITIES.find(item => item.name === city)).filter(Boolean)
  if (points.length < 2) return null
  const coordinates = points.map(city => city.coords)
  return (
    <div className="route-map-wrap">
      <MapContainer
        className="route-map"
        center={[12.5657, 104.991]}
        zoom={6}
        minZoom={5}
        maxZoom={10}
        scrollWheelZoom={false}
        dragging={false}
        doubleClickZoom={false}
        zoomControl={false}
        attributionControl={false}
      >
        <RouteMapSizeFix />
        <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Polyline positions={coordinates} pathOptions={{ color: '#F2A33A', weight: 3, dashArray: '7 8' }} />
        {points.map((city, index) => (
          <CircleMarker
            key={city.name}
            center={city.coords}
            radius={7}
            pathOptions={{ color: '#F8FAF6', weight: 3, fillColor: '#1F4D3A', fillOpacity: 1 }}
          >
            <Tooltip direction="top" offset={[0, -8]} permanent>
              {index + 1}. {city.name}
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
      <p>Approximate planning route · roads and ferry legs may differ</p>
    </div>
  )
}

function RouteMapSizeFix() {
  const map = useMap()

  useEffect(() => {
    const firstFrame = window.requestAnimationFrame(() => map.invalidateSize({ pan: false }))
    return () => window.cancelAnimationFrame(firstFrame)
  })

  return null
}
