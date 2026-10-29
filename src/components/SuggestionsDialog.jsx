import { useCallback, useEffect, useState } from 'react'
import { Mail, X } from 'lucide-react'
import SuggestPlaceForm from './SuggestPlaceForm'
import { api } from '../lib/api'

const STATUS_LABEL = { pending: 'Pending', approved: 'Approved', rejected: 'Rejected' }

function StatusBadge({ status }) {
  return <span className={`status-badge status-badge--${status}`}>{STATUS_LABEL[status]}</span>
}

function MySuggestions({ onEdit, onChanged }) {
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')
  const load = useCallback(() => api.mySuggestions().then(result => setItems(result.suggestions)).catch(failure => setError(failure.message)), [])
  useEffect(() => { load() }, [load])

  const remove = async item => {
    if (!window.confirm(`Delete "${item.name}"? This can't be undone.`)) return
    try { await api.deleteSuggestion(item.id); await load(); onChanged?.() } catch (failure) { setError(failure.message) }
  }

  if (error && !items) return <p className="suggest-error" role="alert">{error}</p>
  if (!items) return <p role="status">Loading your suggestions…</p>
  if (!items.length) return <p className="suggest-empty">You haven't suggested anything yet.</p>
  return (
    <>
      {error && <p className="suggest-error" role="alert">{error}</p>}
      <ul className="suggestion-list">
        {items.map(item => (
          <li key={item.id}>
            <div className="suggestion-list__top"><b>{item.name}</b><StatusBadge status={item.status} /></div>
            <small>{item.category} · {item.province}{item.status === 'approved' ? ` · ${item.likes} ${item.likes === 1 ? 'like' : 'likes'}` : ''}</small>
            {item.status === 'rejected' && item.reviewNote && <p className="suggestion-list__note">Reviewer note: {item.reviewNote}</p>}
            {item.status === 'pending' && (
              <div className="suggestion-list__actions">
                <button type="button" className="suggest-secondary" onClick={() => onEdit(item)}>Edit</button>
                <button type="button" className="suggest-secondary suggest-secondary--danger" onClick={() => remove(item)}>Delete</button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </>
  )
}

function InboxList({ onNotificationsChanged }) {
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    return api.notifications()
      .then(result => {
        setItems(result.notifications || [])
        onNotificationsChanged?.(result.unreadCount || 0)
      })
      .catch(failure => setError(failure.message))
  }, [onNotificationsChanged])

  useEffect(() => { load() }, [load])

  const markRead = async id => {
    setError('')
    try {
      await api.markNotificationRead(id)
      await load()
    } catch (failure) {
      setError(failure.message)
    }
  }

  const markAllRead = async () => {
    setError('')
    try {
      await api.markAllNotificationsRead()
      await load()
    } catch (failure) {
      setError(failure.message)
    }
  }

  if (error && !items) return <p className="suggest-error" role="alert">{error}</p>
  if (!items) return <p role="status">Loading your inbox…</p>
  if (!items.length) return <p className="suggest-empty">Your inbox is empty. When an admin reviews a place you suggested, you’ll get a web & email notification here.</p>

  const unreadCount = items.filter(item => !item.readAt).length

  return (
    <>
      {error && <p className="suggest-error" role="alert">{error}</p>}
      {unreadCount > 0 && (
        <div className="flex items-center justify-between gap-2 mb-3">
          <small className="font-semibold text-[#1F4D3A]">{unreadCount} unread {unreadCount === 1 ? 'notification' : 'notifications'}</small>
          <button type="button" className="suggest-secondary" onClick={markAllRead}>Mark all read</button>
        </div>
      )}
      <ul className="suggestion-list">
        {items.map(item => {
          const isApproved = item.type === 'suggestion_approved'
          return (
            <li key={item.id} className={!item.readAt ? 'border-[#1F4D3A]/40 bg-[#FFFDF8]' : ''}>
              <div className="suggestion-list__top">
                <b>{item.title}</b>
                <StatusBadge status={isApproved ? 'approved' : 'rejected'} />
              </div>
              <p className="text-sm text-[#35483E] my-1">{item.body}</p>
              <div className="flex items-center justify-between gap-2 flex-wrap mt-1">
                <small className="inline-flex items-center gap-1.5">
                  {new Date(item.createdAt).toLocaleDateString()}
                  {item.emailSent && (
                    <span className="inline-flex items-center gap-1 text-xs text-[#1F4D3A] font-medium">
                      · <Mail size={12} aria-hidden="true" /> Email sent
                    </span>
                  )}
                </small>
                {!item.readAt && (
                  <button type="button" className="suggest-secondary" onClick={() => markRead(item.id)}>
                    Mark as read
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </>
  )
}

export default function SuggestionsDialog({ user, activeProvince, places, initialTab = 'new', unreadCount = 0, onNotificationsChanged, onClose, onChanged, onRequestSignIn }) {
  const [tab, setTab] = useState(initialTab)
  const [editing, setEditing] = useState(null)
  const [formKey, setFormKey] = useState(0)
  const tabs = [
    ['new', editing ? 'Edit suggestion' : 'Suggest a place'],
    ['mine', 'My suggestions'],
    ['inbox', unreadCount > 0 ? `Inbox (${unreadCount})` : 'Inbox'],
  ]

  useEffect(() => {
    setTab(initialTab)
  }, [initialTab])

  useEffect(() => {
    const onKey = event => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const switchTab = next => { if (next === 'new' && tab !== 'new') { setEditing(null); setFormKey(key => key + 1) } setTab(next) }

  return (
    <div className="suggest-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <div className="suggest-modal" role="dialog" aria-modal="true" aria-labelledby="suggest-title">
        <div className="suggest-modal__head">
          <h3 id="suggest-title">Community picks</h3>
          <button type="button" className="sheet-close" onClick={onClose} aria-label="Close"><X size={18} aria-hidden="true" /></button>
        </div>
        {!user ? (
          <div className="suggest-success">
            <b>Sign in to suggest a place</b>
            <p>An account lets us show you the review status of your suggestions.</p>
            <button type="button" className="suggest-primary" onClick={onRequestSignIn}>Sign in or create account</button>
          </div>
        ) : (
          <>
            <div className="suggest-tabs" role="tablist">
              {tabs.map(([id, label]) => (
                <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'is-active' : ''} onClick={() => switchTab(id)}>{label}</button>
              ))}
            </div>
            <div className="suggest-modal__body">
              {tab === 'new' && (
                <SuggestPlaceForm
                  key={`${formKey}-${editing?.id || 'new'}`}
                  activeProvince={activeProvince}
                  places={places}
                  editing={editing}
                  onSaved={() => onChanged?.()}
                  onGoToMine={() => { setEditing(null); setTab('mine') }}
                />
              )}
              {tab === 'mine' && <MySuggestions onEdit={item => { setEditing(item); setTab('new') }} onChanged={onChanged} />}
              {tab === 'inbox' && <InboxList onNotificationsChanged={onNotificationsChanged} />}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
