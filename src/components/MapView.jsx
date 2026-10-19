import { useEffect, useMemo, useRef } from 'react'
import { divIcon } from 'leaflet'
import { MapContainer, Marker, TileLayer, useMap, ZoomControl } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import { Plus, X } from 'lucide-react'
import 'leaflet/dist/leaflet.css'
import { CATEGORY_COLORS, CITIES } from '../data/places'

const CAMBODIA_BOUNDS = [[9.85, 102.25], [14.75, 107.75]]
const CATEGORY_GLYPHS = {
  Sights: '<path d="M4 10h16M6 10V7l6-4 6 4v3M8 10v8m8-8v8M5 18h14"/><path d="M12 3v15"/>',
  Food: '<path d="M5 3v7a3 3 0 0 0 6 0V3M8 3v15M17 3v15M14 3v6a3 3 0 0 0 3 3"/>',
  Nature: '<path d="M12 21V10M12 15c-4 0-7-2-7-7 5 0 7 2 7 7Zm0-4c0-5 3-8 8-8 0 5-3 8-8 8Z"/>',
  Activities: '<circle cx="12" cy="12" r="8"/><path d="m12 12 5-5M12 7v5h5"/>',
}

function createCategoryIcon(category, isSaved) {
  const color = CATEGORY_COLORS[category]
  return divIcon({
    className: 'category-marker-wrap',
    html: `<span class="category-marker${isSaved ? ' is-saved' : ''}" style="--marker-color:${color}"><svg viewBox="0 0 24 24" aria-hidden="true">${CATEGORY_GLYPHS[category]}</svg></span>`,
    iconSize: [38, 46],
    iconAnchor: [19, 42],
    popupAnchor: [0, -40],
  })
}

function MapViewport({ activeCity }) {
  const map = useMap()
  const previousCity = useRef(activeCity)

  useEffect(() => {
    if (previousCity.current === activeCity) {
      return
    }
    previousCity.current = activeCity
    const city = CITIES.find(item => item.name === activeCity)
    if (city) {
      map.stop()
      map.flyTo(city.coords, 11, { animate: true, duration: 0.8 })
    }
  }, [activeCity, map])

  return null
}

export default function MapView({ activeCity, onSelectCity, filteredPlaces, itineraryIds, focusedPlace, onFocusPlace, onOpenDetails, onAddPlace, onRemovePlace, lowData }) {
  const visiblePlaces = filteredPlaces
  const markerIcons = useMemo(() => new Map(visiblePlaces.map(place => [place.id, createCategoryIcon(place.category, itineraryIds.has(place.id))])), [visiblePlaces, itineraryIds])
  const isFocusedAdded = focusedPlace ? itineraryIds.has(focusedPlace.id) : false

  return <section className="map-shell" aria-label="Interactive map of Cambodia">
    <MapContainer className="leaflet-map" center={[12.5657, 104.991]} zoom={7} minZoom={7} maxZoom={16} maxBounds={CAMBODIA_BOUNDS} maxBoundsViscosity={1} scrollWheelZoom zoomControl={false}>
      {!lowData && <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />}
      <MapViewport activeCity={activeCity} />
      <ZoomControl position="bottomright" />
      <MarkerClusterGroup chunkedLoading showCoverageOnHover={false} spiderfyOnMaxZoom maxClusterRadius={46}>
        {visiblePlaces.map(place => <Marker key={place.id} position={place.coords} icon={markerIcons.get(place.id)} eventHandlers={{ click: () => onFocusPlace(place) }} title={place.name} />)}
      </MarkerClusterGroup>
    </MapContainer>
    {lowData && <p className="map-data-note">Low-data mode: map tiles deferred</p>}
    <div className="map-start-card">
      <label htmlFor="map-start-city">Pick a starting point</label>
      <select id="map-start-city" value={activeCity} onChange={event => onSelectCity(event.target.value)}>
        {CITIES.map(city => <option key={city.name} value={city.name}>{city.name}</option>)}
      </select>
    </div>
    {focusedPlace && <div className="map-focus-card">
      <button type="button" className="map-focus-card__close" onClick={() => onFocusPlace(null)} aria-label="Close place preview"><X size={16} /></button>
      <span className="map-focus-card__category" style={{ '--category-color': CATEGORY_COLORS[focusedPlace.category] }}>{focusedPlace.category}</span>
      <b>{focusedPlace.name}</b>
      <p>{focusedPlace.description}</p>
      <div className="map-focus-card__actions">
        <button type="button" onClick={() => isFocusedAdded ? onRemovePlace(focusedPlace.id) : onAddPlace(focusedPlace)} className={isFocusedAdded ? 'is-added' : ''}>{isFocusedAdded ? '✓ Saved' : <><Plus size={15} /> Add</>}</button>
        <button type="button" onClick={() => onOpenDetails(focusedPlace)}>Details</button>
      </div>
    </div>}
    <div className="map-legend" aria-label="Map legend">
      <strong>Explore by feeling</strong>
      {Object.entries(CATEGORY_COLORS).map(([category, color]) => <span key={category}><i className="legend-marker" style={{ '--legend-color': color }} />{category}</span>)}
    </div>
    {!focusedPlace && <p className="map-attribution-note">Approximate locations · tap a pin to explore</p>}
  </section>
}
