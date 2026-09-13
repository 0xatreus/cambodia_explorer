import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, Compass, Menu, Plus, Sparkles, User, WifiOff } from 'lucide-react'
import AccountPanel from './components/AccountPanel'
import MapView from './components/MapView'
import SlideOver from './components/SlideOver'
import ItineraryBar from './components/ItineraryBar'
import SwipeBrowser from './components/SwipeBrowser'
import { CATEGORY_COLORS, CITIES, DIETARY_TAGS, PLACES, STARTER_ROUTES, VIBE_TAGS } from './data/places'
import { CURRENCIES, formatMoney } from './data/money'
import { api } from './lib/api'
import { parseTrip, placesFromIds } from './lib/tripValidation'

const GeneratePlanModal = lazy(() => import('./components/GeneratePlanModal'))

export default function App() {
  const [activeCity, setActiveCity] = useState('Siem Reap')
  const [activeCategory, setActiveCategory] = useState('All')
  const [activeVibes, setActiveVibes] = useState([])
  const [showEverything, setShowEverything] = useState(false)
  const [selected, setSelected] = useState(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [itinerary, setItinerary] = useState([])
  const [days, setDays] = useState(5)
  const [tier, setTier] = useState('value')
  const [isPlanOpen, setIsPlanOpen] = useState(false)
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const [user, setUser] = useState(null)
  const [isAccountOpen, setIsAccountOpen] = useState(false)
  const [currency, setCurrency] = useState('USD')
  const [partySize, setPartySize] = useState(1)
  const [activeTripId, setActiveTripId] = useState(null)
  const [lowData, setLowData] = useState(() => window.sessionStorage.getItem('ce-low-data') === 'true')
  const [isOnline, setIsOnline] = useState(() => navigator.onLine)
  const itineraryIds = useMemo(() => new Set(itinerary.map(place => place.id)), [itinerary])
  const categories = useMemo(() => ['All', ...new Set(PLACES.filter(place => place.city === activeCity).map(place => place.category))], [activeCity])
  const filteredPlaces = useMemo(() => {
    const cityPlaces = PLACES.filter(place => place.city === activeCity)
    const highlights = cityPlaces.filter(place => place.vibeTags.includes('must-see') || place.tags?.includes('must-see'))
    const source = showEverything || !highlights.length ? cityPlaces : highlights
    return source.filter(place => (activeCategory === 'All' || place.category === activeCategory) && (!activeVibes.length || activeVibes.every(vibe => place.vibeTags.includes(vibe) || place.dietaryTags.includes(vibe))))
  }, [activeCity, activeCategory, activeVibes, showEverything])

  useEffect(() => {
    api.me().then(result => setUser(result.user)).catch(() => setUser(null))
    const saved = window.localStorage.getItem('ce-guest-trip')
    const shared = new URLSearchParams(window.location.hash.slice(1)).get('trip')
    if (shared) {
      try {
        const trip = parseTrip(JSON.parse(decodeURIComponent(shared)))
        if (!saved || window.confirm('Load shared trip and replace your current one?')) {
          setItinerary(placesFromIds(trip.placeIds))
          setDays(trip.days)
          setTier(trip.tier)
          setCurrency(trip.currency)
          setPartySize(trip.partySize)
          setAnnouncement('Shared trip loaded.')
        }
        window.history.replaceState({}, '', window.location.pathname)
      } catch { window.history.replaceState({}, '', window.location.pathname) }
    } else if (saved) {
      try {
        const trip = parseTrip(JSON.parse(saved))
        setItinerary(placesFromIds(trip.placeIds))
        setDays(trip.days)
        setTier(trip.tier)
        setCurrency(trip.currency)
        setPartySize(trip.partySize)
      } catch { window.localStorage.removeItem('ce-guest-trip') }
    }
    const updateOnline = () => setIsOnline(navigator.onLine)
    window.addEventListener('online', updateOnline)
    window.addEventListener('offline', updateOnline)
    return () => { window.removeEventListener('online', updateOnline); window.removeEventListener('offline', updateOnline) }
  }, [])

  useEffect(() => {
    window.localStorage.setItem('ce-guest-trip', JSON.stringify({ placeIds: itinerary.map(place => place.id), days, tier, currency, partySize }))
  }, [itinerary, days, tier, currency, partySize])

  useEffect(() => {
    if (itinerary.length) setAnnouncement(`Budget updated for ${partySize} ${partySize === 1 ? 'traveller' : 'travellers'}, ${days} days, in ${currency}.`)
  }, [days, tier, currency, partySize])

  useEffect(() => { window.sessionStorage.setItem('ce-low-data', String(lowData)) }, [lowData])

  const openPlace = useCallback(place => { setSelected(place); setIsDetailsOpen(true) }, [])
  const selectCity = useCallback(city => { setActiveCity(city); setActiveCategory('All'); setActiveVibes([]) }, [])
  const addToItinerary = useCallback(place => {
    if (itineraryIds.has(place.id)) { setAnnouncement(`${place.name} is already saved.`); return }
    setItinerary(items => [...items, place]); setAnnouncement(`${place.name} added to your trip.`); setIsDetailsOpen(false)
  }, [itineraryIds])
  const removePlace = useCallback(id => { const removed = itinerary.find(place => place.id === id); setItinerary(items => items.filter(place => place.id !== id)); if (removed) setAnnouncement(`${removed.name} removed from your trip.`) }, [itinerary])
  const clearItinerary = useCallback(() => { setItinerary([]); setActiveTripId(null); setAnnouncement('Your trip was cleared.') }, [])
  const openPlan = useCallback(() => { setIsPlanOpen(true); setAnnouncement('Your day-by-day checklist is ready.') }, [])
  const closePlan = useCallback(() => setIsPlanOpen(false), [])
  const loadTrip = useCallback(trip => {
    setItinerary(trip.placeIds.map(id => PLACES.find(place => place.id === id)).filter(Boolean))
    setDays(trip.days)
    setTier(trip.tier)
    setActiveTripId(trip.id)
    setAnnouncement(`${trip.name} loaded.`)
    document.querySelector('#explore')?.scrollIntoView({ behavior: 'smooth' })
  }, [])
  const reorderItinerary = useCallback(items => setItinerary(items), [])
  const applyRoute = route => { setItinerary(route.ids.map(id => PLACES.find(place => place.id === id)).filter(Boolean)); setDays(route.days); setActiveTripId(null); setAnnouncement(`${route.title} is ready to make your own.`); document.querySelector('#explore')?.scrollIntoView({ behavior: 'smooth' }) }
  const toggleVibe = vibe => setActiveVibes(current => current.includes(vibe) ? current.filter(item => item !== vibe) : [...current, vibe])
  const shareTrip = async () => {
    const payload = encodeURIComponent(JSON.stringify({ placeIds: itinerary.map(place => place.id), days, tier, currency, partySize }))
    const url = `${window.location.origin}${window.location.pathname}#trip=${payload}`
    try {
      if (navigator.share) await navigator.share({ title: 'My Cambodia trip', url })
      else { await navigator.clipboard.writeText(url); setAnnouncement('Share link copied.') }
    } catch (error) {
      if (error.name !== 'AbortError') setAnnouncement('Share link ready in the address bar.')
    }
  }
  const exportTrip = () => {
    const canvas = document.createElement('canvas')
    canvas.width = 1080
    canvas.height = 1920
    const context = canvas.getContext('2d')
    context.fillStyle = '#fbfaf5'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = '#173f39'
    context.font = '600 64px Georgia'
    context.fillText('CAMBODIA', 76, 130)
    context.fillStyle = '#d55732'
    context.font = '700 28px Arial'
    context.fillText('MY TRIP', 80, 182)
    context.fillStyle = '#173f39'
    context.font = '600 34px Arial'
    context.fillText(`${days} days · ${itinerary.length} stops`, 80, 270)
    context.fillStyle = '#5d7770'
    context.font = '26px Arial'
    context.fillText('A plan made to be used, not just admired.', 80, 315)
    itinerary.slice(0, 12).forEach((place, index) => {
      const y = 415 + index * 100
      context.fillStyle = '#e8c763'
      context.beginPath()
      context.arc(100, y - 8, 22, 0, Math.PI * 2)
      context.fill()
      context.fillStyle = '#173f39'
      context.font = '700 22px Arial'
      context.fillText(String(index + 1), 93, y)
      context.font = '700 28px Arial'
      context.fillText(place.name.slice(0, 38), 150, y - 5)
      context.fillStyle = '#5d7770'
      context.font = '22px Arial'
      context.fillText(`${place.city} · ${formatMoney(place.cost, currency)} est.`, 150, y + 28)
    })
    context.fillStyle = '#173f39'
    context.font = '700 36px Arial'
    context.fillText('Pack lightly. Leave room for the unexpected.', 80, 1720)
    canvas.toBlob(blob => {
      if (!blob) return
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = 'cambodia-explorer-trip.png'
      link.click()
      URL.revokeObjectURL(link.href)
      setAnnouncement('Trip image downloaded.')
    }, 'image/png')
  }

  return <div className="app-shell">
    <a className="skip-link" href="#explore">Skip to explore</a>
    <header className="site-header"><a className="brand" href="#top" aria-label="Cambodia Explorer home"><span className="brand-mark">CE</span><span>CAMBODIA<br /><b>EXPLORER</b></span></a><nav className={isMobileNavOpen ? 'is-open' : ''}><a href="#explore" onClick={() => setIsMobileNavOpen(false)}>Explore</a><a href="#routes" onClick={() => setIsMobileNavOpen(false)}>Starter routes</a><a href="#about" onClick={() => setIsMobileNavOpen(false)}>Good to know</a></nav><button className="header-menu" aria-label="Open navigation" aria-expanded={isMobileNavOpen} onClick={() => setIsMobileNavOpen(open => !open)}><Menu size={21} /></button><div className="header-actions"><button className="header-account" onClick={() => setIsAccountOpen(true)}><User size={16} /><span>{user ? user.username : 'Sign in'}</span></button><button className="header-trip" onClick={() => document.querySelector('.trip-dock')?.click()}><span className="header-trip__count">{itinerary.length}</span> Your trip</button></div></header>
    {!isOnline && <div className="offline-banner" role="status"><WifiOff size={15} /> Offline mode: your trip is still available on this device.</div>}
    <main id="top">
      <section className="hero"><div className="hero-copy"><p className="eyebrow"><Compass size={14} /> Cambodia, made easy</p><h1>Make your <em>Cambodia</em> trip feel like yours.</h1><p className="hero-text">Pick the moments that call to you. We’ll turn them into a simple, doable trip — with a budget you can trust.</p><div className="hero-actions"><button onClick={() => document.querySelector('#routes')?.scrollIntoView({ behavior: 'smooth' })}>Start with a route <ArrowRight size={17} /></button><a href="#explore">Explore the map</a></div><div className="hero-proof"><span><b>1 min</b> to a first draft</span><span><b>{PLACES.length}</b> handpicked places</span><span><b>$</b> clear costs</span></div></div><div className="hero-art" aria-label="An illustrated view of Cambodia’s temple landscape"><div className="sun" /><div className="temple temple--back" /><div className="temple temple--front"><i /><i /><i /></div><div className="palm palm--one">✺</div><div className="palm palm--two">✺</div><p>SIEM REAP · 13.36° N</p></div></section>
      <section id="routes" className="routes-section"><div className="section-intro"><p className="eyebrow"><Sparkles size={14} /> Don’t start from zero</p><h2>Pick a starting point.</h2><p>Steal one of these, then swap anything out.</p></div><div className="route-grid">{STARTER_ROUTES.map((route, index) => <article className={`route-card route-card--${index + 1}`} key={route.id}><p>{route.meta}</p><h3>{route.title}</h3><span>{route.description}</span><button onClick={() => applyRoute(route)}>Use this route <ArrowRight size={16} /></button></article>)}</div></section>
      <section id="explore" className="explorer"><div className="explorer-heading"><div><p className="eyebrow">The map, without the chaos</p><h2>What feels good today?</h2></div><p>Start with the places people remember — add more only when you want to.</p></div><ProvinceTabs activeCity={activeCity} onSelect={selectCity} activeVibes={activeVibes} onToggleVibe={toggleVibe} /><SwipeBrowser places={filteredPlaces} lowData={lowData} onAdd={addToItinerary} onOpen={openPlace} currency={currency} /><div className="explore-layout"><MapView activeCity={activeCity} filteredPlaces={filteredPlaces} itineraryIds={itineraryIds} onOpenPlace={openPlace} lowData={lowData} /><div className="place-panel"><div className="place-panel__top"><div><p>{activeCity}</p><h3>{showEverything ? 'Every place' : 'Local highlights'}</h3></div><div className="place-panel__controls"><span>{filteredPlaces.length} places</span><button type="button" onClick={() => setShowEverything(value => !value)} aria-pressed={showEverything}>{showEverything ? 'Highlights only' : 'Show everything'}</button></div></div><div className="filters">{categories.map(category => <button key={category} onClick={() => setActiveCategory(category)} className={activeCategory === category ? 'is-active' : ''} style={category !== 'All' ? { '--category-color': CATEGORY_COLORS[category] } : undefined}>{category}</button>)}</div><div className="place-list">{filteredPlaces.map(place => <article key={place.id} className="place-card" style={{ '--category-color': CATEGORY_COLORS[place.category] }}><div className={lowData ? 'place-image place-image--deferred' : 'place-image'}>{lowData ? 'Photo deferred in low-data mode' : <img src={place.image} alt="" />}</div><div className="place-card__body"><div><span>{place.category}</span><div className="place-tags" aria-label="Place tags">{place.tags?.slice(0, 3).map(tag => <em key={tag}>{tag}</em>)}</div><b>{place.name}</b><p>{place.description}</p></div><div className="place-card__foot"><small>{formatMoney(place.cost, currency)} <i>·</i> {place.time}h</small><button onClick={() => itineraryIds.has(place.id) ? removePlace(place.id) : addToItinerary(place)} className={itineraryIds.has(place.id) ? 'is-added' : ''} aria-label={`${itineraryIds.has(place.id) ? 'Remove' : 'Add'} ${place.name}`}>{itineraryIds.has(place.id) ? '✓ Saved' : <><Plus size={15} /> Add</>}</button></div></div></article>)}</div></div></div></section>
      <section id="about" className="trust-row"><div><span>01</span><h3>Small by design</h3><p>We start you with the standout stops, not a giant directory.</p></div><div><span>02</span><h3>Costs, explained</h3><p>Your total includes daily basics and the experiences you choose.</p></div><div><span>03</span><h3>Made to use there</h3><p>Turn your saved list into a simple day-by-day checklist.</p></div></section>
    </main>
    <SlideOver place={selected} open={isDetailsOpen} isAdded={selected ? itineraryIds.has(selected.id) : false} onClose={() => setIsDetailsOpen(false)} onAdd={addToItinerary} lowData={lowData} currency={currency} />
    <ItineraryBar items={itinerary} onRemove={removePlace} onClear={clearItinerary} onOpenPlan={openPlan} onShare={shareTrip} onExport={exportTrip} days={days} onChangeDays={setDays} tier={tier} onChangeTier={setTier} currency={currency} onChangeCurrency={setCurrency} partySize={partySize} onChangePartySize={setPartySize} />
    <AccountPanel open={isAccountOpen} onClose={() => setIsAccountOpen(false)} user={user} onAuthChange={setUser} items={itinerary} days={days} tier={tier} onLoadTrip={loadTrip} activeTripId={activeTripId} onActiveTripIdChange={setActiveTripId} />
    {isPlanOpen && <Suspense fallback={<p className="plan-loading" role="status">Preparing your checklist...</p>}><GeneratePlanModal open items={itinerary} tripDays={days} currency={currency} onClose={closePlan} onReorder={reorderItinerary} /></Suspense>}
    <button type="button" className="low-data-toggle" onClick={() => setLowData(value => !value)} aria-pressed={lowData}>{lowData ? 'Low-data on' : 'Low-data off'}</button>
    <p className="sr-only" aria-live="polite">{announcement}</p>
  </div>
}

function ProvinceTabs({ activeCity, onSelect, activeVibes, onToggleVibe }) {
  const rowRef = useRef(null)
  const [filterPanelOpen, setFilterPanelOpen] = useState(false)
  const dragRef = useRef({ active: false, startX: 0, startScroll: 0, moved: false })

  const handlePointerDown = event => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    const row = rowRef.current
    if (!row) return
    dragRef.current = { active: true, startX: event.clientX, startScroll: row.scrollLeft, moved: false }
    row.classList.add('is-dragging')
  }

  const handlePointerMove = event => {
    const row = rowRef.current
    const drag = dragRef.current
    if (!row || !drag.active) return
    const distance = event.clientX - drag.startX
    if (!drag.moved && Math.abs(distance) > 4) {
      drag.moved = true
      row.setPointerCapture?.(event.pointerId)
    }
    row.scrollLeft = drag.startScroll - distance
  }

  const stopDragging = event => {
    const row = rowRef.current
    if (!row) return
    dragRef.current.active = false
    row.releasePointerCapture?.(event.pointerId)
    row.classList.remove('is-dragging')
  }

  const handleClick = (event, city) => {
    if (dragRef.current.moved) {
      event.preventDefault()
      dragRef.current.moved = false
      return
    }
    onSelect(city)
  }

  const handleWheel = event => {
    const row = rowRef.current
    if (!row || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return
    event.preventDefault()
    row.scrollLeft += event.deltaY
  }

  const filterCount = activeVibes.length
  return <div className="city-tabs-frame"><div className="city-tabs-row"><div ref={rowRef} className="city-tabs" role="tablist" aria-label="Choose a destination" onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={stopDragging} onPointerCancel={stopDragging} onWheel={handleWheel}>{CITIES.map(city => <button role="tab" aria-selected={activeCity === city.name} key={city.name} onClick={event => handleClick(event, city.name)}><i style={{ background: city.color }} />{city.name}</button>)}</div><button type="button" className={`feeling-trigger${filterCount ? ' has-filters' : ''}`} aria-expanded={filterPanelOpen} aria-controls="feeling-filters" onClick={() => setFilterPanelOpen(value => !value)}>Feeling{filterCount > 0 && <span>{filterCount}</span>}</button></div>{filterPanelOpen && <div id="feeling-filters" className="feeling-panel"><div><b>Vibes</b><div className="filters vibe-filters">{VIBE_TAGS.map(vibe => <button type="button" key={vibe.id} onClick={() => onToggleVibe(vibe.id)} className={activeVibes.includes(vibe.id) ? 'is-active' : ''} aria-pressed={activeVibes.includes(vibe.id)}>{vibe.label}</button>)}</div></div><div><b>Dietary</b><div className="filters dietary-filters">{DIETARY_TAGS.map(vibe => <button type="button" key={vibe.id} onClick={() => onToggleVibe(vibe.id)} className={activeVibes.includes(vibe.id) ? 'is-active' : ''} aria-pressed={activeVibes.includes(vibe.id)}>{vibe.label}</button>)}</div></div></div>}</div>
}
