const provinces = require('../src/data/provinces.json')

// Rough outer box around Cambodia (the Gulf of Thailand and neighbouring countries
// are trimmed further by the nearest-province distance check below).
const CAMBODIA_BOX = { minLat: 10.3, maxLat: 14.75, minLng: 102.3, maxLng: 107.7 }
// No point in Cambodia is further than this from the nearest province reference point.
const MAX_PROVINCE_DISTANCE_KM = 120

function haversineMeters(aLat, aLng, bLat, bLng) {
  const toRad = degrees => (degrees * Math.PI) / 180
  const dLat = toRad(bLat - aLat)
  const dLng = toRad(bLng - aLng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2
  return 2 * 6371000 * Math.asin(Math.sqrt(h))
}

function nearestProvince(lat, lng) {
  let best = null
  for (const province of provinces) {
    const distance = haversineMeters(lat, lng, province.lat, province.lng)
    if (!best || distance < best.distance) best = { name: province.name, distance }
  }
  return best
}

/** Returns { province } for a usable Cambodian coordinate, otherwise { error }. */
function locate(lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { error: 'Drop a pin on the map to set the location.' }
  }
  const inBox = lat >= CAMBODIA_BOX.minLat && lat <= CAMBODIA_BOX.maxLat && lng >= CAMBODIA_BOX.minLng && lng <= CAMBODIA_BOX.maxLng
  const nearest = inBox ? nearestProvince(lat, lng) : null
  if (!nearest || nearest.distance > MAX_PROVINCE_DISTANCE_KM * 1000) return { error: 'That location is outside Cambodia. Move the pin onto Cambodian land.' }
  return { province: nearest.name }
}

function normalizeName(name) {
  return String(name).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
}

function namesSimilar(a, b) {
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

module.exports = { CAMBODIA_BOX, haversineMeters, nearestProvince, locate, namesSimilar }
