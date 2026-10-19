import { useState } from 'react'
import { X } from 'lucide-react'

export default function SuggestPlaceForm({ city, onClose, onSubmitted }) {
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = event => {
    event.preventDefault()
    if (!name.trim()) return
    setIsSubmitted(true)
    onSubmitted?.()
  }

  return <div className="suggest-form" role="dialog" aria-labelledby="suggest-form-title">
    <div className="suggest-form__head">
      <h4 id="suggest-form-title">Suggest a place you loved</h4>
      <button type="button" className="suggest-form__close" onClick={onClose} aria-label="Close suggestion form"><X size={16} /></button>
    </div>
    {isSubmitted
      ? <p className="suggest-form__thanks">Thanks! We'll take a look and add it as a community pick if it fits.</p>
      : <form onSubmit={handleSubmit}>
          <label htmlFor="suggest-form-name">Place name</label>
          <input id="suggest-form-name" type="text" value={name} onChange={event => setName(event.target.value)} placeholder={`Somewhere near ${city}`} required />
          <label htmlFor="suggest-form-note">Why do you love it?</label>
          <textarea id="suggest-form-note" value={note} onChange={event => setNote(event.target.value)} rows={3} placeholder="A short tip for other travellers" />
          <button type="submit">Send suggestion</button>
        </form>}
  </div>
}
