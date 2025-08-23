import { useEffect, useMemo, useState } from 'react'
import { Container, Grid, Alert } from '@mui/material'
import { ThemeProvider } from '@mui/material/styles'

// Import theme
import { darkTheme } from './theme.js'

// Import custom hook
import { useGoogleAccessToken } from './hooks/useGoogleAccessToken.js'

// Import API utilities
import { fetchAllCalendars, fetchEvents, fetchEventById, errMsg } from './utils/api.js'

// Import helper utilities
import { humanDate, downloadCsv, valueToText } from './utils/helpers.js'

// Import components
import { Header } from './components/Header.jsx'
import { Controls } from './components/Controls.jsx'
import { Actions } from './components/Actions.jsx'
import { EventsList } from './components/EventsList.jsx'
import { EventDetails } from './components/EventDetails.jsx'

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

  // Search inputs
  const [titleQuery, setTitleQuery] = useState('')
  const [emailQuery, setEmailQuery] = useState('')
  // Applied (debounce via button)
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

  // CSV EXPORTS
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
    <ThemeProvider theme={darkTheme}>
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Header 
          ready={ready} 
          authed={authed} 
          profile={profile} 
          signIn={signIn} 
          signOut={signOut} 
        />

        {authed && (
          <>
            <Controls 
              calendars={calendars}
              selectedCalId={selectedCalId}
              setSelectedCalId={setSelectedCalId}
              showOnlyNext={showOnlyNext}
              setShowOnlyNext={setShowOnlyNext}
              titleQuery={titleQuery}
              setTitleQuery={setTitleQuery}
              emailQuery={emailQuery}
              setEmailQuery={setEmailQuery}
              onApplySearch={onApplySearch}
              onClearSearch={onClearSearch}
            />

            <Actions 
              eventIdInput={eventIdInput}
              setEventIdInput={setEventIdInput}
              onFetchById={onFetchById}
              onExportEventsCsv={onExportEventsCsv}
              onExportEventCsv={onExportEventCsv}
              eventObj={eventObj}
            />

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                <strong>Error:</strong> {error}
              </Alert>
            )}

            <Grid container spacing={3} alignItems="stretch">
              <Grid item xs={12} md={12} lg={5}>
                <EventsList 
                  loading={loading}
                  filteredEvents={filteredEvents}
                  onPickListEvent={onPickListEvent}
                />
              </Grid>

              <Grid item xs={12} md={12} lg={7}>
                <EventDetails eventObj={eventObj} />
              </Grid>
            </Grid>
          </>
        )}
      </Container>
    </ThemeProvider>
  )
}

// Helper function for flattening objects (used in CSV export)
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

function isDate(x) { 
  return Object.prototype.toString.call(x) === '[object Date]' 
}
