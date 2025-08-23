export function humanDate(dtObj) {
  const v = dtObj?.dateTime || dtObj?.date
  return v || ''
}

export function formatDateRange(start, end) {
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

export function flattenObject(obj, prefix = '') {
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

export function valueToText(v) {
  if (v === null || v === undefined) return ''
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

/* ---------- CSV helpers ---------- */

export function downloadCsv(filename, rows) {
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
