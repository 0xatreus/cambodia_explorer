import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, Compass, Menu, Plus, Sparkles, User } from 'lucide-react'
import AccountPanel from './components/AccountPanel'
import MapView from './components/MapView'
import SlideOver from './components/SlideOver'
import ItineraryBar from './components/ItineraryBar'
import { CATEGORY_COLORS, CITIES, PLACES, STARTER_ROUTES } from './data/places'
import { api } from './lib/api'

const GeneratePlanModal = lazy(() => import('./components/GeneratePlanModal'))

export default function App() {
  const [activeCity, setActiveCity] = useState('Siem Reap')
  const [activeCategory, setActiveCategory] = useState('All')
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
  const itineraryIds = useMemo(() => new Set(itinerary.map(place => place.id)), [itinerary])
  const categories = useMemo(() => ['All', ...new Set(PLACES.filter(place => place.city === activeCity).map(place => place.category))], [activeCity])
  const filteredPlaces = useMemo(() => PLACES.filter(place => place.city === activeCity && (activeCategory === 'All' || place.category === activeCategory)), [activeCity, activeCategory])

  useEffect(() => { api.me().then(result => setUser(result.user)).catch(() => setUser(null)) }, [])

  const openPlace = useCallback(place => { setSelected(place); setIsDetailsOpen(true) }, [])
  const selectCity = useCallback(city => { setActiveCity(city); setActiveCategory('All') }, [])
  const addToItinerary = useCallback(place => {
    if (itineraryIds.has(place.id)) { setAnnouncement(`${place.name} is already saved.`); return }
    setItinerary(items => [...items, place]); setAnnouncement(`${place.name} added to your trip.`); setIsDetailsOpen(false)
  }, [itineraryIds])
  const removePlace = useCallback(id => { const removed = itinerary.find(place => place.id === id); setItinerary(items => items.filter(place => place.id !== id)); if (removed) setAnnouncement(`${removed.name} removed from your trip.`) }, [itinerary])
  const clearItinerary = useCallback(() => { setItinerary([]); setAnnouncement('Your trip was cleared.') }, [])
  const openPlan = useCallback(() => { setIsPlanOpen(true); setAnnouncement('Your day-by-day checklist is ready.') }, [])
  const closePlan = useCallback(() => setIsPlanOpen(false), [])
  const loadTrip = useCallback(trip => {
    setItinerary(trip.placeIds.map(id => PLACES.find(place => place.id === id)).filter(Boolean))
    setDays(trip.days)
    setTier(trip.tier)
    setAnnouncement(`${trip.name} loaded.`)
    document.querySelector('#explore')?.scrollIntoView({ behavior: 'smooth' })
  }, [])
  const reorderItinerary = useCallback(items => setItinerary(items), [])
  const applyRoute = route => { setItinerary(route.ids.map(id => PLACES.find(place => place.id === id))); setDays(route.days); setAnnouncement(`${route.title} is ready to make your own.`); document.querySelector('#explore')?.scrollIntoView({ behavior: 'smooth' }) }

  return <div className="app-shell">
    <a className="skip-link" href="#explore">Skip to explore</a>
    <header className="site-header"><a className="brand" href="#top" aria-label="Cambodia Explorer home"><span className="brand-mark">CE</span><span>CAMBODIA<br /><b>EXPLORER</b></span></a><nav className={isMobileNavOpen ? 'is-open' : ''}><a href="#explore" onClick={() => setIsMobileNavOpen(false)}>Explore</a><a href="#routes" onClick={() => setIsMobileNavOpen(false)}>Starter routes</a><a href="#about" onClick={() => setIsMobileNavOpen(false)}>Good to know</a></nav><button className="header-menu" aria-label="Open navigation" aria-expanded={isMobileNavOpen} onClick={() => setIsMobileNavOpen(open => !open)}><Menu size={21} /></button><div className="header-actions"><button className="header-account" onClick={() => setIsAccountOpen(true)}><User size={16} /><span>{user ? user.username : 'Sign in'}</span></button><button className="header-trip" onClick={() => document.querySelector('.trip-dock')?.click()}><span className="header-trip__count">{itinerary.length}</span> Your trip</button></div></header>
    <main id="top">
      <section className="hero"><div className="hero-copy"><p className="eyebrow"><Compass size={14} /> Cambodia, made easy</p><h1>Make your <em>Cambodia</em> trip feel like yours.</h1><p className="hero-text">Pick the moments that call to you. We’ll turn them into a simple, doable trip — with a budget you can trust.</p><div className="hero-actions"><button onClick={() => document.querySelector('#routes')?.scrollIntoView({ behavior: 'smooth' })}>Start with a route <ArrowRight size={17} /></button><a href="#explore">Explore the map</a></div><div className="hero-proof"><span><b>1 min</b> to a first draft</span><span><b>{PLACES.length}</b> handpicked places</span><span><b>$</b> clear costs</span></div></div><div className="hero-art" aria-label="An illustrated view of Cambodia’s temple landscape"><div className="sun" /><div className="temple temple--back" /><div className="temple temple--front"><i /><i /><i /></div><div className="palm palm--one">✺</div><div className="palm palm--two">✺</div><p>SIEM REAP · 13.36° N</p></div></section>
      <section id="routes" className="routes-section"><div className="section-intro"><p className="eyebrow"><Sparkles size={14} /> Don’t start from zero</p><h2>Pick a starting point.</h2><p>Steal one of these, then swap anything out.</p></div><div className="route-grid">{STARTER_ROUTES.map((route, index) => <article className={`route-card route-card--${index + 1}`} key={route.id}><p>{route.meta}</p><h3>{route.title}</h3><span>{route.description}</span><button onClick={() => applyRoute(route)}>Use this route <ArrowRight size={16} /></button></article>)}</div></section>
      <section id="explore" className="explorer"><div className="explorer-heading"><div><p className="eyebrow">The map, without the chaos</p><h2>What feels good today?</h2></div><p>Start with the places people remember — add more only when you want to.</p></div><ProvinceTabs activeCity={activeCity} onSelect={selectCity} /><div className="explore-layout"><MapView activeCity={activeCity} filteredPlaces={filteredPlaces} itineraryIds={itineraryIds} onOpenPlace={openPlace} onSelectCity={selectCity} /><div className="place-panel"><div className="place-panel__top"><div><p>{activeCity}</p><h3>Local highlights</h3></div><span>{filteredPlaces.length} places</span></div><div className="filters">{categories.map(category => <button key={category} onClick={() => setActiveCategory(category)} className={activeCategory === category ? 'is-active' : ''} style={category !== 'All' ? { '--category-color': CATEGORY_COLORS[category] } : undefined}>{category}</button>)}</div><div className="place-list">{filteredPlaces.map(place => <article key={place.id} className="place-card" style={{ '--category-color': CATEGORY_COLORS[place.category] }}><img src={place.image} alt="" /><div className="place-card__body"><div><span>{place.category}</span><div className="place-tags" aria-label="Place tags">{place.tags?.slice(0, 3).map(tag => <em key={tag}>{tag}</em>)}</div><b>{place.name}</b><p>{place.description}</p></div><div className="place-card__foot"><small>${place.cost} <i>·</i> {place.time}h</small><button onClick={() => itineraryIds.has(place.id) ? removePlace(place.id) : addToItinerary(place)} className={itineraryIds.has(place.id) ? 'is-added' : ''} aria-label={`${itineraryIds.has(place.id) ? 'Remove' : 'Add'} ${place.name}`}>{itineraryIds.has(place.id) ? '✓ Saved' : <><Plus size={15} /> Add</>}</button></div></div></article>)}</div></div></div></section>
      <section id="about" className="trust-row"><div><span>01</span><h3>Small by design</h3><p>We start you with the standout stops, not a giant directory.</p></div><div><span>02</span><h3>Costs, explained</h3><p>Your total includes daily basics and the experiences you choose.</p></div><div><span>03</span><h3>Made to use there</h3><p>Turn your saved list into a simple day-by-day checklist.</p></div></section>
    </main>
    <SlideOver place={selected} open={isDetailsOpen} isAdded={selected ? itineraryIds.has(selected.id) : false} onClose={() => setIsDetailsOpen(false)} onAdd={addToItinerary} />
    <ItineraryBar items={itinerary} onRemove={removePlace} onClear={clearItinerary} onOpenPlan={openPlan} days={days} onChangeDays={setDays} tier={tier} onChangeTier={setTier} />
    <AccountPanel open={isAccountOpen} onClose={() => setIsAccountOpen(false)} user={user} onAuthChange={setUser} items={itinerary} days={days} tier={tier} onLoadTrip={loadTrip} />
    {isPlanOpen && <Suspense fallback={<p className="plan-loading" role="status">Preparing your checklist...</p>}><GeneratePlanModal open items={itinerary} tripDays={days} onClose={closePlan} onReorder={reorderItinerary} /></Suspense>}
    <p className="sr-only" aria-live="polite">{announcement}</p>
  </div>
}

function ProvinceTabs({ activeCity, onSelect }) {
  const rowRef = useRef(null)
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

  return <div className="city-tabs-frame"><div ref={rowRef} className="city-tabs" role="tablist" aria-label="Choose a destination" onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={stopDragging} onPointerCancel={stopDragging} onWheel={handleWheel}>{CITIES.map(city => <button role="tab" aria-selected={activeCity === city.name} key={city.name} onClick={event => handleClick(event, city.name)}><i style={{ background: city.color }} />{city.name}</button>)}</div></div>
}
