import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Activity, ArrowRight, Bell, Compass, Landmark, Menu, Plus, Search, ThumbsUp, Trees, User, UtensilsCrossed, WifiOff } from 'lucide-react'
import AccountPanel from './components/AccountPanel'
import MapView from './components/MapView'
import SlideOver from './components/SlideOver'
import ItineraryBar from './components/ItineraryBar'
import SwipeBrowser from './components/SwipeBrowser'
import DestinationFilters from './components/DestinationFilters'
import SuggestionsDialog from './components/SuggestionsDialog'
import { CATEGORY_COLORS, PLACES, STARTER_ROUTES } from './data/places'
import { formatMoney } from './data/money'
import { api } from './lib/api'
import { parseTrip } from './lib/tripValidation'
import { suggestionToPlace } from './lib/communityPlaces'

const GeneratePlanModal = lazy(() => import('./components/GeneratePlanModal'))
const AdminDashboard = lazy(() => import('./components/AdminDashboard'))
const CATEGORY_ICONS = { Sights: Landmark, Food: UtensilsCrossed, Nature: Trees, Activities: Activity }

export default function App() {
  const [activeCity, setActiveCity] = useState('Siem Reap')
  const [activeCategory, setActiveCategory] = useState('All')
  const [activeVibes, setActiveVibes] = useState([])
  const [showEverything, setShowEverything] = useState(false)
  const [selected, setSelected] = useState(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [focusedPlace, setFocusedPlace] = useState(null)
  const [itinerary, setItinerary] = useState([])
  const [days, setDays] = useState(5)
  const [tier, setTier] = useState('value')
  const [isPlanOpen, setIsPlanOpen] = useState(false)
  const [isTripPanelOpen, setIsTripPanelOpen] = useState(false)
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)
  const [isStarterRoutesVisible, setIsStarterRoutesVisible] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const [user, setUser] = useState(null)
  const [isAccountOpen, setIsAccountOpen] = useState(false)
  const [currency, setCurrency] = useState('USD')
  const [partySize, setPartySize] = useState(1)
  const [activeTripId, setActiveTripId] = useState(null)
  const [lowData, setLowData] = useState(() => window.sessionStorage.getItem('ce-low-data') === 'true')
  const [isOnline, setIsOnline] = useState(() => navigator.onLine)
  const [communityOnly, setCommunityOnly] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [isSuggestOpen, setIsSuggestOpen] = useState(false)
  const [suggestInitialTab, setSuggestInitialTab] = useState('new')
  const [unreadCount, setUnreadCount] = useState(0)
  const [isAdminRoute, setIsAdminRoute] = useState(() => window.location.pathname === '/admin')
  const [communityPlaces, setCommunityPlaces] = useState([])
  const pendingCommunityIds = useRef([])
  const allPlaces = useMemo(() => [...PLACES, ...communityPlaces], [communityPlaces])
  const itineraryIds = useMemo(() => new Set(itinerary.map(place => place.id)), [itinerary])
  const categories = useMemo(() => ['All', ...new Set(allPlaces.filter(place => place.province === activeCity).map(place => place.category))], [activeCity, allPlaces])
  const allPlacesRef = useRef(allPlaces)
  allPlacesRef.current = allPlaces
  const tripCounts = useMemo(() => itinerary.reduce((counts, place) => ({ ...counts, [place.province]: (counts[place.province] || 0) + 1 }), {}), [itinerary])
  const filteredPlaces = useMemo(() => {
    const cityPlaces = allPlaces.filter(place => place.province === activeCity)
    const highlights = cityPlaces.filter(place => place.vibeTags.includes('must-see') || place.tags?.includes('must-see') || place.suggestionId)
    const query = searchTerm.trim().toLowerCase()
    const hasSearch = query.length > 0
    const source = showEverything || communityOnly || hasSearch || !highlights.length ? cityPlaces : highlights
    return source.filter(place => (activeCategory === 'All' || place.category === activeCategory) && (!activeVibes.length || activeVibes.every(vibe => place.vibeTags.includes(vibe) || place.dietaryTags.includes(vibe))) && (!communityOnly || place.communityPick) && (!hasSearch || place.name.toLowerCase().includes(query) || place.description.toLowerCase().includes(query)))
  }, [allPlaces, activeCity, activeCategory, activeVibes, showEverything, communityOnly, searchTerm])

  // Community picks are fetched after first paint; ids that can't be resolved yet are kept and re-added once they arrive.
  const restorePlaces = useCallback(ids => {
    const known = new Map(allPlacesRef.current.map(place => [place.id, place]))
    pendingCommunityIds.current = ids.filter(id => id.startsWith('community-') && !known.has(id))
    return ids.map(id => known.get(id)).filter(Boolean)
  }, [])
  const refreshCommunity = useCallback(() => api.communityPlaces().then(result => setCommunityPlaces(result.places.map(suggestionToPlace))).catch(() => {}), [])
  useEffect(() => { refreshCommunity() }, [refreshCommunity, user])
  const refreshNotifications = useCallback(() => {
    if (!user) { setUnreadCount(0); return }
    api.notifications().then(result => setUnreadCount(result.unreadCount || 0)).catch(() => {})
  }, [user])
  useEffect(() => { refreshNotifications() }, [refreshNotifications])
  useEffect(() => {
    if (!pendingCommunityIds.current.length) return
    const known = new Map(communityPlaces.map(place => [place.id, place]))
    const found = pendingCommunityIds.current.map(id => known.get(id)).filter(Boolean)
    pendingCommunityIds.current = []
    if (found.length) setItinerary(items => [...items, ...found.filter(place => !items.some(item => item.id === place.id))])
  }, [communityPlaces])
  const toggleLike = useCallback(async place => {
    if (!user) { setAnnouncement('Sign in to like community picks.'); setIsAccountOpen(true); return }
    try {
      const result = await api.likeSuggestion(place.suggestionId, !place.liked)
      setCommunityPlaces(items => items.map(item => (item.id === place.id ? { ...item, likes: result.likes, liked: result.liked } : item)))
    } catch (error) { setAnnouncement(error.message) }
  }, [user])

  useEffect(() => {
    api.me().then(result => setUser(result.user)).catch(() => setUser(null))
    const saved = window.localStorage.getItem('ce-guest-trip')
    const shared = new URLSearchParams(window.location.hash.slice(1)).get('trip')
    if (shared) {
      try {
        const trip = parseTrip(JSON.parse(decodeURIComponent(shared)))
        if (!saved || window.confirm('Load shared trip and replace your current one?')) {
          setItinerary(restorePlaces(trip.placeIds))
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
        setItinerary(restorePlaces(trip.placeIds))
        setDays(trip.days)
        setTier(trip.tier)
        setCurrency(trip.currency)
        setPartySize(trip.partySize)
      } catch { window.localStorage.removeItem('ce-guest-trip') }
    }
    const updateOnline = () => setIsOnline(navigator.onLine)
    const updateRoute = () => setIsAdminRoute(window.location.pathname === '/admin')
    window.addEventListener('online', updateOnline)
    window.addEventListener('offline', updateOnline)
    window.addEventListener('popstate', updateRoute)
    return () => {
      window.removeEventListener('online', updateOnline)
      window.removeEventListener('offline', updateOnline)
      window.removeEventListener('popstate', updateRoute)
    }
  }, [restorePlaces])

  const navigateTo = useCallback(pathname => {
    if (window.location.pathname !== pathname) window.history.pushState({}, '', pathname)
    setIsAdminRoute(pathname === '/admin')
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [])

  useEffect(() => {
    window.localStorage.setItem('ce-guest-trip', JSON.stringify({ placeIds: itinerary.map(place => place.id), days, tier, currency, partySize }))
  }, [itinerary, days, tier, currency, partySize])

  useEffect(() => {
    if (itinerary.length) setAnnouncement(`Budget updated for ${partySize} ${partySize === 1 ? 'traveller' : 'travellers'}, ${days} days, in ${currency}.`)
  }, [days, tier, currency, partySize, itinerary.length])

  useEffect(() => { window.sessionStorage.setItem('ce-low-data', String(lowData)) }, [lowData])

  useEffect(() => {
    const routesSection = document.getElementById('routes')
    if (!routesSection) return undefined
    const observer = new IntersectionObserver(([entry]) => setIsStarterRoutesVisible(entry.isIntersecting), { threshold: 0.01 })
    observer.observe(routesSection)
    return () => observer.disconnect()
  }, [isAdminRoute])

  const openPlace = useCallback(place => { setSelected(place); setIsDetailsOpen(true) }, [])
  const selectCity = useCallback(city => { setActiveCity(city); setActiveCategory('All'); setActiveVibes([]); setFocusedPlace(null) }, [])
  const addToItinerary = useCallback(place => {
    if (itineraryIds.has(place.id)) { setAnnouncement(`${place.name} is already saved.`); return }
    setItinerary(items => [...items, place]); setAnnouncement(`${place.name} added to your trip.`); setIsDetailsOpen(false)
  }, [itineraryIds])
  const removePlace = useCallback(id => { const removed = itinerary.find(place => place.id === id); setItinerary(items => items.filter(place => place.id !== id)); if (removed) setAnnouncement(`${removed.name} removed from your trip.`) }, [itinerary])
  const clearItinerary = useCallback(() => { setItinerary([]); setActiveTripId(null); setAnnouncement('Your trip was cleared.') }, [])
  const openPlan = useCallback(() => { setIsPlanOpen(true); setAnnouncement('Your day-by-day checklist is ready.') }, [])
  const closePlan = useCallback(() => setIsPlanOpen(false), [])
  const loadTrip = useCallback(trip => {
    setItinerary(restorePlaces(trip.placeIds))
    setDays(trip.days)
    setTier(trip.tier)
    setActiveTripId(trip.id)
    setAnnouncement(`${trip.name} loaded.`)
    document.querySelector('#explore')?.scrollIntoView({ behavior: 'smooth' })
  }, [restorePlaces])
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
    context.fillStyle = '#F2F5EF'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = '#1F4D3A'
    context.font = '700 64px "Bricolage Grotesque", sans-serif'
    context.fillText('CAMBODIA', 76, 130)
    context.fillStyle = '#F2A33A'
    context.font = '700 28px "Bricolage Grotesque", sans-serif'
    context.fillText('MY TRIP', 80, 182)
    context.fillStyle = '#1F4D3A'
    context.font = '600 34px "Bricolage Grotesque", sans-serif'
    context.fillText(`${days} days · ${itinerary.length} stops`, 80, 270)
    context.fillStyle = '#4F6358'
    context.font = '26px "Figtree", sans-serif'
    context.fillText('A plan made to be used, not just admired.', 80, 315)
    itinerary.slice(0, 12).forEach((place, index) => {
      const y = 415 + index * 100
      context.fillStyle = '#FFF3DC'
      context.beginPath()
      context.arc(100, y - 8, 22, 0, Math.PI * 2)
      context.fill()
      context.fillStyle = '#1F4D3A'
      context.font = '700 22px "Bricolage Grotesque", sans-serif'
      context.fillText(String(index + 1), 93, y)
      context.font = '700 28px "Bricolage Grotesque", sans-serif'
      context.fillText(place.name.slice(0, 38), 150, y - 5)
      context.fillStyle = '#4F6358'
      context.font = '22px "Figtree", sans-serif'
      context.fillText(`${place.city} · ${formatMoney(place.cost, currency)} est.`, 150, y + 28)
    })
    context.fillStyle = '#1F4D3A'
    context.font = '600 36px "Bricolage Grotesque", sans-serif'
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

  const isAdmin = user?.role === 'admin' || Boolean(user?.isAdmin)

  return <div className="app-shell">
    <a className="skip-link" href="#explore">Skip to explore</a>
    <header className="site-header">
      <a className="brand" href="#top" aria-label="Cambodia Explorer home" onClick={() => { if (isAdminRoute) navigateTo('/') }}>
        <span className="brand-mark" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 21c-4-2-7-5.5-7-10a7 7 0 0 1 14 0c0 4.5-3 8-7 10Z" />
            <path d="M12 21V9" />
            <path d="M7 11c1.5 2 3 2.6 5 2.6" />
            <path d="M17 11c-1.5 2-3 2.6-5 2.6" />
          </svg>
        </span>
        <span>CAMBODIA<br /><b>EXPLORER</b></span>
      </a>
      <nav className={isMobileNavOpen ? 'is-open' : ''}>
        <a href="#explore" onClick={() => { setIsMobileNavOpen(false); if (isAdminRoute) navigateTo('/') }}>Explore</a>
        <button type="button" onClick={() => { setIsMobileNavOpen(false); setIsAccountOpen(true) }}>My trips</button>
        <button type="button" onClick={() => { setIsMobileNavOpen(false); if (isAdminRoute) navigateTo('/'); setCommunityOnly(true); document.querySelector('#explore')?.scrollIntoView({ behavior: 'smooth' }) }}>Community picks</button>
        {isAdmin && (
          <button type="button" onClick={() => { setIsMobileNavOpen(false); navigateTo('/admin') }}>Admin</button>
        )}
      </nav>
      <button className="header-menu" aria-label="Open navigation" aria-expanded={isMobileNavOpen} onClick={() => setIsMobileNavOpen(open => !open)}><Menu size={22} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></button>
      <div className="header-actions">
        {user && (
          <button
            type="button"
            className="header-account"
            aria-label={unreadCount > 0 ? `Inbox (${unreadCount} unread)` : 'Inbox'}
            onClick={() => { setSuggestInitialTab('inbox'); setIsSuggestOpen(true) }}
          >
            <Bell size={16} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            <span>Inbox</span>
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-[#F2A33A] text-[#1F4D3A] text-xs font-bold">
                {unreadCount}
              </span>
            )}
          </button>
        )}
        <button type="button" className="header-account" onClick={() => setIsAccountOpen(true)}>
          <User size={16} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          <span>{user ? user.username : 'Sign in'}</span>
        </button>
      </div>
    </header>
    {!isOnline && <div className="offline-banner" role="status"><WifiOff size={15} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /> Offline mode: your trip is still available on this device.</div>}
    <main id="top">
      {isAdminRoute ? (
        <Suspense fallback={<p className="plan-loading" role="status">Loading admin dashboard…</p>}>
          <AdminDashboard
            user={user}
            onBack={() => navigateTo('/')}
            onOpenSignIn={() => setIsAccountOpen(true)}
            onPlacesChanged={refreshCommunity}
          />
        </Suspense>
      ) : (
        <>
          <section className="hero">
            <div className="hero-copy">
              <p className="eyebrow"><Compass size={14} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /> Cambodia, made easy</p>
              <h1>Make your <em>Cambodia</em> trip feel like yours.</h1>
              <p className="hero-text">Pick the moments that call to you. We’ll turn them into a simple, doable trip — with a budget you can trust.</p>
              <div className="hero-actions">
                <button type="button" onClick={() => document.querySelector('#routes')?.scrollIntoView({ behavior: 'smooth' })}>
                  Start with a route <ArrowRight size={17} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </button>
                <a href="#explore">Explore the map</a>
              </div>
              <div className="hero-proof">
                <span><b>1 min</b> to a first draft</span>
                <span><b>{PLACES.length}</b> handpicked places</span>
                <span><b>$</b> clear costs</span>
              </div>
            </div>
            <div className="hero-art" aria-label="An illustrated view of Cambodia’s temple landscape">
              <div className="sun" />
              <div className="temple temple--back" />
              <div className="temple temple--front"><i /><i /><i /></div>
              <div className="palm palm--one" />
              <div className="palm palm--two" />
              <p>SIEM REAP · 13.36° N</p>
            </div>
          </section>
          <section id="routes" className="routes-section">
            <div className="section-intro">
              <h2>Pick a starting point.</h2>
              <div className="section-intro__aside">
                <p>Steal one of these, then swap anything out.</p>
                {isStarterRoutesVisible && (
                  <button type="button" className="routes-trip-trigger" onClick={() => setIsTripPanelOpen(true)} aria-expanded={isTripPanelOpen}>
                    <span>{itinerary.length}</span>Your trip
                  </button>
                )}
              </div>
            </div>
            <div className="route-grid">
              {STARTER_ROUTES.map((route, index) => (
                <article className={`route-card route-card--${index + 1}`} key={route.id}>
                  <p>{route.meta}</p>
                  <h3>{route.title}</h3>
                  <span>{route.description}</span>
                  <button type="button" onClick={() => applyRoute(route)}>
                    Use this route <ArrowRight size={16} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </button>
                </article>
              ))}
            </div>
          </section>
          <section id="explore" className="explorer">
            <div className="explorer-heading">
              <div>
                <p className="eyebrow">The map, without the chaos</p>
                <h2>What feels good today?</h2>
              </div>
            </div>
            <DestinationFilters
              activeProvince={activeCity}
              onSelectProvince={selectCity}
              tripCounts={tripCounts}
              categories={categories}
              activeCategory={activeCategory}
              onSelectCategory={setActiveCategory}
              activeVibes={activeVibes}
              onToggleVibe={toggleVibe}
            />
            <SwipeBrowser places={filteredPlaces} lowData={lowData} onAdd={addToItinerary} onOpen={openPlace} currency={currency} />
            <div className="explore-layout">
              <MapView
                activeCity={activeCity}
                onSelectCity={selectCity}
                filteredPlaces={filteredPlaces}
                itineraryIds={itineraryIds}
                focusedPlace={focusedPlace}
                onFocusPlace={setFocusedPlace}
                onOpenDetails={openPlace}
                onAddPlace={addToItinerary}
                onRemovePlace={removePlace}
                lowData={lowData}
              />
              <div className="place-panel">
                <div className="place-panel__top">
                  <div>
                    <p>{activeCity}</p>
                    <h3>{showEverything ? 'Every place' : 'Local highlights'}</h3>
                  </div>
                  <div className="place-panel__controls">
                    <span>{filteredPlaces.length} places</span>
                    <button type="button" onClick={() => setShowEverything(value => !value)} aria-pressed={showEverything}>
                      {showEverything ? 'Highlights only' : 'Show everything'}
                    </button>
                  </div>
                </div>
                <div className="place-search">
                  <Search size={16} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" />
                  <input
                    type="search"
                    value={searchTerm}
                    onChange={event => setSearchTerm(event.target.value)}
                    placeholder={`Search places in ${activeCity}`}
                    aria-label="Search places"
                  />
                </div>
                <div className="place-list">
                  {filteredPlaces.map(place => {
                    const CategoryIcon = CATEGORY_ICONS[place.category] || Landmark
                    return (
                      <article
                        key={place.id}
                        className={`place-card${focusedPlace?.id === place.id ? ' is-focused' : ''}`}
                        style={{ '--category-color': CATEGORY_COLORS[place.category] }}
                        onClick={() => setFocusedPlace(place)}
                      >
                        <span className="place-card__icon-tile" aria-hidden="true">
                          <CategoryIcon size={24} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                        </span>
                        <div className="place-card__body">
                          <div className="place-card__main">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="place-card__category">{place.category}</span>
                              {place.communityPick && <em className="community-badge">Community pick</em>}
                            </div>
                            <b className="place-card__name">{place.name}</b>
                            <p className="place-card__blurb">{place.description}</p>
                          </div>
                          <div className="place-card__foot">
                            <small>{formatMoney(place.cost, currency)} <i>·</i> {place.time}h</small>
                            {place.suggestionId && (
                              <button type="button" className={`like-button${place.liked ? ' is-liked' : ''}`} aria-pressed={place.liked} onClick={event => { event.stopPropagation(); toggleLike(place) }}>
                                <ThumbsUp size={14} aria-hidden="true" /> I liked this too · {place.likes}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                itineraryIds.has(place.id) ? removePlace(place.id) : addToItinerary(place)
                              }}
                              className={itineraryIds.has(place.id) ? 'is-added' : ''}
                              aria-label={`${itineraryIds.has(place.id) ? 'Remove' : 'Add'} ${place.name}`}
                            >
                              {itineraryIds.has(place.id) ? '✓ Saved' : <><Plus size={15} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /> Add</>}
                            </button>
                          </div>
                        </div>
                      </article>
                    )
                  })}
                  <button type="button" className="suggest-place-button" onClick={() => { setSuggestInitialTab('new'); setIsSuggestOpen(true) }}>
                    Suggest a place you loved
                  </button>
                </div>
              </div>
            </div>
          </section>
          <section id="about" className="trust-row">
            <div>
              <span>01</span>
              <h3>Small by design</h3>
              <p>We start you with the standout stops, not a giant directory.</p>
            </div>
            <div>
              <span>02</span>
              <h3>Costs, explained</h3>
              <p>Your total includes daily basics and the experiences you choose.</p>
            </div>
            <div>
              <span>03</span>
              <h3>Made to use there</h3>
              <p>Turn your saved list into a simple day-by-day checklist.</p>
            </div>
          </section>
        </>
      )}
    </main>
    <SlideOver
      place={selected}
      open={isDetailsOpen}
      isAdded={selected ? itineraryIds.has(selected.id) : false}
      onClose={() => setIsDetailsOpen(false)}
      onAdd={addToItinerary}
      lowData={lowData}
      currency={currency}
    />
    {!isAdminRoute && (
      <ItineraryBar
        items={itinerary}
        onRemove={removePlace}
        onClear={clearItinerary}
        onOpenPlan={openPlan}
        onShare={shareTrip}
        onExport={exportTrip}
        days={days}
        onChangeDays={setDays}
        tier={tier}
        onChangeTier={setTier}
        currency={currency}
        onChangeCurrency={setCurrency}
        partySize={partySize}
        onChangePartySize={setPartySize}
        isOpen={isTripPanelOpen}
        onOpenChange={setIsTripPanelOpen}
        hiddenOnStarterRoutes={isStarterRoutesVisible && !isTripPanelOpen}
      />
    )}
    <AccountPanel
      open={isAccountOpen}
      onClose={() => setIsAccountOpen(false)}
      user={user}
      onAuthChange={setUser}
      items={itinerary}
      days={days}
      tier={tier}
      onLoadTrip={loadTrip}
      activeTripId={activeTripId}
      onActiveTripIdChange={setActiveTripId}
      onOpenAdmin={() => navigateTo('/admin')}
    />
    {isPlanOpen && (
      <Suspense fallback={<p className="plan-loading" role="status">Preparing your checklist...</p>}>
        <GeneratePlanModal open items={itinerary} tripDays={days} currency={currency} onClose={closePlan} onReorder={reorderItinerary} />
      </Suspense>
    )}
    {isSuggestOpen && (
      <SuggestionsDialog
        user={user}
        activeProvince={activeCity}
        places={allPlaces}
        initialTab={suggestInitialTab}
        unreadCount={unreadCount}
        onNotificationsChanged={setUnreadCount}
        onClose={() => setIsSuggestOpen(false)}
        onChanged={() => { refreshCommunity(); refreshNotifications() }}
        onRequestSignIn={() => { setIsSuggestOpen(false); setIsAccountOpen(true) }}
      />
    )}
    {!isAdminRoute && (
      <button
        type="button"
        className="low-data-toggle"
        onClick={() => setLowData(value => !value)}
        aria-pressed={lowData}
      >
        {lowData ? 'Low-data on' : 'Low-data off'}
      </button>
    )}
    <p className="sr-only" aria-live="polite">{announcement}</p>
  </div>
}
