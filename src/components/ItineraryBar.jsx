import { Activity, ArrowUpRight, ChevronDown, ChevronUp, Landmark, Share2, Sparkles, Trash2, Trees, UtensilsCrossed, X } from 'lucide-react'
import { useMemo } from 'react'
import { CURRENCIES, formatMoney } from '../data/money'
import { calculateTripTotal } from '../lib/tripBudget'

const CATEGORY_ICONS = {
  Sights: Landmark,
  Food: UtensilsCrossed,
  Nature: Trees,
  Activities: Activity,
}

export default function ItineraryBar({
  items,
  onRemove,
  onClear,
  onOpenPlan,
  onShare,
  onExport,
  days,
  onChangeDays,
  tier,
  onChangeTier,
  currency,
  onChangeCurrency,
  partySize,
  onChangePartySize,
  isOpen,
  onOpenChange,
  hiddenOnStarterRoutes = false,
}) {
  const { activityCost, transportCost, daily, total, groupTotal } = useMemo(
    () => calculateTripTotal({ items, tier, days, partySize }),
    [items, tier, days, partySize]
  )
  const totalDisplay = formatMoney(groupTotal, currency)

  return (
    <div className={`trip-dock-wrap${hiddenOnStarterRoutes ? ' trip-dock-wrap--suppressed' : ''}`}>
      {isOpen && (
        <section className="trip-sheet" aria-label="Your trip details and budget">
          <header className="trip-sheet__header">
            <div>
              <p className="eyebrow">Your Cambodia trip</p>
              <h2>{items.length ? `${items.length} saved stops` : 'Start with a spark'}</h2>
            </div>
            <button
              type="button"
              className="trip-sheet__close"
              onClick={() => onOpenChange(false)}
              aria-label="Close trip drawer"
            >
              <X size={20} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </button>
          </header>

          {items.length === 0 ? (
            <div className="trip-empty">
              <Sparkles size={28} className="mx-auto text-saffron" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              <b>Your map is ready.</b>
              <p>Choose a starter route or tap + Add on places to begin.</p>
            </div>
          ) : (
            <ul className="trip-list" aria-label="Saved places in your trip">
              {items.map(place => {
                const IconComponent = CATEGORY_ICONS[place.category] || Landmark
                return (
                  <li key={place.id} title={`${place.city} · ${formatMoney(place.cost, currency)} est.`}>
                    <span className="trip-list__icon" aria-hidden="true">
                      <IconComponent size={16} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    </span>
                    <div className="trip-list__details">
                      <b className="trip-list__name">{place.name}</b>
                      <small>{place.city} · {formatMoney(place.cost, currency)} est.</small>
                    </div>
                    <button
                      type="button"
                      className="trip-list__remove"
                      onClick={() => onRemove(place.id)}
                      aria-label={`Remove ${place.name}`}
                    >
                      <X size={16} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          <div className="budget-settings">
            <div className="settings-top">
              <label>
                Trip length <strong>{days} days</strong>
              </label>
              <div className="stepper" role="group" aria-label="Trip duration stepper">
                <button
                  type="button"
                  onClick={() => onChangeDays(Math.max(1, days - 1))}
                  aria-label="One fewer day"
                >
                  −
                </button>
                <button
                  type="button"
                  onClick={() => onChangeDays(Math.min(21, days + 1))}
                  aria-label="One more day"
                >
                  +
                </button>
              </div>
            </div>

            <div className="tier-toggle" role="group" aria-label="Budget tier selection">
              {[
                ['value', '$ Value'],
                ['comfort', '$$ Comfort'],
                ['flash', '$$$ Splash'],
              ].map(([key, label]) => (
                <button
                  type="button"
                  key={key}
                  onClick={() => onChangeTier(key)}
                  className={tier === key ? 'is-selected' : ''}
                  aria-pressed={tier === key}
                >
                  {label}
                </button>
              ))}
            </div>

            <label className="budget-select">
              Currency
              <select value={currency} onChange={event => onChangeCurrency(event.target.value)}>
                {Object.entries(CURRENCIES).map(([key, details]) => (
                  <option key={key} value={key}>
                    {details.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="budget-select">
              Traveling with
              <select
                value={partySize}
                onChange={event => onChangePartySize(Number(event.target.value))}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map(size => (
                  <option key={size} value={size}>
                    {size} {size === 1 ? 'person' : 'people'}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="budget-summary">
            <p>
              <span>Daily basics · {days} × {formatMoney(daily, currency)} <em>est.</em></span>
              <b>{formatMoney(daily * days * partySize, currency)}</b>
            </p>
            <p>
              <span>Selected places <em>est.</em></span>
              <b>{formatMoney(activityCost * partySize, currency)}</b>
            </p>
            <p>
              <span>Transport between cities <em>est.</em></span>
              <b>{formatMoney(transportCost * partySize, currency)}</b>
            </p>
            <p className="budget-total">
              <span>Group total</span>
              <b>{totalDisplay}</b>
            </p>
            <p>
              <span>Per person</span>
              <b>{formatMoney(total, currency)}</b>
            </p>
            <small>Daily basics are estimates. Place prices are shown as estimates until confirmed locally.</small>
          </div>

          <div className="trip-actions">
            <button
              type="button"
              className="trip-actions__generate"
              onClick={() => {
                onOpenChange(false)
                onOpenPlan()
              }}
            >
              Generate plan <ArrowUpRight size={17} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </button>
            <button type="button" onClick={onShare}>
              <Share2 size={16} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /> Share trip
            </button>
            <button type="button" onClick={onExport}>
              Download image
            </button>
            {items.length > 0 && (
              <button type="button" onClick={onClear} className="trip-actions__clear">
                <Trash2 size={15} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /> Clear plan
              </button>
            )}
          </div>
        </section>
      )}

      {/* Solid paddy green bottom trip bar */}
      <footer className="trip-bar" role="region" aria-label="Trip summary bar">
        <div className="trip-bar__inner">
          <button
            type="button"
            className="trip-bar__summary-btn"
            onClick={() => onOpenChange(!isOpen)}
            aria-expanded={isOpen}
            aria-label="Toggle trip details"
          >
            <div className="trip-bar__copy">
              <span className="trip-bar__name">
                {items.length ? `${items.length} ${items.length === 1 ? 'stop' : 'stops'} saved` : 'Your trip'}
              </span>
              <span className="trip-bar__budget">
                {items.length ? `${totalDisplay} rough total · ${days}d` : 'Tap to set budget'}
              </span>
            </div>
            {isOpen ? (
              <ChevronDown size={19} className="trip-bar__chevron" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            ) : (
              <ChevronUp size={19} className="trip-bar__chevron" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            )}
          </button>

          <div className="trip-bar__chips" aria-label="Saved stops chips">
            {items.length === 0 ? (
              <span className="trip-bar__empty-hint">Tap + Add on places to shape your trip</span>
            ) : (
              items.map(place => {
                const IconComponent = CATEGORY_ICONS[place.category] || Landmark
                return (
                  <span key={place.id} className="trip-chip" title={place.name}>
                    <IconComponent size={13} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" />
                    <span className="trip-chip__text">{place.name}</span>
                    <button
                      type="button"
                      className="trip-chip__remove"
                      onClick={(e) => {
                        e.stopPropagation()
                        onRemove(place.id)
                      }}
                      aria-label={`Remove ${place.name}`}
                    >
                      <X size={12} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    </button>
                  </span>
                )
              })
            )}
          </div>

          <button
            type="button"
            className="trip-bar__generate-btn"
            onClick={onOpenPlan}
            aria-label="Generate plan"
          >
            <span>Generate plan</span>
            <ArrowUpRight size={17} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </button>
        </div>
      </footer>
    </div>
  )
}
