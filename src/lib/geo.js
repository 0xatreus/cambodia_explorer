import provinces from '../data/provinces.json'

// Mirrors server/geo.cjs (the server stays CommonJS). The server re-checks everything;
// this copy only powers instant feedback in the suggestion form.
export function haversineMeters(aLat, aLng, bLat, bLng) {
  const toRad = degrees => (degrees * Math.PI) / 180
  const dLat = toRad(bLat - aLat)
  const dLng = toRad(bLng - aLng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2
  return 2 * 6371000 * Math.asin(Math.sqrt(h))
}

export function nearestProvince(lat, lng) {
  let best = null
  for (const province of provinces) {
    const distance = haversineMeters(lat, lng, province.lat, province.lng)
    if (!best || distance < best.distance) best = { name: province.name, distance }
  }
  return best
}

function normalizeName(name) {
  return String(name).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
}

export function namesSimilar(a, b) {
  const x = normalizeName(a)
  const y = normalizeName(b)
  if (!x || !y) return false
  if (x === y) return true
  if ((x.length >= 4 && y.includes(x)) || (y.length >= 4 && x.includes(y))) return true
  const xs = new Set(x.split(' '))
  const ys = new Set(y.split(' '))
  const shared = [...xs].filter(token => ys.has(token)).length
  return shared / new Set([...xs, ...ys]).size >= 0.6
}

/** Places with a similar name within `meters` of the given point. */
export function findNearbyDuplicates(places, name, lat, lng, meters = 300) {
  if (!name.trim() || lat == null || lng == null) return []
  return places
    .filter(place => place.coords && namesSimilar(place.name, name))
    .map(place => ({ name: place.name, distanceMeters: Math.round(haversineMeters(lat, lng, place.coords[0], place.coords[1])) }))
    .filter(match => match.distanceMeters <= meters)
}
