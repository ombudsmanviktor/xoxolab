import { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, isSameMonth, isToday, parseISO, addMonths, subMonths,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Repeat, AlertCircle, Loader2 } from 'lucide-react'
import { load as yamlLoad } from 'js-yaml'
import { cn } from '@/lib/utils'
import type { Evento } from '@/types'
import { useQuery } from '@tanstack/react-query'

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const colorMap: Record<string, { dot: string; bg: string; text: string }> = {
  purple: { dot: 'bg-purple-500', bg: 'bg-purple-50', text: 'text-purple-700' },
  blue:   { dot: 'bg-blue-500',   bg: 'bg-blue-50',   text: 'text-blue-700' },
  green:  { dot: 'bg-green-500',  bg: 'bg-green-50',  text: 'text-green-700' },
  amber:  { dot: 'bg-amber-500',  bg: 'bg-amber-50',  text: 'text-amber-700' },
  red:    { dot: 'bg-red-500',    bg: 'bg-red-50',    text: 'text-red-700' },
  pink:   { dot: 'bg-pink-500',   bg: 'bg-pink-50',   text: 'text-pink-700' },
  teal:   { dot: 'bg-teal-500',   bg: 'bg-teal-50',   text: 'text-teal-700' },
}

function expandRecurring(evento: Evento, monthDate: Date): string[] {
  const dates: string[] = []
  const eventDate = parseISO(evento.date)
  const monthYear = format(monthDate, 'yyyy-MM')

  if (evento.recurrence === 'none' || !evento.recurrence) {
    if (evento.date.startsWith(monthYear)) dates.push(evento.date)
  } else if (evento.recurrence === 'yearly') {
    const yearDay = evento.date.slice(5)
    const candidate = `${format(monthDate, 'yyyy')}-${yearDay}`
    if (candidate.startsWith(monthYear)) dates.push(candidate)
  } else if (evento.recurrence === 'monthly') {
    const day = evento.date.slice(8)
    dates.push(`${monthYear}-${day}`)
  } else if (evento.recurrence === 'weekly') {
    const start = startOfMonth(monthDate)
    const end = endOfMonth(monthDate)
    for (const d of eachDayOfInterval({ start, end })) {
      if (getDay(d) === getDay(eventDate)) {
        dates.push(format(d, 'yyyy-MM-dd'))
      }
    }
  }
  return dates
}

// Read token from localStorage (same origin as main app — works even inside an iframe)
function getSavedGitHubToken(): string | null {
  try {
    const raw = localStorage.getItem('xoxolab_github_config')
    if (!raw) return null
    const cfg = JSON.parse(raw) as { token?: string }
    return cfg.token ?? null
  } catch {
    return null
  }
}

async function fetchEventos(owner: string, repo: string, branch: string, projectId: string, token?: string): Promise<Evento[]> {
  const headers: Record<string, string> = { Accept: 'application/vnd.github+json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const url = `https://api.github.com/repos/${owner}/${repo}/contents/projects/${projectId}/efemerides/eventos.yaml?ref=${branch}`
  const res = await fetch(url, { headers })
  if (!res.ok) {
    if (res.status === 404) return []
    throw new Error(`GitHub API: ${res.status}`)
  }
  const data = await res.json() as { content: string; encoding: string }
  if (data.encoding !== 'base64') throw new Error('Encoding inesperado')
  const decoded = atob(data.content.replace(/\n/g, ''))
  const parsed = yamlLoad(decoded) as { eventos?: Evento[] } | null
  return parsed?.eventos ?? []
}

// Parse search params from hash directly — more reliable in iframe/embed contexts
// where React Router's useSearchParams may not capture hash-embedded query strings
function parseHashParams(): URLSearchParams {
  const hash = window.location.hash ?? ''
  const qIdx = hash.indexOf('?')
  return new URLSearchParams(qIdx >= 0 ? hash.slice(qIdx + 1) : '')
}

export function EfemeridesEmbed() {
  const [routerParams] = useSearchParams()

  // Prefer React Router params; fall back to direct hash parsing
  const hashParams = useMemo(() => parseHashParams(), [])
  const get = (key: string) =>
    routerParams.get(key) || hashParams.get(key) || ''

  const owner     = get('owner')
  const repo      = get('repo')
  const branch    = get('branch') || 'main'
  const projectId = get('projectId')
  // Token from URL takes priority (public embeds); localStorage is the fallback (same-browser)
  const urlToken  = get('token')
  const token     = urlToken || getSavedGitHubToken() || ''

  const [currentMonth, setCurrentMonth] = useState(new Date())

  const { data: eventos = [], isLoading, error } = useQuery({
    queryKey: ['embed-eventos', owner, repo, branch, projectId, !!token],
    queryFn: () => fetchEventos(owner, repo, branch, projectId, token),
    enabled: !!(owner && repo && projectId),
    staleTime: 1000 * 60 * 5,
  })

  const monthStart   = startOfMonth(currentMonth)
  const monthEnd     = endOfMonth(currentMonth)
  const days         = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startOffset  = getDay(monthStart)

  const eventsByDate = useMemo(() => {
    const map = new Map<string, Evento[]>()
    for (const ev of eventos) {
      for (const dateStr of expandRecurring(ev, currentMonth)) {
        const list = map.get(dateStr) ?? []
        list.push(ev)
        map.set(dateStr, list)
      }
    }
    return map
  }, [eventos, currentMonth])

  if (!owner || !repo || !projectId) {
    return (
      <div className="flex items-center justify-center h-screen text-sm text-gray-400">
        Parâmetros insuficientes para carregar o calendário.
      </div>
    )
  }

  return (
    <div className="bg-white min-h-screen p-4 font-sans">
      {/* Month navigation */}
      <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <button
            onClick={() => setCurrentMonth(m => subMonths(m, 1))}
            className="p-1 rounded hover:bg-gray-100 text-gray-500"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h2 className="font-semibold text-gray-900 capitalize text-sm">
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </h2>
          <button
            onClick={() => setCurrentMonth(m => addMonths(m, 1))}
            className="p-1 rounded hover:bg-gray-100 text-gray-500"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-gray-100">
          {WEEKDAYS.map(d => (
            <div key={d} className="py-2 text-center text-xs font-semibold text-gray-400">{d}</div>
          ))}
        </div>

        {/* Loading / error states */}
        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            Carregando eventos…
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-red-400">
            <AlertCircle className="w-4 h-4" />
            Não foi possível carregar os eventos. Abra o xoxoLAB na mesma sessão do navegador para autorizar o acesso ao repositório.
          </div>
        )}

        {/* Day grid */}
        {!isLoading && !error && (
          <div className="grid grid-cols-7">
            {Array.from({ length: startOffset }).map((_, i) => (
              <div key={`empty-${i}`} className="h-20 border-b border-r border-gray-50" />
            ))}
            {days.map(day => {
              const dateStr  = format(day, 'yyyy-MM-dd')
              const dayEvs   = eventsByDate.get(dateStr) ?? []
              const isNow    = isToday(day)
              const inMonth  = isSameMonth(day, currentMonth)

              return (
                <div
                  key={dateStr}
                  className={cn(
                    'h-20 border-b border-r border-gray-100 p-1.5',
                    !inMonth && 'opacity-30'
                  )}
                >
                  <div className={cn(
                    'text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-1',
                    isNow ? 'bg-purple-600 text-white' : 'text-gray-600'
                  )}>
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-0.5 overflow-hidden">
                    {dayEvs.slice(0, 3).map(ev => {
                      const col = colorMap[ev.tags?.[0]] ?? colorMap.purple
                      return (
                        <div
                          key={ev.id}
                          className={cn('text-[10px] px-1 py-0.5 rounded truncate leading-tight flex items-center gap-0.5', col.bg, col.text)}
                          title={ev.title}
                        >
                          {ev.recurrence && ev.recurrence !== 'none' && <Repeat className="w-2.5 h-2.5 flex-shrink-0 opacity-60" />}
                          {ev.title}
                        </div>
                      )
                    })}
                    {dayEvs.length > 3 && (
                      <div className="text-[9px] text-gray-400 px-1">+{dayEvs.length - 3} mais</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Branding footer */}
      <div className="mt-3 text-center text-[10px] text-gray-300 select-none">
        xoxoLAB · coLAB-UFF
      </div>
    </div>
  )
}
