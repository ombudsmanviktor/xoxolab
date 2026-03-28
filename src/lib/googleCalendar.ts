// Google Calendar OAuth (GIS token client) + REST API helpers
// Requires: Google Cloud project with Calendar API enabled + OAuth Web Client ID

const CAL_SCOPE = 'https://www.googleapis.com/auth/calendar.events'
const CAL_API = 'https://www.googleapis.com/calendar/v3'
const LS_CLIENT_ID = 'xoxolab_gcal_client_id'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GIS = any

let _tokenClient: GIS = null

function loadGIS(): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((window as any).google?.accounts?.oauth2) return Promise.resolve()
  return new Promise((resolve, reject) => {
    if (document.querySelector('script[data-gis]')) {
      // Already loading — wait for it
      const check = setInterval(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((window as any).google?.accounts?.oauth2) { clearInterval(check); resolve() }
      }, 100)
      return
    }
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.setAttribute('data-gis', '1')
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Falha ao carregar Google Identity Services'))
    document.head.appendChild(s)
  })
}

export function getSavedClientId(): string {
  return localStorage.getItem(LS_CLIENT_ID) ?? ''
}

export function saveClientId(id: string): void {
  if (id) localStorage.setItem(LS_CLIENT_ID, id)
  else localStorage.removeItem(LS_CLIENT_ID)
}

export async function requestGoogleToken(
  clientId: string,
  onToken: (token: string) => void,
  onError: (msg: string) => void,
): Promise<void> {
  try {
    await loadGIS()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: CAL_SCOPE,
      callback: (resp: GIS) => {
        if (resp.error) { onError(resp.error_description ?? resp.error); return }
        if (resp.access_token) onToken(resp.access_token)
      },
    })
    _tokenClient.requestAccessToken({ prompt: 'consent' })
  } catch (e) {
    onError(String(e))
  }
}

export function revokeGoogleToken(token: string): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).google?.accounts?.oauth2?.revoke(token, () => {})
}

export interface GCalEvent {
  id: string
  summary: string
  description?: string
  start: { date?: string; dateTime?: string }
  end:   { date?: string; dateTime?: string }
}

export async function fetchGCalEvents(
  token: string,
  year: number,
  month: number,
): Promise<GCalEvent[]> {
  const timeMin = new Date(year, month - 1, 1).toISOString()
  const timeMax = new Date(year, month, 0, 23, 59, 59).toISOString()
  const url = new URL(`${CAL_API}/calendars/primary/events`)
  url.searchParams.set('timeMin', timeMin)
  url.searchParams.set('timeMax', timeMax)
  url.searchParams.set('singleEvents', 'true')
  url.searchParams.set('orderBy', 'startTime')
  url.searchParams.set('maxResults', '250')

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    if (res.status === 401) throw new Error('TOKEN_EXPIRED')
    throw new Error(`Google Calendar API: ${res.status}`)
  }
  const data = await res.json()
  return data.items ?? []
}

export async function createGCalEvent(
  token: string,
  event: { title: string; date: string; endDate?: string; description?: string; recurrence?: string },
): Promise<void> {
  const end = event.endDate ?? event.date
  const body = {
    summary: event.title,
    description: event.description ?? '',
    start: { date: event.date },
    end: { date: end },
    ...(event.recurrence ? { recurrence: [`RRULE:FREQ=${event.recurrence}`] } : {}),
  }
  const res = await fetch(`${CAL_API}/calendars/primary/events`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    if (res.status === 401) throw new Error('TOKEN_EXPIRED')
    throw new Error(`Google Calendar API: ${res.status}`)
  }
}

export function icsDateToISO(d: string): string {
  const val = d.trim()
  // Plain date: YYYYMMDD
  if (/^\d{8}$/.test(val)) {
    return `${val.slice(0, 4)}-${val.slice(4, 6)}-${val.slice(6, 8)}`
  }
  // UTC datetime: YYYYMMDDTHHmmssZ — convert to local date
  if (/^\d{8}T\d{6}Z$/.test(val)) {
    const iso = `${val.slice(0,4)}-${val.slice(4,6)}-${val.slice(6,8)}T${val.slice(9,11)}:${val.slice(11,13)}:${val.slice(13,15)}Z`
    const dt = new Date(iso)
    const y = dt.getFullYear()
    const m = String(dt.getMonth() + 1).padStart(2, '0')
    const dd = String(dt.getDate()).padStart(2, '0')
    return `${y}-${m}-${dd}`
  }
  // Local datetime with TZID: YYYYMMDDTHHmmss — take date part only
  if (/^\d{8}T\d{6}$/.test(val)) {
    return `${val.slice(0, 4)}-${val.slice(4, 6)}-${val.slice(6, 8)}`
  }
  // Already ISO: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val
  return ''
}

export interface ParsedICSEvent {
  title: string
  date: string
  endDate?: string
  description?: string
  recurrence: 'none' | 'weekly' | 'monthly' | 'yearly'
  uid?: string
}

export function parseICSFile(content: string): ParsedICSEvent[] {
  const events: ParsedICSEvent[] = []
  // Unfold continuation lines (RFC 5545)
  const unfolded = content.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '')
  const blocks = unfolded.split(/BEGIN:VEVENT/i).slice(1)

  for (const block of blocks) {
    const endIdx = block.search(/END:VEVENT/i)
    const body = endIdx >= 0 ? block.slice(0, endIdx) : block

    // Skip exception instances — they duplicate the master recurring event
    if (/^RECURRENCE-ID[;:]/im.test(body)) continue

    const getProp = (key: string): { value: string; params: string } => {
      const re = new RegExp(`^${key}([^:\r\n]*):([^\r\n]*)`, 'im')
      const m = body.match(re)
      if (!m) return { value: '', params: '' }
      return {
        params: m[1].toUpperCase(),
        value: m[2].trim()
          .replace(/\\n/g, '\n')
          .replace(/\\,/g, ',')
          .replace(/\\;/g, ';'),
      }
    }

    const get = (key: string) => getProp(key).value

    const summary = get('SUMMARY')
    const { value: dtstart } = getProp('DTSTART')
    const { value: dtendVal, params: dtendParams } = getProp('DTEND')
    const description = get('DESCRIPTION')
    const rrule = get('RRULE')
    const status = get('STATUS')
    const uid = get('UID')

    if (!summary || !dtstart || status === 'CANCELLED') continue

    const date = icsDateToISO(dtstart)
    if (!date) continue

    let endDate: string | undefined
    if (dtendVal) {
      const rawEnd = icsDateToISO(dtendVal)
      if (rawEnd) {
        // ICS all-day DTEND is exclusive (day after last day) — subtract 1 day
        const isDateOnly = dtendParams.includes('VALUE=DATE') || /^\d{8}$/.test(dtendVal.trim())
        if (isDateOnly) {
          const d = new Date(rawEnd + 'T12:00:00')
          d.setDate(d.getDate() - 1)
          const adj = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
          endDate = adj !== date ? adj : undefined
        } else {
          endDate = rawEnd !== date ? rawEnd : undefined
        }
      }
    }

    let recurrence: ParsedICSEvent['recurrence'] = 'none'
    if (rrule) {
      if (/FREQ=WEEKLY/i.test(rrule)) recurrence = 'weekly'
      else if (/FREQ=MONTHLY/i.test(rrule)) recurrence = 'monthly'
      else if (/FREQ=YEARLY/i.test(rrule)) recurrence = 'yearly'
    }

    events.push({ title: summary, date, endDate, description: description || undefined, recurrence, uid: uid || undefined })
  }

  return events
}
