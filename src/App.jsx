import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Container,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Alert,
  CircularProgress
} from '@mui/material'
import {
  Google as GoogleIcon,
  Logout as LogoutIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Download as DownloadIcon,
  OpenInNew as OpenInNewIcon,
  CalendarToday as CalendarIcon,
  Event as EventIcon,
  Person as PersonIcon
} from '@mui/icons-material'
import { createTheme, ThemeProvider } from '@mui/material/styles'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const SCOPE = 'https://www.googleapis.com/auth/calendar.readonly'
const CAL_API = 'https://www.googleapis.com/calendar/v3'

// Create a dark theme
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#7cc2ff',
    },
    background: {
      default: '#0b0d10',
      paper: '#151a1f',
    },
    text: {
      primary: '#e8e8e8',
      secondary: '#97a3af',
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          border: '1px solid #26303a',
          borderRadius: 12,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          border: '1px solid #26303a',
        },
      },
    },
  },
})

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
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
              <Box display="flex" alignItems="center" gap={2}>
                <Typography variant="h4" component="h1">
                  Google Calendar Inspector
                </Typography>
                {profile?.email && (
                  <Chip 
                    icon={<PersonIcon />} 
                    label={profile.email} 
                    variant="outlined" 
                    size="small"
                  />
                )}
              </Box>
              <Box>
                {!authed ? (
                  <Button
                    variant="contained"
                    startIcon={<GoogleIcon />}
                    disabled={!ready}
                    onClick={signIn}
                    size="large"
                  >
                    Sign in with Google
                  </Button>
                ) : (
                  <Button
                    variant="outlined"
                    startIcon={<LogoutIcon />}
                    onClick={signOut}
                  >
                    Sign out
                  </Button>
                )}
              </Box>
            </Box>

            {!authed && (
              <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
                Sign in to load your calendars.
              </Typography>
            )}
          </CardContent>
        </Card>

        {authed && (
          <>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Grid container spacing={3} alignItems="flex-end">
                  <Grid item xs={12} md={6}>
                    <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                      <TextField
                        select
                        label="Calendar"
                        value={selectedCalId}
                        onChange={(e) => setSelectedCalId(e.target.value)}
                        sx={{ minWidth: 200 }}
                      >
                        {calendars.map(c => (
                          <MenuItem key={c.id} value={c.id}>
                            {c.summary} {c.primary ? '(primary)' : ''}
                          </MenuItem>
                        ))}
                      </TextField>

                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={showOnlyNext}
                            onChange={(e) => setShowOnlyNext(e.target.checked)}
                          />
                        }
                        label="Only upcoming"
                      />
                    </Stack>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Stack direction="row" spacing={2} flexWrap="wrap">
                      <TextField
                        placeholder="Search title / description / location"
                        value={titleQuery}
                        onChange={(e) => setTitleQuery(e.target.value)}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <SearchIcon />
                            </InputAdornment>
                          ),
                        }}
                        sx={{ minWidth: 260 }}
                      />
                      <TextField
                        placeholder="Search by emails"
                        value={emailQuery}
                        onChange={(e) => setEmailQuery(e.target.value)}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <SearchIcon />
                            </InputAdornment>
                          ),
                        }}
                        sx={{ minWidth: 260 }}
                      />
                      <Button variant="contained" onClick={onApplySearch}>
                        Search
                      </Button>
                      <IconButton onClick={onClearSearch} color="inherit">
                        <ClearIcon />
                      </IconButton>
                    </Stack>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Grid container spacing={3} alignItems="center">
                  <Grid item xs={12} md={6}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <TextField
                        placeholder="Event ID (optional)"
                        value={eventIdInput}
                        onChange={(e) => setEventIdInput(e.target.value)}
                        sx={{ minWidth: 280 }}
                      />
                      <Button variant="contained" onClick={onFetchById}>
                        Fetch by ID
                      </Button>
                    </Stack>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Stack direction="row" spacing={2} justifyContent="flex-end">
                      <Button
                        variant="contained"
                        startIcon={<DownloadIcon />}
                        onClick={onExportEventsCsv}
                      >
                        Export Events CSV
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<DownloadIcon />}
                        onClick={onExportEventCsv}
                        disabled={!eventObj}
                      >
                        Export Selected Event CSV
                      </Button>
                    </Stack>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                <strong>Error:</strong> {error}
              </Alert>
            )}

            <Grid container spacing={3} alignItems="stretch">
              <Grid item xs={12} md={12} lg={5}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Box display="flex" alignItems="center" gap={1} mb={2}>
                      <EventIcon />
                      <Typography variant="h6">
                        Events {loading ? '· Loading…' : `· ${filteredEvents.length}`}
                      </Typography>
                      {loading && <CircularProgress size={20} />}
                    </Box>
                    
                    {!loading && filteredEvents.length === 0 && (
                      <Typography variant="body2" color="text.secondary">
                        No events match your filters.
                      </Typography>
                    )}
                    
                    <List sx={{ maxHeight: 350, overflow: 'auto' }}>
                      {filteredEvents.map(ev => (
                        <ListItem
                          key={ev.id}
                          button
                          onClick={() => onPickListEvent(ev)}
                          sx={{
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 1,
                            mb: 1,
                            '&:hover': {
                              borderColor: 'primary.main',
                            },
                          }}
                        >
                          <ListItemText
                            primary={ev.summary || '(no title)'}
                            secondary={
                              <Box>
                                <Typography variant="body2" color="text.secondary">
                                  {formatDateRange(ev.start, ev.end)}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {ev.creator?.email || 'unknown'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                                  {ev.id}
                                </Typography>
                              </Box>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={12} lg={7}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" mb={2}>
                      Event details
                    </Typography>
                    
                    {!eventObj ? (
                      <Typography variant="body2" color="text.secondary">
                        Select an event from the list, or fetch by ID.
                      </Typography>
                    ) : (
                      <>
                        <Box display="flex" alignItems="center" gap={2} mb={2} flexWrap="wrap">
                          <Button
                            variant="contained"
                            startIcon={<OpenInNewIcon />}
                            href={eventObj.htmlLink}
                            target="_blank"
                            rel="noreferrer"
                            size="small"
                          >
                            Open in Google Calendar
                          </Button>
                          <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                            ID: {eventObj.id}
                          </Typography>
                        </Box>
                        <KeyValueTable obj={eventObj} />
                      </>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </>
        )}
      </Container>
    </ThemeProvider>
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
    <TableContainer component={Paper} sx={{ maxHeight: 350 }}>
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 'bold', color: 'primary.main', fontSize: '0.75rem' }}>Field</TableCell>
            <TableCell sx={{ fontWeight: 'bold', color: 'primary.main', fontSize: '0.75rem' }}>Value</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map(([k, v]) => (
            <TableRow key={k}>
              <TableCell component="th" sx={{ fontWeight: 'bold', width: '25%', fontSize: '0.75rem', wordBreak: 'break-word' }}>
                {k}
              </TableCell>
              <TableCell sx={{ fontSize: '0.75rem', wordBreak: 'break-word', maxWidth: 0 }}>
                {renderValue(v)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

function renderValue(v) {
  if (v === null) return <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>null</Typography>
  if (v === undefined) return <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>undefined</Typography>
  if (typeof v === 'object') return (
    <Box
      component="pre"
      sx={{
        margin: 0,
        whiteSpace: 'pre-wrap',
        overflowWrap: 'anywhere',
        maxHeight: 150,
        overflow: 'auto',
        bgcolor: 'background.default',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        p: 1,
        fontSize: '0.7rem',
      }}
    >
      {JSON.stringify(v, null, 2)}
    </Box>
  )
  return <Typography variant="body2" sx={{ fontSize: '0.75rem', wordBreak: 'break-word' }}>{String(v)}</Typography>
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
