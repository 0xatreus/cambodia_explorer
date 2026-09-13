import { LogIn, Save, Trash2, UserPlus, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api } from '../lib/api'

export default function AccountPanel({ open, onClose, user, onAuthChange, items, days, tier, onLoadTrip }) {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [tripName, setTripName] = useState('My Cambodia trip')
  const [trips, setTrips] = useState([])
  const [message, setMessage] = useState('')
  const [isBusy, setIsBusy] = useState(false)

  useEffect(() => {
    if (!open || !user) return
    setMessage('')
    api.listTrips().then(result => setTrips(result.trips)).catch(error => setMessage(error.message))
  }, [open, user])

  if (!open) return null

  const updateForm = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }))
  const submitAuth = async event => {
    event.preventDefault()
    setIsBusy(true)
    setMessage('')
    try {
      const result = mode === 'login' ? await api.login({ email: form.email, password: form.password }) : await api.register(form)
      onAuthChange(result.user)
      setForm({ username: '', email: '', password: '' })
      if (items.length) setMessage('Your current guest trip is still here. Save it below when you are ready.')
    } catch (error) {
      setMessage(error.message)
    } finally {
      setIsBusy(false)
    }
  }

  const saveTrip = async event => {
    event.preventDefault()
    if (!items.length) {
      setMessage('Add at least one spot before saving a trip.')
      return
    }
    setIsBusy(true)
    setMessage('')
    try {
      const result = await api.createTrip({ name: tripName, days, tier, placeIds: items.map(place => place.id) })
      setTrips(current => [result.trip, ...current])
      setMessage('Trip saved.')
    } catch (error) {
      setMessage(error.message)
    } finally {
      setIsBusy(false)
    }
  }

  const deleteTrip = async id => {
    setIsBusy(true)
    try {
      await api.deleteTrip(id)
      setTrips(current => current.filter(trip => trip.id !== id))
    } catch (error) {
      setMessage(error.message)
    } finally {
      setIsBusy(false)
    }
  }

  const signOut = async () => {
    await api.logout()
    onAuthChange(null)
    onClose()
  }

  return <div className="account-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}>
    <aside className="account-panel" role="dialog" aria-modal="true" aria-labelledby="account-title">
      <header className="account-panel__header">
        <div><p className="eyebrow">Your account</p><h2 id="account-title">Keep your trips close.</h2></div>
        <button type="button" className="account-panel__close" onClick={onClose} aria-label="Close account panel"><X size={20} /></button>
      </header>
      {!user ? <>
        <div className="account-tabs" role="tablist" aria-label="Account actions"><button role="tab" aria-selected={mode === 'login'} onClick={() => { setMode('login'); setMessage('') }}><LogIn size={15} /> Sign in</button><button role="tab" aria-selected={mode === 'register'} onClick={() => { setMode('register'); setMessage('') }}><UserPlus size={15} /> Create account</button></div>
        <form className="account-form" onSubmit={submitAuth}>
          {mode === 'register' && <label>Username<input name="username" value={form.username} onChange={updateForm} autoComplete="username" minLength="3" maxLength="24" required /></label>}
          <label>Email<input name="email" type="email" value={form.email} onChange={updateForm} autoComplete="email" required /></label>
          <label>Password<input name="password" type="password" value={form.password} onChange={updateForm} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength="8" required /></label>
          <button className="account-primary" type="submit" disabled={isBusy}>{mode === 'login' ? 'Sign in' : 'Create account'}</button>
        </form>
        <p className="account-note">Your trips are private to your account. Passwords are hashed on the server.</p>
      </> : <>
        <div className="account-identity"><span className="account-avatar">{user.username.slice(0, 1).toUpperCase()}</span><div><b>{user.username}</b><small>{user.email}</small></div><button type="button" onClick={signOut}>Sign out</button></div>
        <form className="save-trip-form" onSubmit={saveTrip}><label>Save the current trip<input value={tripName} onChange={event => setTripName(event.target.value)} maxLength="80" required /></label><button className="account-primary" type="submit" disabled={isBusy}><Save size={16} /> Save trip</button></form>
        <section className="saved-trips" aria-labelledby="saved-trips-title"><div className="saved-trips__heading"><h3 id="saved-trips-title">Saved trips</h3><span>{trips.length}</span></div>{trips.length ? <ul>{trips.map(trip => <li key={trip.id}><button className="saved-trip-card" onClick={() => { onLoadTrip(trip); onClose() }}><b>{trip.name}</b><small>{trip.placeIds.length} spots · {trip.days} days · {trip.tier}</small></button><button className="saved-trip-delete" onClick={() => deleteTrip(trip.id)} aria-label={`Delete ${trip.name}`}><Trash2 size={16} /></button></li>)}</ul> : <p className="account-empty">Your saved trips will show up here.</p>}</section>
      </>}
      {message && <p className="account-message" role="status">{message}</p>}
    </aside>
  </div>
}
