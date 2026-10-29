import { useCallback, useEffect, useState } from 'react'
import { divIcon } from 'leaflet'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { AlertTriangle, ArrowLeft, Check, Edit3, FileText, LayoutDashboard, MapPin, Search, Shield, ShieldOff, Trash2, Users, Compass, ScrollText } from 'lucide-react'
import 'leaflet/dist/leaflet.css'
import filterOptions from '../data/filterOptions.json'
import provinces from '../data/provinces.json'
import { DIETARY_TAGS, VIBE_TAGS } from '../data/places'
import { api } from '../lib/api'
import { nearestProvince } from '../lib/geo'

const CAMBODIA_BOUNDS = [[10.3, 102.3], [14.75, 107.7]]
const PIN_ICON = divIcon({
  className: 'category-marker-wrap',
  html: '<span class="category-marker is-saved" style="--marker-color:#d55732"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/></svg></span>',
  iconSize: [38, 46],
  iconAnchor: [19, 42],
})

const STATUS_LABELS = { pending: 'Pending', approved: 'Approved', rejected: 'Rejected' }

function PinMap({ lat, lng, editable, onPick }) {
  const position = [lat, lng]
  return (
    <div className="admin-pin-map" aria-label="Suggestion location map">
      <MapContainer center={position} zoom={13} minZoom={7} maxZoom={18} maxBounds={CAMBODIA_BOUNDS} scrollWheelZoom={false}>
        <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <PinMapInner position={position} editable={editable} onPick={onPick} />
      </MapContainer>
    </div>
  )
}

function PinMapInner({ position, editable, onPick }) {
  const map = useMap()
  useEffect(() => {
    map.setView(position, map.getZoom(), { animate: true })
  }, [position, map])
  useMapEvents({
    click: event => {
      if (editable && onPick) onPick(event.latlng.lat, event.latlng.lng)
    },
  })
  return (
    <Marker
      position={position}
      icon={PIN_ICON}
      draggable={editable}
      eventHandlers={{
        dragend: event => {
          if (!editable || !onPick) return
          const coords = event.target.getLatLng()
          onPick(coords.lat, coords.lng)
        },
      }}
    />
  )
}

function PaginationBar({ page, totalPages, total, onPageChange }) {
  if (totalPages <= 1 && total <= 25) {
    return <p className="admin-pagination__summary">{total} {total === 1 ? 'item' : 'items'}</p>
  }
  return (
    <div className="admin-pagination" role="navigation" aria-label="Pagination">
      <span className="admin-pagination__summary">Page {page} of {totalPages} · {total} total</span>
      <div className="admin-pagination__controls">
        <button type="button" className="suggest-secondary" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Previous</button>
        <button type="button" className="suggest-secondary" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Next</button>
      </div>
    </div>
  )
}

function ConfirmDialog({ dialog, onCancel }) {
  if (!dialog) return null
  return (
    <div className="suggest-backdrop" onMouseDown={event => event.target === event.currentTarget && onCancel()}>
      <div className="admin-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="admin-confirm-title">
        <h3 id="admin-confirm-title">{dialog.title}</h3>
        <p>{dialog.message}</p>
        <div className="suggestion-list__actions">
          <button
            type="button"
            className={dialog.danger ? 'suggest-secondary suggest-secondary--danger' : 'suggest-primary'}
            onClick={dialog.onConfirm}
          >
            {dialog.confirmLabel || 'Confirm'}
          </button>
          <button type="button" className="suggest-secondary" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

export default function AdminDashboard({ user, onBack, onOpenSignIn, onPlacesChanged }) {
  const isAdmin = user?.role === 'admin' || Boolean(user?.isAdmin)
  const [section, setSection] = useState('suggestions')
  const [overview, setOverview] = useState(null)
  const [confirmDialog, setConfirmDialog] = useState(null)

  const loadOverview = useCallback(() => {
    if (!isAdmin) return
    api.adminOverview().then(setOverview).catch(() => {})
  }, [isAdmin])

  useEffect(() => {
    loadOverview()
  }, [loadOverview])

  if (!isAdmin) {
    return (
      <section className="admin-shell" aria-labelledby="admin-denied-title">
        <div className="admin-denied" role="alert">
          <ShieldOff size={36} aria-hidden="true" />
          <h1 id="admin-denied-title">Not allowed</h1>
          <p>
            {user
              ? `You are signed in as ${user.username} (${user.role || 'user'}), which does not have admin access.`
              : 'Sign in with an administrator account to access the Cambodia Explorer dashboard.'}
          </p>
          <div className="suggestion-list__actions">
            <button type="button" className="suggest-primary" onClick={onBack}>
              <ArrowLeft size={16} aria-hidden="true" /> Back to explorer
            </button>
            {!user && (
              <button type="button" className="suggest-secondary" onClick={onOpenSignIn}>
                Sign in
              </button>
            )}
          </div>
        </div>
      </section>
    )
  }

  const pendingCount = overview?.counts?.suggestions?.pending ?? 0
  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'suggestions', label: 'Suggestions queue', icon: MapPin, badge: pendingCount },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'trips', label: 'Trips', icon: Compass },
    { id: 'audit', label: 'Audit log', icon: ScrollText },
  ]

  return (
    <section className="admin-shell" aria-label="Admin dashboard">
      <header className="admin-header">
        <div className="admin-header__left">
          <button type="button" className="suggest-secondary" onClick={onBack}>
            <ArrowLeft size={16} aria-hidden="true" /> Back to explorer
          </button>
          <div>
            <p className="eyebrow">Administration</p>
            <h1>Cambodia Explorer Admin</h1>
          </div>
        </div>
        <div className="admin-header__badge">
          <Shield size={16} aria-hidden="true" />
          <span>{user.username} · Admin</span>
        </div>
      </header>

      <div className="admin-layout">
        <nav className="admin-nav" aria-label="Admin sections">
          {navItems.map(item => {
            const Icon = item.icon
            const active = section === item.id
            return (
              <button
                key={item.id}
                type="button"
                className={`admin-nav__button${active ? ' is-active' : ''}`}
                aria-current={active ? 'page' : undefined}
                onClick={() => setSection(item.id)}
              >
                <Icon size={17} aria-hidden="true" />
                <span>{item.label}</span>
                {item.badge > 0 && <em className="chip-count">{item.badge}</em>}
              </button>
            )
          })}
        </nav>

        <div className="admin-main">
          {section === 'overview' && (
            <OverviewSection overview={overview} onReload={loadOverview} onJumpToSuggestions={() => setSection('suggestions')} />
          )}
          {section === 'suggestions' && (
            <SuggestionsQueueSection
              onChanged={() => {
                loadOverview()
                onPlacesChanged?.()
              }}
              onConfirm={setConfirmDialog}
            />
          )}
          {section === 'users' && (
            <UsersSection
              currentUserId={user.id}
              onChanged={loadOverview}
              onConfirm={setConfirmDialog}
            />
          )}
          {section === 'trips' && <TripsSection />}
          {section === 'audit' && <AuditLogSection />}
        </div>
      </div>

      <ConfirmDialog dialog={confirmDialog} onCancel={() => setConfirmDialog(null)} />
    </section>
  )
}

function OverviewSection({ overview, onReload, onJumpToSuggestions }) {
  useEffect(() => {
    onReload()
  }, [onReload])

  if (!overview) return <p className="admin-loading" role="status">Loading overview…</p>
  const { counts, signupsByDay, mostSavedPlaces, mostSuggestedProvinces } = overview

  return (
    <div className="admin-section">
      <div className="admin-stats-grid">
        <article className="admin-stat-card">
          <span>Total users</span>
          <strong>{counts.users}</strong>
          <small>{counts.activeUsers} active · {counts.disabledUsers} disabled · {counts.admins} admins</small>
        </article>
        <article className="admin-stat-card">
          <span>Signups (last 30d)</span>
          <strong>{counts.signupsLast30Days}</strong>
          <small>{signupsByDay.length} active signup days</small>
        </article>
        <article className="admin-stat-card">
          <span>Saved trips</span>
          <strong>{counts.trips}</strong>
          <small>Across all registered accounts</small>
        </article>
        <article className="admin-stat-card">
          <span>Suggestions</span>
          <strong>{counts.suggestions.pending} pending</strong>
          <small>{counts.suggestions.approved} approved · {counts.suggestions.rejected} rejected</small>
          <button type="button" className="suggest-secondary" onClick={onJumpToSuggestions}>Review queue</button>
        </article>
      </div>

      <div className="admin-overview-columns">
        <div className="admin-card">
          <h3>Most-saved places</h3>
          {mostSavedPlaces.length === 0 ? (
            <p className="suggest-empty">No saved trips yet.</p>
          ) : (
            <ul className="admin-metric-list">
              {mostSavedPlaces.map(place => (
                <li key={place.id}>
                  <span><b>{place.name}</b>{place.province ? <small> · {place.province}</small> : null}</span>
                  <em>{place.count} {place.count === 1 ? 'trip' : 'trips'}</em>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="admin-card">
          <h3>Most-suggested provinces</h3>
          {mostSuggestedProvinces.length === 0 ? (
            <p className="suggest-empty">No place suggestions yet.</p>
          ) : (
            <ul className="admin-metric-list">
              {mostSuggestedProvinces.map(item => (
                <li key={item.province}>
                  <span><b>{item.province}</b></span>
                  <em>{item.count} {item.count === 1 ? 'suggestion' : 'suggestions'}</em>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="admin-card">
          <h3>Signups by day (last 30 days)</h3>
          {signupsByDay.length === 0 ? (
            <p className="suggest-empty">No signups in the last 30 days.</p>
          ) : (
            <ul className="admin-metric-list">
              {signupsByDay.map(item => (
                <li key={item.day}>
                  <span>{item.day}</span>
                  <em>{item.count} {item.count === 1 ? 'signup' : 'signups'}</em>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

function SuggestionsQueueSection({ onChanged, onConfirm }) {
  const [statusFilter, setStatusFilter] = useState('pending')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editDraft, setEditDraft] = useState(null)
  const [rejectNote, setRejectNote] = useState('')
  const [showRejectBox, setShowRejectBox] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    setError('')
    api.adminSuggestions({ status: statusFilter, q: query, page })
      .then(result => {
        setData(result)
        setSelectedId(current => {
          if (current && result.suggestions.some(item => item.id === current)) return current
          return result.suggestions[0]?.id ?? null
        })
      })
      .catch(failure => setError(failure.message))
  }, [statusFilter, query, page])

  useEffect(() => {
    load()
  }, [load])

  const selected = data?.suggestions?.find(item => item.id === selectedId) || null

  const startEditing = item => {
    setIsEditing(true)
    setShowRejectBox(false)
    setEditDraft({
      name: item.name,
      category: item.category,
      province: item.province,
      lat: item.lat,
      lng: item.lng,
      description: item.description || '',
      tags: [...(item.tags || [])],
      photoUrl: item.photoUrl || '',
    })
  }

  const toggleDraftTag = tagId => {
    setEditDraft(current => {
      const exists = current.tags.includes(tagId)
      const nextTags = exists ? current.tags.filter(t => t !== tagId) : current.tags.length < 6 ? [...current.tags, tagId] : current.tags
      return { ...current, tags: nextTags }
    })
  }

  const saveEdit = async event => {
    event.preventDefault()
    if (!selected || !editDraft) return
    setBusy(true)
    setError('')
    try {
      await api.adminEditSuggestion(selected.id, {
        ...editDraft,
        lat: Number(editDraft.lat),
        lng: Number(editDraft.lng),
        photoUrl: editDraft.photoUrl || null,
      })
      setIsEditing(false)
      await load()
      onChanged?.()
    } catch (failure) {
      setError(failure.message)
    } finally {
      setBusy(false)
    }
  }

  const reviewItem = async (item, decision) => {
    setBusy(true)
    setError('')
    try {
      await api.reviewSuggestion(item.id, { decision, note: decision === 'rejected' ? rejectNote : '' })
      setShowRejectBox(false)
      setRejectNote('')
      setIsEditing(false)
      await load()
      onChanged?.()
    } catch (failure) {
      setError(failure.message)
    } finally {
      setBusy(false)
    }
  }

  const confirmDelete = item => {
    onConfirm({
      title: `Delete "${item.name}"?`,
      message: 'This suggestion will be removed from the queue and from the map if approved.',
      confirmLabel: 'Delete suggestion',
      danger: true,
      onConfirm: async () => {
        onConfirm(null)
        setBusy(true)
        setError('')
        try {
          await api.adminDeleteSuggestion(item.id)
          setIsEditing(false)
          await load()
          onChanged?.()
        } catch (failure) {
          setError(failure.message)
        } finally {
          setBusy(false)
        }
      },
    })
  }

  return (
    <div className="admin-section">
      <div className="admin-toolbar">
        <div className="suggest-chips" role="group" aria-label="Filter suggestions by status">
          {['pending', 'approved', 'rejected', 'all'].map(status => (
            <button
              key={status}
              type="button"
              className={`chip${statusFilter === status ? ' is-selected' : ''}`}
              aria-pressed={statusFilter === status}
              onClick={() => { setStatusFilter(status); setPage(1); setIsEditing(false); setShowRejectBox(false) }}
            >
              {statusFilter === status && <Check size={14} aria-hidden="true" />}
              {status === 'all' ? 'All' : STATUS_LABELS[status]}
            </button>
          ))}
        </div>
        <div className="admin-search">
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={event => { setQuery(event.target.value); setPage(1) }}
            placeholder="Search name, province, category, or submitter…"
            aria-label="Search suggestions"
          />
        </div>
      </div>

      {error && <p className="suggest-error" role="alert">{error}</p>}

      {!data ? (
        <p className="admin-loading" role="status">Loading suggestions…</p>
      ) : data.suggestions.length === 0 ? (
        <p className="suggest-empty">No suggestions match the current filter.</p>
      ) : (
        <div className="admin-queue-grid">
          <div className="admin-card admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Province</th>
                  <th>Category</th>
                  <th>Submitter</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.suggestions.map(item => (
                  <tr
                    key={item.id}
                    className={item.id === selected?.id ? 'is-selected' : ''}
                    onClick={() => { setSelectedId(item.id); setIsEditing(false); setShowRejectBox(false); setRejectNote('') }}
                  >
                    <td>
                      <button
                        type="button"
                        className="admin-row-button"
                        onClick={() => { setSelectedId(item.id); setIsEditing(false); setShowRejectBox(false); setRejectNote('') }}
                      >
                        <b>{item.name}</b>
                        {item.duplicates?.length > 0 && (
                          <span className="admin-dup-pill" title="Possible duplicate nearby">
                            <AlertTriangle size={13} aria-hidden="true" /> Duplicate?
                          </span>
                        )}
                      </button>
                    </td>
                    <td>{item.province}</td>
                    <td>{item.category}</td>
                    <td>{item.submittedBy}</td>
                    <td>{String(item.createdAt).slice(0, 10)}</td>
                    <td><span className={`status-badge status-badge--${item.status}`}>{STATUS_LABELS[item.status]}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <PaginationBar page={data.page} totalPages={data.totalPages} total={data.total} onPageChange={setPage} />
          </div>

          {selected && (
            <aside className="admin-card admin-detail" aria-label="Suggestion details">
              <div className="suggestion-list__top">
                <div>
                  <h3>{selected.name}</h3>
                  <small>
                    Submitted by <b>{selected.submittedBy}</b>{selected.submitterEmail ? ` (${selected.submitterEmail})` : ''} · {String(selected.createdAt).slice(0, 10)}
                  </small>
                </div>
                <span className={`status-badge status-badge--${selected.status}`}>{STATUS_LABELS[selected.status]}</span>
              </div>

              {selected.duplicates?.length > 0 && (
                <div className="suggest-warning" role="alert">
                  <b><AlertTriangle size={15} aria-hidden="true" /> Possible duplicate near existing places:</b>
                  <ul>
                    {selected.duplicates.map(dup => (
                      <li key={dup.id}>{dup.name} ({dup.source}) · {dup.distanceMeters} m away</li>
                    ))}
                  </ul>
                </div>
              )}

              {!isEditing ? (
                <>
                  <PinMap lat={selected.lat} lng={selected.lng} editable={false} />
                  <p className="admin-detail__coords">
                    <b>{selected.province}</b> · {selected.category} · {selected.lat.toFixed(5)}, {selected.lng.toFixed(5)}
                  </p>
                  {selected.description ? (
                    <p className="admin-detail__blurb">{selected.description}</p>
                  ) : (
                    <p className="suggest-empty">No blurb provided.</p>
                  )}
                  {selected.tags?.length > 0 && (
                    <div className="suggest-chips">
                      {selected.tags.map(tag => <span key={tag} className="chip">{tag}</span>)}
                    </div>
                  )}
                  {selected.photoUrl && <img className="photo-preview" src={selected.photoUrl} alt={selected.name} />}
                  {selected.status === 'rejected' && selected.reviewNote && (
                    <p className="suggestion-list__note">Rejection reason: {selected.reviewNote}</p>
                  )}

                  {showRejectBox ? (
                    <div className="suggestion-list__actions suggestion-list__actions--stack">
                      <label htmlFor="admin-reject-note">Short reason for rejection (shown to user in My suggestions)</label>
                      <input
                        id="admin-reject-note"
                        type="text"
                        value={rejectNote}
                        maxLength={200}
                        onChange={event => setRejectNote(event.target.value)}
                        placeholder="e.g. Already in catalog under Angkor Wat"
                      />
                      <div className="suggestion-list__actions">
                        <button
                          type="button"
                          className="suggest-secondary suggest-secondary--danger"
                          disabled={busy || !rejectNote.trim()}
                          onClick={() => reviewItem(selected, 'rejected')}
                        >
                          Confirm reject
                        </button>
                        <button type="button" className="suggest-secondary" onClick={() => setShowRejectBox(false)}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="suggestion-list__actions">
                      {selected.status === 'pending' && (
                        <>
                          <button type="button" className="suggest-primary" disabled={busy} onClick={() => reviewItem(selected, 'approved')}>
                            <Check size={15} aria-hidden="true" /> Approve
                          </button>
                          <button type="button" className="suggest-secondary" disabled={busy} onClick={() => { setShowRejectBox(true); setRejectNote('') }}>
                            Reject…
                          </button>
                        </>
                      )}
                      <button type="button" className="suggest-secondary" disabled={busy} onClick={() => startEditing(selected)}>
                        <Edit3 size={15} aria-hidden="true" /> Edit
                      </button>
                      <button type="button" className="suggest-secondary suggest-secondary--danger" disabled={busy} onClick={() => confirmDelete(selected)}>
                        <Trash2 size={15} aria-hidden="true" /> Delete
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <form className="suggest-form-body" onSubmit={saveEdit}>
                  <label htmlFor="admin-edit-name">Place name</label>
                  <input
                    id="admin-edit-name"
                    type="text"
                    value={editDraft.name}
                    minLength={3}
                    maxLength={80}
                    required
                    onChange={event => setEditDraft(d => ({ ...d, name: event.target.value }))}
                  />

                  <div className="admin-edit-grid">
                    <div>
                      <label htmlFor="admin-edit-category">Category</label>
                      <select
                        id="admin-edit-category"
                        className="admin-select"
                        value={editDraft.category}
                        onChange={event => setEditDraft(d => ({ ...d, category: event.target.value }))}
                      >
                        {filterOptions.categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="admin-edit-province">Province</label>
                      <select
                        id="admin-edit-province"
                        className="admin-select"
                        value={editDraft.province}
                        onChange={event => setEditDraft(d => ({ ...d, province: event.target.value }))}
                      >
                        {provinces.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="admin-edit-grid">
                    <div>
                      <label htmlFor="admin-edit-lat">Latitude</label>
                      <input
                        id="admin-edit-lat"
                        type="number"
                        step="0.00001"
                        value={editDraft.lat}
                        onChange={event => {
                          const lat = Number(event.target.value)
                          const near = Number.isFinite(lat) ? nearestProvince(lat, Number(editDraft.lng)) : null
                          setEditDraft(d => ({ ...d, lat: event.target.value, province: near ? near.name : d.province }))
                        }}
                      />
                    </div>
                    <div>
                      <label htmlFor="admin-edit-lng">Longitude</label>
                      <input
                        id="admin-edit-lng"
                        type="number"
                        step="0.00001"
                        value={editDraft.lng}
                        onChange={event => {
                          const lng = Number(event.target.value)
                          const near = Number.isFinite(lng) ? nearestProvince(Number(editDraft.lat), lng) : null
                          setEditDraft(d => ({ ...d, lng: event.target.value, province: near ? near.name : d.province }))
                        }}
                      />
                    </div>
                  </div>

                  <PinMap
                    lat={Number(editDraft.lat) || selected.lat}
                    lng={Number(editDraft.lng) || selected.lng}
                    editable
                    onPick={(lat, lng) => {
                      const fixedLat = Number(lat.toFixed(5))
                      const fixedLng = Number(lng.toFixed(5))
                      const near = nearestProvince(fixedLat, fixedLng)
                      setEditDraft(d => ({ ...d, lat: fixedLat, lng: fixedLng, province: near ? near.name : d.province }))
                    }}
                  />

                  <fieldset>
                    <legend>Vibe & dietary tags</legend>
                    <div className="suggest-chips">
                      {[...VIBE_TAGS, ...DIETARY_TAGS].map(tag => (
                        <button
                          key={tag.id}
                          type="button"
                          className={`chip${editDraft.tags.includes(tag.id) ? ' is-selected' : ''}`}
                          aria-pressed={editDraft.tags.includes(tag.id)}
                          onClick={() => toggleDraftTag(tag.id)}
                        >
                          {editDraft.tags.includes(tag.id) && <Check size={14} aria-hidden="true" />}
                          {tag.label}
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  <label htmlFor="admin-edit-blurb">Blurb / note</label>
                  <textarea
                    id="admin-edit-blurb"
                    rows={3}
                    maxLength={500}
                    value={editDraft.description}
                    onChange={event => setEditDraft(d => ({ ...d, description: event.target.value }))}
                  />

                  <div className="suggestion-list__actions">
                    <button type="submit" className="suggest-primary" disabled={busy}>Save changes</button>
                    <button type="button" className="suggest-secondary" onClick={() => setIsEditing(false)}>Cancel</button>
                  </div>
                </form>
              )}
            </aside>
          )}
        </div>
      )}
    </div>
  )
}

function UsersSection({ currentUserId, onChanged, onConfirm }) {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(() => {
    setError('')
    api.adminUsers({ q: query, page }).then(setData).catch(failure => setError(failure.message))
  }, [query, page])

  useEffect(() => {
    load()
  }, [load])

  const changeRole = (target, nextRole) => {
    const run = async () => {
      onConfirm(null)
      setBusyId(target.id)
      setError('')
      try {
        await api.adminSetUserRole(target.id, nextRole)
        await load()
        onChanged?.()
      } catch (failure) {
        setError(failure.message)
      } finally {
        setBusyId(null)
      }
    }
    if (nextRole === 'user') {
      onConfirm({
        title: `Remove admin role from ${target.username}?`,
        message: `${target.username} (${target.email}) will no longer be able to access the admin dashboard.`,
        confirmLabel: 'Demote to user',
        danger: true,
        onConfirm: run,
      })
    } else {
      run()
    }
  }

  const changeStatus = (target, disable) => {
    const run = async () => {
      onConfirm(null)
      setBusyId(target.id)
      setError('')
      try {
        await api.adminSetUserStatus(target.id, disable)
        await load()
        onChanged?.()
      } catch (failure) {
        setError(failure.message)
      } finally {
        setBusyId(null)
      }
    }
    if (disable) {
      onConfirm({
        title: `Disable ${target.username}?`,
        message: `All active sessions for ${target.username} (${target.email}) will be invalidated immediately, and they will not be able to sign in until re-enabled.`,
        confirmLabel: 'Disable account',
        danger: true,
        onConfirm: run,
      })
    } else {
      run()
    }
  }

  const deleteUser = target => {
    onConfirm({
      title: `Delete account "${target.username}"?`,
      message: `This permanently deletes ${target.email} along with their ${target.tripCount} saved trips and ${target.suggestionCount} suggestions. This cannot be undone.`,
      confirmLabel: 'Delete account & data',
      danger: true,
      onConfirm: async () => {
        onConfirm(null)
        setBusyId(target.id)
        setError('')
        try {
          await api.adminDeleteUser(target.id)
          await load()
          onChanged?.()
        } catch (failure) {
          setError(failure.message)
        } finally {
          setBusyId(null)
        }
      },
    })
  }

  return (
    <div className="admin-section">
      <div className="admin-toolbar">
        <div className="admin-search">
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={event => { setQuery(event.target.value); setPage(1) }}
            placeholder="Search users by username or email…"
            aria-label="Search users"
          />
        </div>
      </div>

      {error && <p className="suggest-error" role="alert">{error}</p>}

      {!data ? (
        <p className="admin-loading" role="status">Loading users…</p>
      ) : data.users.length === 0 ? (
        <p className="suggest-empty">No users match your search.</p>
      ) : (
        <div className="admin-card admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Signed up</th>
                <th>Trips</th>
                <th>Suggestions</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.users.map(item => {
                const isSelf = item.id === currentUserId
                const disabled = Boolean(item.disabledAt)
                return (
                  <tr key={item.id}>
                    <td>
                      <b>{item.username}</b>
                      <div><small>{item.email}</small></div>
                    </td>
                    <td>
                      <span className={`status-badge ${item.role === 'admin' ? 'status-badge--approved' : 'status-badge--pending'}`}>
                        {item.role}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${disabled ? 'status-badge--rejected' : 'status-badge--approved'}`}>
                        {disabled ? 'Disabled' : 'Active'}
                      </span>
                    </td>
                    <td>{String(item.createdAt).slice(0, 10)}</td>
                    <td>{item.tripCount}</td>
                    <td>{item.suggestionCount}</td>
                    <td>
                      <div className="suggestion-list__actions">
                        <button
                          type="button"
                          className="suggest-secondary"
                          disabled={isSelf || busyId === item.id}
                          onClick={() => changeRole(item, item.role === 'admin' ? 'user' : 'admin')}
                        >
                          {item.role === 'admin' ? 'Demote' : 'Make admin'}
                        </button>
                        <button
                          type="button"
                          className="suggest-secondary"
                          disabled={isSelf || busyId === item.id}
                          onClick={() => changeStatus(item, !disabled)}
                        >
                          {disabled ? 'Enable' : 'Disable'}
                        </button>
                        <button
                          type="button"
                          className="suggest-secondary suggest-secondary--danger"
                          disabled={isSelf || busyId === item.id}
                          onClick={() => deleteUser(item)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <PaginationBar page={data.page} totalPages={data.totalPages} total={data.total} onPageChange={setPage} />
        </div>
      )}
    </div>
  )
}

function TripsSection() {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    setError('')
    api.adminTrips({ q: query, page }).then(setData).catch(failure => setError(failure.message))
  }, [query, page])

  return (
    <div className="admin-section">
      <div className="admin-toolbar">
        <div className="admin-search">
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={event => { setQuery(event.target.value); setPage(1) }}
            placeholder="Search trips by name, owner username, or email…"
            aria-label="Search trips"
          />
        </div>
      </div>

      {error && <p className="suggest-error" role="alert">{error}</p>}

      {!data ? (
        <p className="admin-loading" role="status">Loading trips…</p>
      ) : data.trips.length === 0 ? (
        <p className="suggest-empty">No saved trips found.</p>
      ) : (
        <div className="admin-card">
          <ul className="suggestion-list">
            {data.trips.map(trip => (
              <li key={trip.id}>
                <div className="suggestion-list__top">
                  <b>{trip.name}</b>
                  <span className="status-badge status-badge--pending">{trip.days} days · {trip.tier}</span>
                </div>
                <small>
                  Owner: <b>{trip.owner.username}</b> ({trip.owner.email}) · Updated {String(trip.updatedAt).slice(0, 10)}
                </small>
                <p>
                  Stops ({trip.stops.length}): {trip.stops.length ? trip.stops.map(s => `${s.name}${s.province ? ` (${s.province})` : ''}`).join(' → ') : 'None'}
                </p>
              </li>
            ))}
          </ul>
          <PaginationBar page={data.page} totalPages={data.totalPages} total={data.total} onPageChange={setPage} />
        </div>
      )}
    </div>
  )
}

function AuditLogSection() {
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    setError('')
    api.adminAuditLog({ page }).then(setData).catch(failure => setError(failure.message))
  }, [page])

  return (
    <div className="admin-section">
      {error && <p className="suggest-error" role="alert">{error}</p>}

      {!data ? (
        <p className="admin-loading" role="status">Loading audit log…</p>
      ) : data.logs.length === 0 ? (
        <p className="suggest-empty">No admin actions recorded yet.</p>
      ) : (
        <div className="admin-card admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Admin</th>
                <th>Action</th>
                <th>Target</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {data.logs.map(entry => (
                <tr key={entry.id}>
                  <td>{entry.createdAt}</td>
                  <td><b>{entry.adminUsername}</b></td>
                  <td><code>{entry.action}</code></td>
                  <td>{entry.targetType} #{entry.targetId}</td>
                  <td><small>{JSON.stringify(entry.details)}</small></td>
                </tr>
              ))}
            </tbody>
          </table>
          <PaginationBar page={data.page} totalPages={data.totalPages} total={data.total} onPageChange={setPage} />
        </div>
      )}
    </div>
  )
}
