import { useEffect, useMemo, useRef, useState } from 'react'
import { divIcon } from 'leaflet'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { Check, Crosshair, ImagePlus } from 'lucide-react'
import 'leaflet/dist/leaflet.css'
import { CITIES, DIETARY_TAGS, VIBE_TAGS } from '../data/places'
import filterOptions from '../data/filterOptions.json'
import { api } from '../lib/api'
import { findNearbyDuplicates, nearestProvince } from '../lib/geo'

const CAMBODIA_BOUNDS = [[10.3, 102.3], [14.75, 107.7]]
const MAX_PHOTO_BYTES = 1024 * 1024
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const PIN_ICON = divIcon({
  className: 'category-marker-wrap',
  html: '<span class="category-marker is-saved" style="--marker-color:#d55732"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/></svg></span>',
  iconSize: [38, 46],
  iconAnchor: [19, 42],
})

function PinLayer({ position, onPick }) {
  useMapEvents({ click: event => onPick(event.latlng.lat, event.latlng.lng) })
  const map = useMap()
  useEffect(() => { if (position) map.panTo(position, { animate: true }) }, [position, map])
  if (!position) return null
  return <Marker position={position} icon={PIN_ICON} draggable eventHandlers={{ dragend: event => { const { lat, lng } = event.target.getLatLng(); onPick(lat, lng) } }} />
}

export default function SuggestPlaceForm({ activeProvince, places, editing, onSaved, onGoToMine }) {
  const start = CITIES.find(city => city.name === activeProvince)?.coords || [12.5657, 104.991]
  const [name, setName] = useState(editing?.name || '')
  const [category, setCategory] = useState(editing?.category || filterOptions.categories[0])
  const [tags, setTags] = useState(editing?.tags || [])
  const [description, setDescription] = useState(editing?.description || '')
  const [pin, setPin] = useState(editing ? [editing.lat, editing.lng] : null)
  const [photoUrl, setPhotoUrl] = useState(editing?.photoUrl || '')
  const [photoBusy, setPhotoBusy] = useState(false)
  const [confirmDuplicate, setConfirmDuplicate] = useState(false)
  const [serverDuplicates, setServerDuplicates] = useState([])
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [placeQuery, setPlaceQuery] = useState('')
  const fileRef = useRef(null)

  const searchMatches = useMemo(() => {
    const q = placeQuery.trim().toLowerCase()
    if (q.length < 2) return []
    const cityHits = CITIES.filter(c => c.name.toLowerCase().includes(q)).map(c => ({ label: `${c.name} (province)`, coords: c.coords }))
    const placeHits = places.filter(p => p.coords && p.name.toLowerCase().includes(q)).slice(0, 5).map(p => ({ label: `${p.name} · ${p.province || p.city}`, coords: p.coords }))
    return [...cityHits, ...placeHits].slice(0, 6)
  }, [placeQuery, places])

  const province = pin ? nearestProvince(pin[0], pin[1]).name : null
  const duplicates = useMemo(() => {
    const local = pin ? findNearbyDuplicates(places, name, pin[0], pin[1]) : []
    return [...local, ...serverDuplicates.filter(match => !local.some(item => item.name === match.name))]
  }, [places, name, pin, serverDuplicates])

  const toggleTag = id => setTags(current => (current.includes(id) ? current.filter(tag => tag !== id) : current.length < 6 ? [...current, id] : current))
  const pick = (lat, lng) => { setPin([Number(lat.toFixed(5)), Number(lng.toFixed(5))]); setServerDuplicates([]); setConfirmDuplicate(false) }
  const useMyLocation = () => {
    if (!navigator.geolocation) { setError('Your browser cannot share its location. Tap the map instead.'); return }
    navigator.geolocation.getCurrentPosition(position => pick(position.coords.latitude, position.coords.longitude), () => setError('Could not read your location. Tap the map instead.'))
  }

  const uploadPhoto = async event => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!PHOTO_TYPES.includes(file.type)) { setError('Photos must be JPEG, PNG or WebP.'); return }
    if (file.size > MAX_PHOTO_BYTES) { setError('Photos must be 1 MB or smaller.'); return }
    setError('')
    setPhotoBusy(true)
    try { setPhotoUrl((await api.uploadPhoto(file)).photoUrl) } catch (failure) { setError(failure.message) } finally { setPhotoBusy(false) }
  }

  const handleSubmit = async event => {
    event.preventDefault()
    if (status === 'submitting') return
    if (!pin) { setError('Tap the map to drop a pin on the place.'); setStatus('error'); return }
    if (duplicates.length && !confirmDuplicate) { setError('Please confirm this is a different place, or edit the name or pin.'); setStatus('error'); return }
    setStatus('submitting')
    setError('')
    const body = { name, category, tags, description, lat: pin[0], lng: pin[1], photoUrl: photoUrl || null, confirmDuplicate }
    try {
      const result = editing ? await api.updateSuggestion(editing.id, body) : await api.createSuggestion(body)
      setStatus('success')
      onSaved?.(result.suggestion)
    } catch (failure) {
      if (failure.status === 409 && failure.payload?.duplicates) setServerDuplicates(failure.payload.duplicates)
      setError(failure.message)
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="suggest-success" role="status">
        <b>{editing ? 'Changes saved.' : 'Thanks! Your suggestion is pending review.'}</b>
        <p>We'll add it to the map as a community pick if it fits. You can follow its status under My suggestions.</p>
        <button type="button" className="suggest-primary" onClick={onGoToMine}>See my suggestions</button>
      </div>
    )
  }

  return (
    <form className="suggest-form-body" onSubmit={handleSubmit} noValidate>
      <label htmlFor="suggest-name">Place name</label>
      <input id="suggest-name" type="text" value={name} maxLength={80} minLength={3} required onChange={event => { setName(event.target.value); setServerDuplicates([]) }} placeholder={`Somewhere near ${activeProvince}`} />

      <fieldset>
        <legend>Location <small>Search a landmark/province or tap the map to drop a pin</small></legend>
        <input
          type="search"
          aria-label="Search landmark or province to move pin"
          value={placeQuery}
          onChange={event => setPlaceQuery(event.target.value)}
          placeholder="Jump pin near a landmark or province (e.g. Angkor Wat, Kampot)…"
        />
        {searchMatches.length > 0 && (
          <div className="suggest-chips" role="listbox" aria-label="Matching locations">
            {searchMatches.map(match => (
              <button
                type="button"
                key={match.label}
                className="chip"
                onClick={() => { pick(match.coords[0], match.coords[1]); setPlaceQuery('') }}
              >
                {match.label}
              </button>
            ))}
          </div>
        )}
        <div className="pin-map" aria-label="Map for dropping a pin">
          <MapContainer center={pin || start} zoom={pin ? 14 : 10} minZoom={7} maxZoom={18} maxBounds={CAMBODIA_BOUNDS} scrollWheelZoom={false}>
            <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <PinLayer position={pin} onPick={pick} />
          </MapContainer>
        </div>
        <div className="pin-meta">
          <button type="button" className="suggest-secondary" onClick={useMyLocation}><Crosshair size={15} aria-hidden="true" /> Use my location</button>
          <span aria-live="polite">{pin ? <>Province: <b>{province}</b> <em>(set from the pin)</em></> : 'No pin yet'}</span>
        </div>
      </fieldset>

      <fieldset>
        <legend>Category</legend>
        <div className="suggest-chips">
          {filterOptions.categories.map(item => (
            <button type="button" key={item} className={`chip${category === item ? ' is-selected' : ''}`} aria-pressed={category === item} onClick={() => setCategory(item)}>
              {category === item && <Check size={14} aria-hidden="true" />}{item}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>Vibe <small>Up to 6</small></legend>
        <div className="suggest-chips">
          {[...VIBE_TAGS, ...DIETARY_TAGS].map(tag => (
            <button type="button" key={tag.id} className={`chip${tags.includes(tag.id) ? ' is-selected' : ''}`} aria-pressed={tags.includes(tag.id)} onClick={() => toggleTag(tag.id)}>
              {tags.includes(tag.id) && <Check size={14} aria-hidden="true" />}{tag.label}
            </button>
          ))}
        </div>
      </fieldset>

      <label htmlFor="suggest-note">Why do you love it? <small>{description.length}/500</small></label>
      <textarea id="suggest-note" value={description} rows={3} maxLength={500} onChange={event => setDescription(event.target.value)} placeholder="A short tip for other travellers" />

      <fieldset>
        <legend>Photo <small>Optional · JPEG, PNG or WebP up to 1 MB</small></legend>
        <div className="photo-row">
          <input aria-label="Photo link" type="url" value={photoUrl.startsWith('/uploads/') ? '' : photoUrl} maxLength={300} onChange={event => setPhotoUrl(event.target.value)} placeholder="https://images.unsplash.com/…" />
          <input ref={fileRef} type="file" accept={PHOTO_TYPES.join(',')} onChange={uploadPhoto} hidden />
          <button type="button" className="suggest-secondary" disabled={photoBusy} onClick={() => fileRef.current?.click()}><ImagePlus size={15} aria-hidden="true" /> {photoBusy ? 'Uploading…' : 'Upload'}</button>
        </div>
        {photoUrl && <img className="photo-preview" src={photoUrl} alt="Chosen place" onError={event => { event.currentTarget.hidden = true }} onLoad={event => { event.currentTarget.hidden = false }} />}
      </fieldset>

      {duplicates.length > 0 && (
        <div className="suggest-warning" role="alert">
          <b>This might already exist nearby:</b>
          <ul>{duplicates.map(match => <li key={`${match.name}-${match.distanceMeters}`}>{match.name} · {match.distanceMeters} m away</li>)}</ul>
          <label className="suggest-check"><input type="checkbox" checked={confirmDuplicate} onChange={event => setConfirmDuplicate(event.target.checked)} /> It's a different place, suggest it anyway</label>
        </div>
      )}
      {error && <p className="suggest-error" role="alert">{error}</p>}
      <button type="submit" className="suggest-primary" disabled={status === 'submitting' || photoBusy}>
        {status === 'submitting' ? 'Sending…' : editing ? 'Save changes' : 'Send suggestion'}
      </button>
    </form>
  )
}
