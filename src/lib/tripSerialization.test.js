import { describe, expect, it } from 'vitest'
import { PLACES } from '../data/places'
import { parseTrip } from './tripValidation'

function encodeTrip(trip) {
  return encodeURIComponent(JSON.stringify(trip))
}

function decodeTrip(payload) {
  return parseTrip(JSON.parse(decodeURIComponent(payload)))
}

describe('trip share-hash round-trip', () => {
  it('preserves a well-formed trip through encode/decode', () => {
    const original = { placeIds: [PLACES[0].id, PLACES[1].id], days: 7, tier: 'comfort', currency: 'EUR', partySize: 3 }
    const result = decodeTrip(encodeTrip(original))
    expect(result).toEqual(original)
  })

  it('clamps an out-of-range payload instead of freezing on decode', () => {
    const malicious = { placeIds: [PLACES[0].id], days: 1e9, tier: 'yolo', currency: 'DOGE', partySize: 999 }
    const result = decodeTrip(encodeTrip(malicious))
    expect(result.days).toBe(5)
    expect(result.tier).toBe('value')
    expect(result.currency).toBe('USD')
    expect(result.partySize).toBe(1)
    expect(result.placeIds).toEqual([PLACES[0].id])
  })

  it('throws on a non-JSON payload so callers can fall back safely', () => {
    expect(() => decodeTrip('not-json')).toThrow()
  })
})
