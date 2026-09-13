import { PLACES } from '../data/places'
import { CURRENCIES } from '../data/money'

// Mirrors server/index.cjs's validateTrip limits (allowedTiers, days 1-21, name
// length, placeIds capped at 100). The server stays CommonJS and this stays
// ESM, so these are two files sharing the same literal limits, not a single
// shared module across the Node/browser boundary — keep them in sync by hand.
export const ALLOWED_TIERS = new Set(['value', 'comfort', 'flash'])
const PLACES_BY_ID = new Map(PLACES.map(place => [place.id, place]))

export function parseTrip(raw) {
  if (!raw || typeof raw !== 'object') return null
  const days = Number(raw.days)
  const partySize = Number(raw.partySize)
  const placeIds = Array.isArray(raw.placeIds)
    ? [...new Set(raw.placeIds.filter(id => typeof id === 'string' && PLACES_BY_ID.has(id)))].slice(0, 100)
    : []
  return {
    placeIds,
    days: Number.isInteger(days) && days >= 1 && days <= 21 ? days : 5,
    tier: ALLOWED_TIERS.has(raw.tier) ? raw.tier : 'value',
    currency: typeof raw.currency === 'string' && CURRENCIES[raw.currency] ? raw.currency : 'USD',
    partySize: Number.isInteger(partySize) && partySize >= 1 && partySize <= 20 ? partySize : 1,
  }
}

export function placesFromIds(placeIds) {
  return placeIds.map(id => PLACES_BY_ID.get(id)).filter(Boolean)
}
