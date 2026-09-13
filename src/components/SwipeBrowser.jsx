import { Check, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function SwipeBrowser({ places, lowData, onAdd, onOpen }) {
  const [index, setIndex] = useState(0)
  const place = places[index]

  useEffect(() => setIndex(0), [places])
  if (!place) return null

  const next = () => setIndex(current => Math.min(current + 1, places.length - 1))
  const add = () => { onAdd(place); next() }

  return <section className="swipe-browser" aria-labelledby="swipe-browser-title">
    <div className="swipe-browser__heading"><div><p className="eyebrow">Mobile browse</p><h3 id="swipe-browser-title">A few places to consider</h3></div><span>{index + 1}/{places.length}</span></div>
    <button type="button" className="swipe-card" onClick={() => onOpen(place)} aria-label={`Open details for ${place.name}`}>
      {lowData ? <div className="swipe-card__image swipe-card__image--deferred">Photo deferred in low-data mode</div> : <img src={place.image} alt="" className="swipe-card__image" />}
      <div className="swipe-card__body"><b>{place.name}</b><span>{place.city} · ${place.cost} est. · {place.time}h</span><p>{place.tip}</p></div>
    </button>
    <div className="swipe-browser__actions"><button type="button" onClick={next} aria-label={`Skip ${place.name}`}><X size={18} /> Skip</button><button type="button" onClick={add} aria-label={`Add ${place.name}`}><Check size={18} /> Add</button></div>
    <div className="swipe-browser__hint"><ChevronLeft size={14} /> Buttons work too <ChevronRight size={14} /></div>
  </section>
}
