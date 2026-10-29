import { LogIn, Save, Trash2, UserPlus, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api } from '../lib/api'

export default function AccountPanel({
  open,
  onClose,
  user,
  onAuthChange,
  items,
  days,
  tier,
  onLoadTrip,
  activeTripId,
  onActiveTripIdChange,
  onOpenAdmin,
}) {
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
      const body = { name: tripName, days, tier, placeIds: items.map(place => place.id) }
      if (activeTripId) {
        const result = await api.updateTrip(activeTripId, body)
        setTrips(current => current.map(trip => trip.id === activeTripId ? result.trip : trip))
        setMessage('Trip updated.')
      } else {
        const result = await api.createTrip(body)
        setTrips(current => [result.trip, ...current])
        onActiveTripIdChange(result.trip.id)
        setMessage('Trip saved.')
      }
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
      if (id === activeTripId) onActiveTripIdChange(null)
    } catch (error) {
      setMessage(error.message)
    } finally {
      setIsBusy(false)
    }
  }

  const signOut = async () => {
    await api.logout()
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map(key => caches.delete(key)))
    }
    onAuthChange(null)
    onClose()
  }

  return (
    <div className="account-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <aside className="account-panel" role="dialog" aria-modal="true" aria-labelledby="account-title">
        <header className="account-panel__header">
          <div>
            <p className="eyebrow">Your account</p>
            <h2 id="account-title">Keep your trips close.</h2>
          </div>
          <button type="button" className="account-panel__close" onClick={onClose} aria-label="Close account panel">
            <X size={20} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </button>
        </header>

        {!user ? (
          <>
            <div className="account-tabs" role="tablist" aria-label="Account actions">
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'login'}
                onClick={() => {
                  setMode('login')
                  setMessage('')
                }}
              >
                <LogIn size={15} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /> Sign in
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'register'}
                onClick={() => {
                  setMode('register')
                  setMessage('')
                }}
              >
                <UserPlus size={15} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /> Create account
              </button>
            </div>
            <form className="account-form" onSubmit={submitAuth}>
              {mode === 'register' && (
                <label>
                  Username
                  <input
                    name="username"
                    value={form.username}
                    onChange={updateForm}
                    autoComplete="username"
                    minLength="3"
                    maxLength="24"
                    required
                  />
                </label>
              )}
              <label>
                Email
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={updateForm}
                  autoComplete="email"
                  required
                />
              </label>
              <label>
                Password
                <input
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={updateForm}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  minLength="8"
                  required
                />
              </label>
              <button className="account-primary" type="submit" disabled={isBusy}>
                {mode === 'login' ? 'Sign in' : 'Create account'}
              </button>
              {message && <p className="account-message" role="status">{message}</p>}
              <p className="account-note">
                Your password is encrypted with bcrypt. Saved trips stay tied to this device until you sign in.
              </p>
            </form>
          </>
        ) : (
          <>
            <div className="account-identity">
              <div className="account-avatar" aria-hidden="true">
                {user.username.slice(0, 1).toUpperCase()}
              </div>
              <div>
                <b>{user.username}</b>
                <small>{user.email}</small>
              </div>
              <button type="button" onClick={signOut}>Sign out</button>
            </div>
            {(user.role === 'admin' || user.isAdmin) && onOpenAdmin && (
              <button
                type="button"
                className="suggest-secondary"
                onClick={() => {
                  onClose()
                  onOpenAdmin()
                }}
              >
                Open admin dashboard
              </button>
            )}

            <form className="save-trip-form" onSubmit={saveTrip}>
              <label>
                Trip name
                <input
                  value={tripName}
                  onChange={event => setTripName(event.target.value)}
                  maxLength="48"
                  required
                />
              </label>
              <button className="account-primary" type="submit" disabled={isBusy}>
                <Save size={16} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /> {activeTripId ? 'Update trip' : 'Save current trip'}
              </button>
            </form>

            {message && <p className="account-message" role="status">{message}</p>}

            <section className="saved-trips" aria-labelledby="saved-trips-heading">
              <div className="saved-trips__heading">
                <h3 id="saved-trips-heading">Saved trips</h3>
                <span>{trips.length}</span>
              </div>
              {trips.length === 0 ? (
                <p className="account-empty">No saved trips yet. Save your current stops to access them anywhere.</p>
              ) : (
                <ul>
                  {trips.map(trip => (
                    <li key={trip.id}>
                      <button
                        type="button"
                        className="saved-trip-card"
                        onClick={() => {
                          onLoadTrip(trip)
                          onClose()
                        }}
                      >
                        <b>{trip.name}</b>
                        <small>
                          {trip.days} days · {trip.placeIds.length} stops · {trip.tier} tier
                        </small>
                      </button>
                      <button
                        type="button"
                        className="saved-trip-delete"
                        onClick={() => deleteTrip(trip.id)}
                        aria-label={`Delete ${trip.name}`}
                      >
                        <Trash2 size={16} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </aside>
    </div>
  )
}
