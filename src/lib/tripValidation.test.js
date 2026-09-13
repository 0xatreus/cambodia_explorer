import { describe, expect, it } from 'vitest'
import { PLACES } from '../data/places'
import { parseTrip, placesFromIds } from './tripValidation'

const realId = PLACES[0].id

describe('parseTrip', () => {
  it('returns null for non-object input', () => {
    expect(parseTrip(null)).toBeNull()
    expect(parseTrip('nope')).toBeNull()
    expect(parseTrip(undefined)).toBeNull()
  })

  it('clamps days to 1-21 and falls back to 5 when invalid', () => {
    expect(parseTrip({ days: 1e9 }).days).toBe(5)
    expect(parseTrip({ days: 0 }).days).toBe(5)
    expect(parseTrip({ days: 21 }).days).toBe(21)
    expect(parseTrip({ days: 1 }).days).toBe(1)
    expect(parseTrip({ days: 'nope' }).days).toBe(5)
  })

  it('falls back to a valid tier when given an unknown one', () => {
    expect(parseTrip({ tier: 'flash' }).tier).toBe('flash')
    expect(parseTrip({ tier: 'yolo' }).tier).toBe('value')
    expect(parseTrip({}).tier).toBe('value')
  })

  it('falls back to USD for an unknown currency', () => {
    expect(parseTrip({ currency: 'KHR' }).currency).toBe('KHR')
    expect(parseTrip({ currency: 'DOGE' }).currency).toBe('USD')
  })

  it('clamps partySize to 1-20 and falls back to 1', () => {
    expect(parseTrip({ partySize: 4 }).partySize).toBe(4)
    expect(parseTrip({ partySize: 0 }).partySize).toBe(1)
    expect(parseTrip({ partySize: 999 }).partySize).toBe(1)
  })

  it('drops unknown place ids and de-duplicates, capping at 100', () => {
    const result = parseTrip({ placeIds: [realId, realId, 'not-a-real-place'] })
    expect(result.placeIds).toEqual([realId])
  })

  it('ignores non-string entries in placeIds', () => {
    const result = parseTrip({ placeIds: [realId, 42, null, undefined] })
    expect(result.placeIds).toEqual([realId])
  })
})

describe('placesFromIds', () => {
  it('resolves known ids to place objects and drops unknown ones', () => {
    const result = placesFromIds([realId, 'unknown-id'])
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(realId)
  })
})
