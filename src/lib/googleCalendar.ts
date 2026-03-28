// Google Calendar OAuth (GIS token client) + REST API helpers
// Requires: Google Cloud project with Calendar API enabled + OAuth Web Client ID

const CAL_SCOPE = 'https://www.googleapis.com/auth/calendar.events.readonly'
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

export function icsDateToISO(d: string): string {
  // Handles YYYYMMDD and YYYYMMDDTHHmmssZ
  const bare = d.replace(/[TZ].*/, '').replace(/-/g, '')
  if (bare.length >= 8) {
    return `${bare.slice(0, 4)}-${bare.slice(4, 6)}-${bare.slice(6, 8)}`
  }
  return ''
}

export interface ParsedICSEvent {
  title: string
  date: string
  endDate?: string
  description?: string
  recurrence: 'none' | 'weekly' | 'monthly' | 'yearly'
}

export function parseICSFile(content: string): ParsedICSEvent[] {
  const events: ParsedICSEvent[] = []
  // Unfold continuation lines (RFC 5545)
  const unfolded = content.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '')
  const blocks = unfolded.split(/BEGIN:VEVENT/i).slice(1)

  for (const block of blocks) {
    const endIdx = block.search(/END:VEVENT/i)
    const body = endIdx >= 0 ? block.slice(0, endIdx) : block

    const get = (key: string): string => {
      const re = new RegExp(`^${key}[^:\r\n]*:([^\r\n]*)`, 'im')
      const m = body.match(re)
      return m
        ? m[1].trim()
            .replace(/\\n/g, '\n')
            .replace(/\\,/g, ',')
            .replace(/\\;/g, ';')
        : ''
    }

    const summary = get('SUMMARY')
    const dtstart = get('DTSTART')
    const dtend = get('DTEND')
    const description = get('DESCRIPTION')
    const rrule = get('RRULE')
    const status = get('STATUS')

    if (!summary || !dtstart || status === 'CANCELLED') continue

    const date = icsDateToISO(dtstart)
    if (!date) continue

    let recurrence: ParsedICSEvent['recurrence'] = 'none'
    if (rrule) {
      if (/FREQ=WEEKLY/i.test(rrule)) recurrence = 'weekly'
      else if (/FREQ=MONTHLY/i.test(rrule)) recurrence = 'monthly'
      else if (/FREQ=YEARLY/i.test(rrule)) recurrence = 'yearly'
    }

    const endDate = dtend ? icsDateToISO(dtend) : undefined

    events.push({ title: summary, date, endDate: endDate !== date ? endDate : undefined, description: description || undefined, recurrence })
  }

  return events
}
