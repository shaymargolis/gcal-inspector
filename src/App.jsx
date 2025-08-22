import { useEffect, useMemo, useRef, useState } from 'react'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const SCOPE = 'https://www.googleapis.com/auth/calendar.readonly'
const CAL_API = 'https://www.googleapis.com/calendar/v3'

function useGoogleAccessToken() {
  const tokenClientRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [token, setToken] = useState(null)
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    let tries = 0
    const iv = setInterval(() => {
      tries++
      if (window.google?.accounts?.oauth2 && CLIENT_ID) {
        tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPE,
          prompt: '',
          callback: (resp) => {
            if (resp && resp.access_token) setToken(resp.access_token)
          }
        })
        setReady(true)
        clearInterval(iv)
      } else if (tries > 200) {
        clearInterval(iv)
        console.error('Google Identity Services failed to load.')
      }
    }, 100)
    return () => clearInterval(iv)
  }, [])

  const signIn = () => tokenClientRef.current?.requestAccessToken()
  const signOut = () => {
    if (token) {
      fetch(`https://oauth2.googleapis.com/revoke?token=${token}`, {
        method: 'POST',
        headers: { 'Content-type': 'application/x-www-form-urlencoded' }
      }).catch(() => {})
    }
    setToken(null)
    setProfile(null)
  }

  useEffect(() => {
    if (!token) return
    fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${token}`)
      .then(r => r.ok ? r.json() : null)
      .then(j => { if (j?.email) setProfile({ email: j.email }) })
      .catch(() => {})
  }, [token])

  return { ready, token, profile, signIn, signOut }
}

export default function App() {
  const { ready, token, profile, signIn, signOut } = useGoogleAccessToken()
  const authed = Boolean(token)

  const [calendars, setCalendars] = useState([])
  const [selectedCalId, setSelectedCalId] = useState('')

  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [eventIdInput, setEventIdInput] = useState('')
  const [eventObj, setEventObj] = useState(null)

  const [showOnlyNext, setShowOnlyNext] = useState(true)

  // NEW: search inputs
  const [titleQuery, setTitleQuery] = useState('')
  const [emailQuery, setEmailQuery] = useState('')
  // NEW: applied (debounce via button)
  const [appliedTitle, setAppliedTitle] = useState('')
  const [appliedEmail, setAppliedEmail] = useState('')

  // Load calendars
  useEffect(() => {
    if (!authed) return
    ;(async () => {
      setError('')
      try {
        const cals = await fetchAllCalendars(token)
        setCalendars(cals)
        if (cals.length && !selectedCalId) setSelectedCalId(cals[0].id)
      } catch (e) { setError(errMsg(e)) }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed])

  // Load events (re-runs when search applied or calendar/toggle changes)
  useEffect(() => {
    if (!authed || !selectedCalId) return
    ;(async () => {
      setLoading(true); setError(''); setEvents([]); setEventObj(null)
      try {
        // We can pass one 'q' to the API; pick the longer to narrow server-side.
        const serverQ = (appliedTitle || appliedEmail || '').trim()
          ? (appliedTitle.length >= appliedEmail.length ? appliedTitle : appliedEmail)
          : ''
        const evs = await fetchEvents(token, selectedCalId, {
          onlyUpcoming: showOnlyNext,
          q: serverQ
        })
        setEvents(evs)
      } catch (e) {
        setError(errMsg(e))
      } finally {
        setLoading(false)
      }
    })()
  }, [authed, selectedCalId, showOnlyNext, appliedTitle, appliedEmail, token])

  // Client-side filtering to guarantee precise matches for both fields
  const filteredEvents = useMemo(() => {
    const t = titleQuery.trim().toLowerCase()
    const em = emailQuery.trim().toLowerCase()
    if (!t && !em) return events

    const matchesTitle = (ev) => {
      if (!t) return true
      return [ev.summary, ev.description, ev.location]
        .filter(Boolean)
        .some(s => String(s).toLowerCase().includes(t))
    }

    const matchesEmails = (ev) => {
      if (!em) return true
      const emails = [
        ev?.creator?.email,
        ev?.organizer?.email,
        ...(Array.isArray(ev?.attendees) ? ev.attendees.map(a => a.email) : [])
      ].filter(Boolean).map(s => String(s).toLowerCase())
      return emails.some(e => e.includes(em))
    }

    return events.filter(ev => matchesTitle(ev) && matchesEmails(ev))
  }, [events, titleQuery, emailQuery])

  const onApplySearch = () => {
    setAppliedTitle(titleQuery)
    setAppliedEmail(emailQuery)
  }
  const onClearSearch = () => {
    setTitleQuery(''); setEmailQuery('')
    setAppliedTitle(''); setAppliedEmail('')
  }

  const onFetchById = async () => {
    setError(''); setEventObj(null)
    if (!eventIdInput.trim()) { setError('Please enter an event ID.'); return }
    setLoading(true)
    try {
      if (selectedCalId) {
        const ev = await fetchEventById(token, selectedCalId, eventIdInput.trim())
        setEventObj(ev)
      } else {
        let found = null
        for (const cal of calendars) {
          try {
            const ev = await fetchEventById(token, cal.id, eventIdInput.trim())
            found = ev; setSelectedCalId(cal.id); break
          } catch (_) { /* try next */ }
        }
        if (!found) throw new Error('Event not found in your calendars.')
        setEventObj(found)
      }
    } catch (e) { setError(errMsg(e)) }
    finally { setLoading(false) }
  }

  const onPickListEvent = (ev) => {
    setEventIdInput(ev.id)
    setEventObj(ev)
  }

  // --- CSV EXPORTS ---
  const onExportEventsCsv = () => {
    const rows = [
      ['id','summary','start','end','status','created','updated','creator.email','organizer.email','attendees','hangoutLink','htmlLink']
    ]
    for (const ev of filteredEvents) {
      const attendees = Array.isArray(ev.attendees) ? ev.attendees.map(a => a.email).filter(Boolean).join('; ') : ''
      rows.push([
        ev.id || '',
        ev.summary || '',
        humanDate(ev.start),
        humanDate(ev.end),
        ev.status || '',
        ev.created || '',
        ev.updated || '',
        ev?.creator?.email || '',
        ev?.organizer?.email || '',
        attendees,
        ev.hangoutLink || '',
        ev.htmlLink || ''
      ])
    }
    downloadCsv('events.csv', rows)
  }

  const onExportEventCsv = () => {
    if (!eventObj) return
    const rows = [['Field','Value']]
    for (const [k,v] of flattenObject(eventObj)) {
      rows.push([k, valueToText(v)])
    }
    downloadCsv(`event_${eventObj.id || 'details'}.csv`, rows)
  }

  return (
    <div className="app">
      <div className="panel">
        <div className="header">
          <div className="left">
            <h2>Google Calendar Inspector</h2>
            {profile?.email && <span className="badge">{profile.email}</span>}
          </div>
          <div className="right">
            {!authed ? (
              <button className="primary" disabled={!ready} onClick={signIn}>Sign in with Google</button>
            ) : (
              <button className="ghost" onClick={signOut}>Sign out</button>
            )}
          </div>
        </div>

        {!authed && <p>Sign in to load your calendars.</p>}

        {authed && (
          <>
            <div className="header" style={{ gap: 12, alignItems: 'flex-end' }}>
              <div className="left" style={{ gap: 8 }}>
                <label htmlFor="calSel" style={{ color: '#bbb' }}>Calendar</label>
                <select id="calSel" value={selectedCalId} onChange={(e) => setSelectedCalId(e.target.value)}>
                  {calendars.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.summary} {c.primary ? '(primary)' : ''}
                    </option>
                  ))}
                </select>

                <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#bbb' }}>
                  <input type="checkbox" checked={showOnlyNext} onChange={e => setShowOnlyNext(e.target.checked)} />
                  Only upcoming
                </label>
              </div>

              <div className="right" style={{ gap: 8, flexWrap: 'wrap' }}>
                <input
                  placeholder="Search title / description / location"
                  value={titleQuery}
                  onChange={(e) => setTitleQuery(e.target.value)}
                  style={{ minWidth: 260 }}
                />
                <input
                  placeholder="Search by emails (attendees / creator / organizer)"
                  value={emailQuery}
                  onChange={(e) => setEmailQuery(e.target.value)}
                  style={{ minWidth: 260 }}
                />
                <button onClick={onApplySearch}>Search</button>
                <button className="ghost" onClick={onClearSearch}>Clear</button>
              </div>
            </div>

            <div className="header">
              <div className="left">
                <input
                  placeholder="Event ID (optional)"
                  value={eventIdInput}
                  onChange={(e) => setEventIdInput(e.target.value)}
                  style={{ minWidth: 280 }}
                />
                <button onClick={onFetchById}>Fetch by ID</button>
              </div>
              <div className="right" style={{ gap: 8 }}>
                <button onClick={onExportEventsCsv}>Export Events CSV</button>
                <button className="ghost" onClick={onExportEventCsv} disabled={!eventObj}>
                  Export Selected Event CSV
                </button>
              </div>
            </div>

            {error && (
              <div className="panel" style={{ background: '#2a1212', borderColor: '#5b2a2a' }}>
                <strong>Error:</strong> {error}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 460px) 1fr', gap: 16, alignItems: 'start' }}>
              <div className="panel">
                <h3>Events {loading ? '· Loading…' : `· ${filteredEvents.length}`}</h3>
                {!loading && filteredEvents.length === 0 && <p className="meta">No events match your filters.</p>}
                <div className="events">
                  {filteredEvents.map(ev => (
                    <div className="event-item" key={ev.id} onClick={() => onPickListEvent(ev)}>
                      <div style={{ fontWeight: 600 }}>{ev.summary || '(no title)'}</div>
                      <div className="meta">
                        {formatDateRange(ev.start, ev.end)} • {ev.creator?.email || 'unknown'}
                      </div>
                      <div className="meta">{ev.id}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="panel">
                <h3>Event details</h3>
                {!eventObj && <p className="meta">Select an event from the list, or fetch by ID.</p>}
                {eventObj && (
                  <>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                      <a href={eventObj.htmlLink} target="_blank" rel="noreferrer">
                        <button>Open in Google Calendar</button>
                      </a>
                      <span className="meta">ID: {eventObj.id}</span>
                    </div>
                    <KeyValueTable obj={eventObj} />
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/* -------- Helpers -------- */

async function fetchAllCalendars(token) {
  const items = []
  let pageToken = ''
  while (true) {
    const url = new URL(`${CAL_API}/users/me/calendarList`)
    if (pageToken) url.searchParams.set('pageToken', pageToken)
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) throw await mkErr(res)
    const j = await res.json()
    items.push(...(j.items || []))
    if (!j.nextPageToken) break
    pageToken = j.nextPageToken
  }
  return items.map(i => ({ id: i.id, summary: i.summary, primary: !!i.primary }))
}

async function fetchEvents(token, calendarId, { onlyUpcoming = true, q = '' } = {}) {
  const items = []
  let pageToken = ''
  while (true) {
    const url = new URL(`${CAL_API}/calendars/${encodeURIComponent(calendarId)}/events`)
    url.searchParams.set('maxResults', '50')
    url.searchParams.set('singleEvents', 'true')
    url.searchParams.set('showDeleted', 'false')
    if (onlyUpcoming) {
      url.searchParams.set('orderBy', 'startTime')
      url.searchParams.set('timeMin', new Date().toISOString())
    } else {
      url.searchParams.set('orderBy', 'updated')
    }
    if (q) url.searchParams.set('q', q)
    if (pageToken) url.searchParams.set('pageToken', pageToken)

    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) throw await mkErr(res)
    const j = await res.json()
    items.push(...(j.items || []))
    if (!j.nextPageToken) break
    pageToken = j.nextPageToken
  }
  return items
}

async function fetchEventById(token, calendarId, eventId) {
  const url = `${CAL_API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw await mkErr(res)
  return res.json()
}

function errMsg(e) {
  if (typeof e === 'string') return e
  if (e?.message) return e.message
  return 'Unexpected error'
}
async function mkErr(res) {
  let msg = `${res.status} ${res.statusText}`
  try {
    const j = await res.json()
    if (j?.error?.message) msg = `${msg}: ${j.error.message}`
  } catch {}
  return new Error(msg)
}

function humanDate(dtObj) {
  const v = dtObj?.dateTime || dtObj?.date
  return v || ''
}

function formatDateRange(start, end) {
  const s = start?.dateTime || start?.date
  const e = end?.dateTime || end?.date
  if (!s || !e) return 'Unknown time'
  try {
    const sd = new Date(s)
    const ed = new Date(e)
    const sameDay = sd.toDateString() === ed.toDateString()
    const fmt = (d, withTime) =>
      new Intl.DateTimeFormat(undefined, {
        year: 'numeric', month: 'short', day: '2-digit',
        ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {})
      }).format(d)
    if (sameDay) {
      const hasTime = !!start?.dateTime
      return hasTime ? `${fmt(sd, true)} – ${fmt(ed, true)}` : fmt(sd, false)
    }
    return `${fmt(sd, !!start?.dateTime)} → ${fmt(ed, !!end?.dateTime)}`
  } catch {
    return `${s} → ${e}`
  }
}

function KeyValueTable({ obj }) {
  const rows = useMemo(() => flattenObject(obj), [obj])
  return (
    <div className="table-wrap">
      <table className="kv">
        <thead>
          <tr><th>Field</th><th>Value</th></tr>
        </thead>
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k}>
              <th>{k}</th>
              <td>{renderValue(v)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function renderValue(v) {
  if (v === null) return <span className="meta">null</span>
  if (v === undefined) return <span className="meta">undefined</span>
  if (typeof v === 'object') return <pre>{JSON.stringify(v, null, 2)}</pre>
  return <span>{String(v)}</span>
}

function flattenObject(obj, prefix = '') {
  const rows = []
  const isArray = Array.isArray(obj)
  if (typeof obj !== 'object' || obj === null) {
    rows.push([prefix || '(value)', obj])
    return rows
  }
  const entries = isArray ? obj.entries() : Object.entries(obj)
  for (const [keyRaw, value] of entries) {
    const key = isArray ? `[${keyRaw}]` : keyRaw
    const newPrefix = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'object' && value !== null && !isDate(value)) {
      rows.push(...flattenObject(value, newPrefix))
    } else {
      rows.push([newPrefix, value])
    }
  }
  return rows
}
function isDate(x) { return Object.prototype.toString.call(x) === '[object Date]' }

function valueToText(v) {
  if (v === null || v === undefined) return ''
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

/* ---------- CSV helpers ---------- */

function downloadCsv(filename, rows) {
  // Simple RFC4180 quoting; add BOM for Excel
  const csv = '\uFEFF' + rows.map(r => r.map(csvEscape).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
function csvEscape(field) {
  const s = String(field ?? '')
  // escape " by doubling, wrap with " if contains , " or newline
  const needsQuotes = /[",\n]/.test(s)
  const escaped = s.replace(/"/g, '""')
  return needsQuotes ? `"${escaped}"` : escaped
}
