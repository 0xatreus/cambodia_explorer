import { describe, expect, it } from 'vitest'
import { calculateActivityCost, calculateTransportCost, calculateTripTotal } from './tripBudget'

const place = (id, city, cost) => ({ id, city, cost })

describe('calculateActivityCost', () => {
  it('sums the cost field across items', () => {
    expect(calculateActivityCost([place('a', 'Siem Reap', 10), place('b', 'Siem Reap', 25)])).toBe(35)
  })

  it('returns 0 for an empty trip', () => {
    expect(calculateActivityCost([])).toBe(0)
  })
})

describe('calculateTransportCost', () => {
  it('is 0 when every stop is in the same city', () => {
    expect(calculateTransportCost([place('a', 'Siem Reap', 0), place('b', 'Siem Reap', 0)])).toBe(0)
  })

  it('averages costMin/costMax for a known intercity route', () => {
    const cost = calculateTransportCost([place('a', 'Phnom Penh', 0), place('b', 'Siem Reap', 0)])
    expect(cost).toBeGreaterThan(0)
  })

  it('is 0 when there is no known route between two cities', () => {
    expect(calculateTransportCost([place('a', 'Nowhere', 0), place('b', 'Also Nowhere', 0)])).toBe(0)
  })
})

describe('calculateTripTotal', () => {
  it('combines activity, transport and daily-rate costs, then multiplies by party size', () => {
    const items = [place('a', 'Siem Reap', 20)]
    const result = calculateTripTotal({ items, tier: 'value', days: 2, partySize: 2 })
    expect(result.activityCost).toBe(20)
    expect(result.transportCost).toBe(0)
    expect(result.daily).toBe(35)
    expect(result.total).toBe(20 + 35 * 2)
    expect(result.groupTotal).toBe(result.total * 2)
  })

  it('falls back to the value daily rate for an unknown tier', () => {
    const result = calculateTripTotal({ items: [], tier: 'unknown', days: 1, partySize: 1 })
    expect(result.daily).toBe(35)
  })

  it('defaults partySize to 1 when omitted', () => {
    const result = calculateTripTotal({ items: [], tier: 'value', days: 1 })
    expect(result.groupTotal).toBe(result.total)
  })
})
