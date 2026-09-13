import { useEffect, useMemo, useRef } from 'react'
import { divIcon } from 'leaflet'
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import 'leaflet/dist/leaflet.css'
import { CATEGORY_COLORS, CITIES, PLACES } from '../data/places'

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

export default function MapView({ activeCity, itineraryIds, onOpenPlace }) {
  const markerIcons = useMemo(() => new Map(PLACES.map(place => [place.id, createCategoryIcon(place.category, itineraryIds.has(place.id))])), [itineraryIds])

  return <section className="map-shell" aria-label="Interactive map of Cambodia">
    <MapContainer className="leaflet-map" center={[12.5657, 104.991]} zoom={7} minZoom={7} maxZoom={16} maxBounds={CAMBODIA_BOUNDS} maxBoundsViscosity={1} scrollWheelZoom>
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapViewport activeCity={activeCity} />
      <MarkerClusterGroup chunkedLoading showCoverageOnHover={false} spiderfyOnMaxZoom maxClusterRadius={46}>
        {PLACES.map(place => <Marker key={place.id} position={place.coords} icon={markerIcons.get(place.id)} eventHandlers={{ click: () => onOpenPlace(place) }} title={place.name} />)}
      </MarkerClusterGroup>
    </MapContainer>
    <div className="map-legend" aria-label="Map legend">
      <strong>Explore by feeling</strong>
      {Object.entries(CATEGORY_COLORS).map(([category, color]) => <span key={category}><i className="legend-marker" style={{ '--legend-color': color }} />{category}</span>)}
    </div>
    <p className="map-attribution-note">Approximate locations · tap a pin to explore</p>
  </section>
}
