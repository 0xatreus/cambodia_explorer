import { getTransportOptions } from '../data/transport'

const DAILY_RATES = { comfort: 58, flash: 105, value: 35 }

export function calculateActivityCost(items) {
  return items.reduce((sum, place) => sum + place.cost, 0)
}

export function calculateTransportCost(items) {
  const locations = [...new Set(items.map(place => place.city))]
  return locations.slice(0, -1).reduce((sum, from, index) => {
    const option = getTransportOptions(from, locations[index + 1])[0]
    if (!option || option.costMin == null) return sum
    return sum + (option.costMin + (option.costMax ?? option.costMin)) / 2
  }, 0)
}

export function calculateTripTotal({ items, tier, days, partySize = 1 }) {
  const activityCost = calculateActivityCost(items)
  const transportCost = calculateTransportCost(items)
  const daily = DAILY_RATES[tier] ?? DAILY_RATES.value
  const total = activityCost + transportCost + daily * days
  return { activityCost, transportCost, daily, total, groupTotal: total * partySize }
}
