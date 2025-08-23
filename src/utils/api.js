const CAL_API = 'https://www.googleapis.com/calendar/v3'

export async function fetchAllCalendars(token) {
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

export async function fetchEvents(token, calendarId, { onlyUpcoming = true, q = '' } = {}) {
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

export async function fetchEventById(token, calendarId, eventId) {
  const url = `${CAL_API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw await mkErr(res)
  return res.json()
}

export function errMsg(e) {
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
