import { describe, expect, it } from 'vitest'
import { formatMoney } from './money'

describe('formatMoney', () => {
  it('formats USD with the $ symbol and two decimals', () => {
    expect(formatMoney(10)).toBe('$10')
    expect(formatMoney(10.5)).toBe('$10.5')
  })

  it('converts to KHR using its rate and rounds to a whole number', () => {
    expect(formatMoney(1, 'KHR')).toBe('៛4,100')
  })

  it('converts to EUR and GBP using their rates', () => {
    expect(formatMoney(100, 'EUR')).toBe('€92')
    expect(formatMoney(100, 'GBP')).toBe('£78')
  })

  it('falls back to USD for an unknown currency code', () => {
    expect(formatMoney(10, 'DOGE')).toBe('$10')
  })
})
