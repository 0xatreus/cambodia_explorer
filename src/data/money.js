export const CURRENCIES = {
  USD: { label: 'USD', symbol: '$', rate: 1 },
  KHR: { label: 'KHR', symbol: '៛', rate: 4100 },
  EUR: { label: 'EUR', symbol: '€', rate: 0.92 },
  GBP: { label: 'GBP', symbol: '£', rate: 0.78 },
}

export function formatMoney(amount, currency = 'USD') {
  const details = CURRENCIES[currency] || CURRENCIES.USD
  const value = amount * details.rate
  const maximumFractionDigits = currency === 'KHR' ? 0 : 2
  return `${details.symbol}${value.toLocaleString(undefined, { maximumFractionDigits })}`
}
