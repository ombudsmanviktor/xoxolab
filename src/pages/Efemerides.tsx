import { useState, useMemo, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, isSameMonth, isToday, parseISO, addMonths, subMonths,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus, Repeat, Download, X, ExternalLink, Upload, CalendarDays, Link2Off, Info } from 'lucide-react'
import { useProject } from '@/contexts/ProjectContext'
import { loadEventos, saveEventos, loadPautas, loadKanbanCards } from '@/lib/storage'
import { generateId, formatDate, todayISO } from '@/lib/utils'
import {
  requestGoogleToken, revokeGoogleToken, fetchGCalEvents, createGCalEvent,
  parseICSFile, getSavedClientId, saveClientId,
  type GCalEvent,
} from '@/lib/googleCalendar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/hooks/useToast'
import { ToastContainer } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import type { Evento, RecurrenceType } from '@/types'

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const RECURRENCE_LABELS: Record<RecurrenceType, string> = {
  none: 'Não repete',
  weekly: 'Semanal',
  monthly: 'Mensal',
  yearly: 'Anual',
}

const EVENT_COLORS = ['purple', 'blue', 'green', 'amber', 'red', 'pink', 'teal']
const colorMap: Record<string, { dot: string; bg: string; text: string }> = {
  purple: { dot: 'bg-purple-500', bg: 'bg-purple-50', text: 'text-purple-700' },
  blue:   { dot: 'bg-blue-500',   bg: 'bg-blue-50',   text: 'text-blue-700' },
  green:  { dot: 'bg-green-500',  bg: 'bg-green-50',  text: 'text-green-700' },
  amber:  { dot: 'bg-amber-500',  bg: 'bg-amber-50',  text: 'text-amber-700' },
  red:    { dot: 'bg-red-500',    bg: 'bg-red-50',    text: 'text-red-700' },
  pink:   { dot: 'bg-pink-500',   bg: 'bg-pink-50',   text: 'text-pink-700' },
  teal:   { dot: 'bg-teal-500',   bg: 'bg-teal-50',   text: 'text-teal-700' },
  google: { dot: 'bg-blue-400',   bg: 'bg-blue-50',   text: 'text-blue-600' },
  pauta:  { dot: 'bg-orange-400', bg: 'bg-orange-50', text: 'text-orange-600' },
  kanban: { dot: 'bg-pink-400',   bg: 'bg-pink-50',   text: 'text-pink-600' },
}

function expandRecurring(evento: Evento, monthDate: Date): string[] {
  const dates: string[] = []
  const eventDate = parseISO(evento.date)
  const monthYear = format(monthDate, 'yyyy-MM')

  if (evento.recurrence === 'none') {
    if (evento.date.startsWith(monthYear)) dates.push(evento.date)
  } else if (evento.recurrence === 'yearly') {
    const yearDay = evento.date.slice(5) // MM-DD
    const candidate = `${format(monthDate, 'yyyy')}-${yearDay}`
    if (candidate.startsWith(monthYear)) dates.push(candidate)
  } else if (evento.recurrence === 'monthly') {
    const day = evento.date.slice(8) // DD
    const candidate = `${monthYear}-${day}`
    dates.push(candidate)
  } else if (evento.recurrence === 'weekly') {
    const start = startOfMonth(monthDate)
    const end = endOfMonth(monthDate)
    const days = eachDayOfInterval({ start, end })
    for (const d of days) {
      if (getDay(d) === getDay(eventDate)) {
        dates.push(format(d, 'yyyy-MM-dd'))
      }
    }
  }
  return dates
}

export function Efemerides() {
  const { projectId } = useProject()
  const queryClient = useQueryClient()
  const { toasts, toast, dismiss } = useToast()

  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editEvento, setEditEvento] = useState<Evento | null>(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [evTitle, setEvTitle] = useState('')
  const [evDesc, setEvDesc] = useState('')
  const [evDate, setEvDate] = useState('')
  const [evEndDate, setEvEndDate] = useState('')
  const [evRecurrence, setEvRecurrence] = useState<RecurrenceType>('none')
  const [evColor, setEvColor] = useState('purple')
  const [saving, setSaving] = useState(false)

  // Google Calendar integration
  const [gcalToken, setGcalToken] = useState<string | null>(null)
  const [gcalClientId, setGcalClientId] = useState(getSavedClientId)
  const [gcalDialogOpen, setGcalDialogOpen] = useState(false)
  const [gcalClientIdInput, setGcalClientIdInput] = useState(getSavedClientId)
  const [gcalConnecting, setGcalConnecting] = useState(false)
  const [gcalEvents, setGcalEvents] = useState<Evento[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [icsBatches, setIcsBatches] = useState<Array<{ id: string; fileName: string; count: number; importedAt: string }>>(() => {
    try { return JSON.parse(localStorage.getItem('xoxolab_ics_batches') ?? '[]') } catch { return [] }
  })
  const [importManageOpen, setImportManageOpen] = useState(false)
  const [clearAllOpen, setClearAllOpen] = useState(false)

  const { data: storedEventos = [] } = useQuery({
    queryKey: ['eventos', projectId],
    queryFn: () => loadEventos(projectId),
  })

  const { data: pautaData } = useQuery({
    queryKey: ['pautas', projectId],
    queryFn: () => loadPautas(projectId),
  })

  const { data: kanbanCards = [] } = useQuery({
    queryKey: ['kanban', projectId],
    queryFn: () => loadKanbanCards(projectId),
  })

  // Synthetic events from other modules
  const syntheticEventos = useMemo((): Evento[] => {
    const events: Evento[] = []
    const now = new Date().toISOString()
    for (const item of pautaData?.items ?? []) {
      if (item.dueDate) {
        events.push({
          id: `pauta-${item.id}`, title: item.title, date: item.dueDate,
          tags: ['pauta'], recurrence: 'none', sourceModule: 'pautas', sourceId: item.id,
          createdAt: now, updatedAt: now,
        })
      }
    }
    for (const card of kanbanCards) {
      if (card.dueDate) {
        events.push({
          id: `kanban-${card.id}`, title: card.title, date: card.dueDate,
          tags: ['kanban'], recurrence: 'none', sourceModule: 'kanban', sourceId: card.id,
          createdAt: now, updatedAt: now,
        })
      }
    }
    return events
  }, [pautaData, kanbanCards])

  // Fetch Google Calendar events when token or month changes
  useEffect(() => {
    if (!gcalToken) return
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth() + 1
    fetchGCalEvents(gcalToken, year, month)
      .then((items: GCalEvent[]) => {
        const now = new Date().toISOString()
        setGcalEvents(items.map(ev => ({
          id: `google-${ev.id}`,
          title: ev.summary,
          date: (ev.start.date ?? ev.start.dateTime?.split('T')[0]) ?? '',
          endDate: ev.end.date ?? ev.end.dateTime?.split('T')[0],
          description: ev.description,
          tags: ['google'],
          recurrence: 'none' as RecurrenceType,
          sourceModule: 'google' as const,
          sourceId: ev.id,
          createdAt: now,
          updatedAt: now,
        })).filter(e => e.date))
      })
      .catch(err => {
        if (String(err).includes('TOKEN_EXPIRED')) {
          setGcalToken(null)
          toast({ title: 'Sessão Google expirada', description: 'Reconecte o Google Calendar.', variant: 'destructive' })
        }
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gcalToken, currentMonth])

  const allEventos = useMemo(
    () => [...storedEventos, ...syntheticEventos, ...gcalEvents],
    [storedEventos, syntheticEventos, gcalEvents]
  )

  // Map date → eventos for the current month
  const eventsByDate = useMemo(() => {
    const map = new Map<string, Evento[]>()
    for (const ev of allEventos) {
      const dates = expandRecurring(ev, currentMonth)
      for (const d of dates) {
        if (!map.has(d)) map.set(d, [])
        map.get(d)!.push(ev)
      }
    }
    return map
  }, [allEventos, currentMonth])

  async function handleImportICS(file: File) {
    const text = await file.text()
    const parsed = parseICSFile(text)
    if (parsed.length === 0) {
      toast({ title: 'Nenhum evento encontrado no arquivo .ics', variant: 'destructive' })
      return
    }

    const batchId = generateId()
    const now = new Date().toISOString()

    // Deduplicate: skip events already stored (same uid or same title+date)
    const existingKeys = new Set(
      storedEventos.map(e => `${e.title}|${e.date}`)
    )
    const existingUids = new Set(
      storedEventos.map(e => (e as Evento & { uid?: string }).uid).filter(Boolean)
    )

    const newEventos = parsed
      .filter(ev => {
        if (ev.uid && existingUids.has(ev.uid)) return false
        if (existingKeys.has(`${ev.title}|${ev.date}`)) return false
        return true
      })
      .map(ev => ({
        id: generateId(),
        title: ev.title,
        date: ev.date,
        endDate: ev.endDate,
        description: ev.description,
        recurrence: ev.recurrence,
        tags: ['purple'],
        importBatchId: batchId,
        createdAt: now,
        updatedAt: now,
      } as Evento))

    if (newEventos.length === 0) {
      toast({ title: 'Todos os eventos já estão importados', description: 'Nenhum evento novo foi adicionado.' })
      return
    }

    const merged = [...storedEventos, ...newEventos]
    await saveEventos(projectId, merged)
    queryClient.setQueryData(['eventos', projectId], merged)

    // Save batch info in localStorage for undo
    const batchMeta = { id: batchId, fileName: file.name, count: newEventos.length, importedAt: now }
    const existing = JSON.parse(localStorage.getItem('xoxolab_ics_batches') ?? '[]')
    localStorage.setItem('xoxolab_ics_batches', JSON.stringify([batchMeta, ...existing].slice(0, 10)))
    setIcsBatches([batchMeta, ...icsBatches].slice(0, 10))

    toast({ title: `${newEventos.length} evento(s) importado(s) de "${file.name}"` })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleUndoBatch(batchId: string) {
    const remaining = storedEventos.filter(e => e.importBatchId !== batchId)
    await saveEventos(projectId, remaining)
    queryClient.setQueryData(['eventos', projectId], remaining)
    const newBatches = icsBatches.filter(b => b.id !== batchId)
    setIcsBatches(newBatches)
    localStorage.setItem('xoxolab_ics_batches', JSON.stringify(newBatches))
    toast({ title: 'Importação desfeita' })
  }

  async function handleClearAll() {
    await saveEventos(projectId, [])
    queryClient.setQueryData(['eventos', projectId], [])
    setIcsBatches([])
    localStorage.removeItem('xoxolab_ics_batches')
    setClearAllOpen(false)
    toast({ title: 'Todos os eventos foram removidos' })
  }

  function handleConnectGoogle() {
    setGcalClientIdInput(gcalClientId)
    setGcalDialogOpen(true)
  }

  function handleDisconnectGoogle() {
    if (gcalToken) revokeGoogleToken(gcalToken)
    setGcalToken(null)
    setGcalEvents([])
  }

  async function handleGcalSave() {
    const id = gcalClientIdInput.trim()
    if (!id) return
    saveClientId(id)
    setGcalClientId(id)
    setGcalConnecting(true)
    setGcalDialogOpen(false)
    requestGoogleToken(
      id,
      (token) => { setGcalToken(token); setGcalConnecting(false); toast({ title: 'Google Calendar conectado' }) },
      (err)   => { setGcalConnecting(false); toast({ title: 'Erro ao conectar', description: err, variant: 'destructive' }) },
    )
  }

  function openNew(date?: string) {
    setEditEvento(null)
    setEvTitle(''); setEvDesc(''); setEvDate(date ?? todayISO()); setEvEndDate(''); setEvRecurrence('none'); setEvColor('purple')
    setDialogOpen(true)
  }

  function openEdit(ev: Evento) {
    if (ev.sourceModule) return // synthetic events are read-only
    setEditEvento(ev)
    setEvTitle(ev.title); setEvDesc(ev.description ?? ''); setEvDate(ev.date); setEvEndDate(ev.endDate ?? '')
    setEvRecurrence(ev.recurrence); setEvColor(ev.tags[0] && EVENT_COLORS.includes(ev.tags[0]) ? ev.tags[0] : 'purple')
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!evTitle.trim() || !evDate) return
    setSaving(true)
    try {
      const now = new Date().toISOString()
      const evento: Evento = editEvento
        ? { ...editEvento, title: evTitle.trim(), description: evDesc, date: evDate, endDate: evEndDate || undefined, recurrence: evRecurrence, tags: [evColor], updatedAt: now }
        : { id: generateId(), title: evTitle.trim(), description: evDesc, date: evDate, endDate: evEndDate || undefined, recurrence: evRecurrence, tags: [evColor], createdAt: now, updatedAt: now }

      const newEventos = editEvento
        ? storedEventos.map(e => e.id === evento.id ? evento : e)
        : [...storedEventos, evento]

      await saveEventos(projectId, newEventos)
      queryClient.setQueryData(['eventos', projectId], newEventos)
      setDialogOpen(false)
      toast({ title: editEvento ? 'Evento atualizado' : 'Evento criado' })

      // Auto-insert into Google Calendar if connected and creating a new event
      if (!editEvento && gcalToken) {
        const freqMap: Record<string, string> = { weekly: 'WEEKLY', monthly: 'MONTHLY', yearly: 'YEARLY' }
        createGCalEvent(gcalToken, {
          title: evTitle.trim(),
          date: evDate,
          endDate: evEndDate || undefined,
          description: evDesc || undefined,
          recurrence: evRecurrence !== 'none' ? freqMap[evRecurrence] : undefined,
        }).then(() => {
          toast({ title: 'Evento adicionado ao Google Calendar' })
        }).catch(err => {
          if (String(err).includes('TOKEN_EXPIRED')) setGcalToken(null)
          toast({ title: 'Erro ao sincronizar com Google Calendar', description: String(err), variant: 'destructive' })
        })
      }
    } catch (err) {
      toast({ title: 'Erro', description: String(err), variant: 'destructive' })
    }
    setSaving(false)
  }

  async function handleDelete() {
    if (!editEvento) return
    const newEventos = storedEventos.filter(e => e.id !== editEvento.id)
    await saveEventos(projectId, newEventos)
    queryClient.setQueryData(['eventos', projectId], newEventos)
    setDialogOpen(false)
    toast({ title: 'Evento removido' })
  }

  function googleCalendarUrl(ev: Evento): string {
    const date = ev.date.replace(/-/g, '')
    const endDate = ev.endDate ? ev.endDate.replace(/-/g, '') : date
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: ev.title,
      dates: `${date}/${endDate}`,
      details: ev.description ?? '',
    })
    if (ev.recurrence !== 'none') {
      const freq = { weekly: 'WEEKLY', monthly: 'MONTHLY', yearly: 'YEARLY' }[ev.recurrence]
      params.set('recur', `RRULE:FREQ=${freq}`)
    }
    return `https://calendar.google.com/calendar/render?${params.toString()}`
  }

  function exportICS() {
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//xoxoLAB//EN',
      'CALSCALE:GREGORIAN',
    ]
    for (const ev of storedEventos) {
      const dtstart = ev.date.replace(/-/g, '')
      const dtend = ev.endDate ? ev.endDate.replace(/-/g, '') : dtstart
      lines.push('BEGIN:VEVENT')
      lines.push(`UID:${ev.id}@xoxolab`)
      lines.push(`DTSTART;VALUE=DATE:${dtstart}`)
      lines.push(`DTEND;VALUE=DATE:${dtend}`)
      lines.push(`SUMMARY:${ev.title.replace(/\n/g, '\\n')}`)
      if (ev.description) lines.push(`DESCRIPTION:${ev.description.replace(/\n/g, '\\n')}`)
      if (ev.recurrence !== 'none') {
        const freq = { weekly: 'WEEKLY', monthly: 'MONTHLY', yearly: 'YEARLY' }[ev.recurrence]
        lines.push(`RRULE:FREQ=${freq}`)
      }
      lines.push('END:VEVENT')
    }
    lines.push('END:VCALENDAR')
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'efemerides.ics'; a.click()
    URL.revokeObjectURL(url)
  }

  function exportMarkdown() {
    const monthLabel = format(currentMonth, 'MMMM yyyy', { locale: ptBR })
    const lines = [`# Efemérides — ${monthLabel}\n`]
    const sortedDates = [...eventsByDate.entries()].sort(([a], [b]) => a.localeCompare(b))
    for (const [date, evs] of sortedDates) {
      lines.push(`## ${formatDate(date)}`)
      for (const ev of evs) {
        lines.push(`- **${ev.title}**${ev.recurrence !== 'none' ? ` (${RECURRENCE_LABELS[ev.recurrence]})` : ''}`)
        if (ev.description) lines.push(`  ${ev.description}`)
      }
      lines.push('')
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'efemerides.md'; a.click()
    URL.revokeObjectURL(url)
  }

  // Build calendar grid
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startOffset = getDay(monthStart)

  return (
    <div className="space-y-6">
      {/* Hidden file input for ICS import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".ics,text/calendar"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleImportICS(f) }}
      />

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Efemérides</h1>
          <p className="text-sm text-gray-500 mt-0.5">Calendário de eventos e datas importantes</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} title="Importar arquivo .ics">
            <Upload className="w-4 h-4" />
            Importar .ics
          </Button>
          {storedEventos.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setClearAllOpen(true)} className="text-red-500 border-red-200 hover:bg-red-50" title="Remover todos os eventos">
              <X className="w-4 h-4" />
              Limpar tudo
            </Button>
          )}
          {icsBatches.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setImportManageOpen(true)} title="Gerenciar importações ICS">
              <Repeat className="w-4 h-4" />
              {icsBatches.length} importação{icsBatches.length !== 1 ? 'ões' : ''}
            </Button>
          )}
          {gcalToken ? (
            <Button variant="outline" size="sm" onClick={handleDisconnectGoogle} className="text-blue-600 border-blue-200 hover:bg-blue-50" title="Google Calendar conectado — clique para desconectar">
              <Link2Off className="w-4 h-4" />
              Google Calendar
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={handleConnectGoogle} disabled={gcalConnecting} title="Sincronizar com Google Calendar">
              <CalendarDays className="w-4 h-4" />
              {gcalConnecting ? 'Conectando…' : 'Google Calendar'}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={exportICS} title="Exportar .ics">
            <Download className="w-4 h-4" />
            .ics
          </Button>
          <Button variant="outline" size="sm" onClick={exportMarkdown} title="Exportar Markdown">
            <Download className="w-4 h-4" />
            .md
          </Button>
          <Button size="sm" onClick={() => openNew()}><Plus className="w-4 h-4" /> Novo Evento</Button>
        </div>
      </div>

      {/* Calendar navigation */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <button onClick={() => setCurrentMonth(m => subMonths(m, 1))} className="p-1 rounded hover:bg-gray-100">
            <ChevronLeft className="w-5 h-5 text-gray-500" />
          </button>
          <h2 className="font-semibold text-gray-900 capitalize">
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </h2>
          <button onClick={() => setCurrentMonth(m => addMonths(m, 1))} className="p-1 rounded hover:bg-gray-100">
            <ChevronRight className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-gray-100">
          {WEEKDAYS.map(d => (
            <div key={d} className="py-2 text-center text-xs font-semibold text-gray-400">{d}</div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7">
          {/* Offset empty cells */}
          {Array.from({ length: startOffset }).map((_, i) => (
            <div key={`empty-${i}`} className="h-24 border-b border-r border-gray-50" />
          ))}

          {days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd')
            const events = eventsByDate.get(dateStr) ?? []
            const isCurrentDay = isToday(day)
            const isCurrentMonth = isSameMonth(day, currentMonth)

            return (
              <div
                key={dateStr}
                className={cn(
                  'h-24 border-b border-r border-gray-100 p-1.5 cursor-pointer hover:bg-gray-50 transition-colors',
                  !isCurrentMonth && 'opacity-30',
                  selectedDate === dateStr && 'bg-purple-50'
                )}
                onClick={() => { setSelectedDate(dateStr === selectedDate ? '' : dateStr); openNew(dateStr) }}
              >
                <div className={cn(
                  'text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-1',
                  isCurrentDay ? 'bg-purple-600 text-white' : 'text-gray-600'
                )}>
                  {format(day, 'd')}
                </div>
                <div className="space-y-0.5 overflow-hidden">
                  {events.slice(0, 3).map(ev => {
                    const col = colorMap[ev.tags[0]] ?? colorMap.purple
                    const isSynthetic = !!ev.sourceModule
                    return (
                      <div
                        key={ev.id}
                        onClick={e => { e.stopPropagation(); openEdit(ev) }}
                        className={cn(
                          'text-[10px] px-1 py-0.5 rounded truncate leading-tight',
                          col.bg, col.text,
                          isSynthetic && 'opacity-50 italic'
                        )}
                        title={isSynthetic ? `Via ${ev.sourceModule}` : ev.title}
                      >
                        {ev.title}
                      </div>
                    )
                  })}
                  {events.length > 3 && (
                    <div className="text-[9px] text-gray-400 px-1">+{events.length - 3} mais</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Event list for the month */}
      <div className="space-y-2">
        <h3 className="font-semibold text-gray-700 text-sm">Eventos do mês</h3>
        {[...eventsByDate.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, evs]) => (
            <div key={date} className="flex gap-3 items-start">
              <div className="text-xs text-gray-400 font-medium w-20 flex-shrink-0 pt-1">{formatDate(date)}</div>
              <div className="flex-1 space-y-1">
                {evs.map(ev => {
                  const col = colorMap[ev.tags[0]] ?? colorMap.purple
                  return (
                    <div
                      key={ev.id}
                      className={cn('flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg cursor-pointer hover:opacity-80 transition-opacity', col.bg, col.text, ev.sourceModule && 'opacity-60')}
                      onClick={() => openEdit(ev)}
                    >
                      <div className={cn('w-2 h-2 rounded-full flex-shrink-0', col.dot)} />
                      <span className="font-medium">{ev.title}</span>
                      {ev.recurrence !== 'none' && <Repeat className="w-3 h-3 opacity-60" />}
                      {ev.sourceModule && <span className="text-xs opacity-60 ml-auto">via {ev.sourceModule}</span>}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        {eventsByDate.size === 0 && (
          <p className="text-sm text-gray-400 italic text-center py-4">Nenhum evento este mês</p>
        )}
      </div>

      {/* Event dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editEvento ? 'Editar Evento' : 'Novo Evento'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Título</Label>
              <Input value={evTitle} onChange={e => setEvTitle(e.target.value)} autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Data</Label>
                <Input type="date" value={evDate} onChange={e => setEvDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Data final (opcional)</Label>
                <Input type="date" value={evEndDate} onChange={e => setEvEndDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Repetição</Label>
              <Select value={evRecurrence} onValueChange={v => setEvRecurrence(v as RecurrenceType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(RECURRENCE_LABELS) as [RecurrenceType, string][]).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Cor</Label>
              <div className="flex gap-2">
                {EVENT_COLORS.map(c => (
                  <button key={c} onClick={() => setEvColor(c)} className={cn('w-6 h-6 rounded-full', colorMap[c].dot, evColor === c && 'ring-2 ring-offset-1 ring-gray-400')} />
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Descrição (opcional)</Label>
              <Input value={evDesc} onChange={e => setEvDesc(e.target.value)} placeholder="Detalhes do evento" />
            </div>
          </div>
          {editEvento && (
            <a
              href={googleCalendarUrl(editEvento)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 px-1"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Adicionar ao Google Calendar
            </a>
          )}
          <DialogFooter>
            {editEvento && (
              <Button variant="outline" className="text-red-500 mr-auto" onClick={handleDelete}>
                <X className="w-4 h-4" /> Remover
              </Button>
            )}
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !evTitle.trim() || !evDate}>
              {saving ? 'Salvando…' : editEvento ? 'Atualizar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage ICS imports dialog */}
      <Dialog open={importManageOpen} onOpenChange={setImportManageOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importações ICS</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {icsBatches.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Nenhuma importação registrada</p>
            ) : (
              icsBatches.map(batch => (
                <div key={batch.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{batch.fileName}</p>
                    <p className="text-xs text-gray-400">
                      {batch.count} evento{batch.count !== 1 ? 's' : ''} · {new Date(batch.importedAt).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="ml-3 flex-shrink-0 text-red-500 border-red-200 hover:bg-red-50 text-xs"
                    onClick={() => handleUndoBatch(batch.id)}
                  >
                    Desfazer
                  </Button>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportManageOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Google Calendar setup dialog */}
      <Dialog open={gcalDialogOpen} onOpenChange={setGcalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conectar Google Calendar</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div className="flex gap-2 bg-blue-50 border border-blue-100 rounded-lg p-3 text-blue-800">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs leading-relaxed">
                <p>Para conectar, você precisa de um <strong>Client ID OAuth</strong> do Google:</p>
                <ol className="list-decimal ml-4 space-y-0.5">
                  <li>Acesse <strong>console.cloud.google.com</strong> e crie um projeto</li>
                  <li>Ative a <strong>Google Calendar API</strong></li>
                  <li>Em <em>Credenciais</em>, crie um <strong>ID do cliente OAuth → Aplicativo da Web</strong></li>
                  <li>Adicione <strong>{window.location.origin}</strong> como origem autorizada</li>
                  <li>Copie o Client ID e cole abaixo</li>
                </ol>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Client ID OAuth</Label>
              <Input
                placeholder="XXXXXXXXX.apps.googleusercontent.com"
                value={gcalClientIdInput}
                onChange={e => setGcalClientIdInput(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGcalDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleGcalSave} disabled={!gcalClientIdInput.trim()}>
              Conectar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear all dialog */}
      <Dialog open={clearAllOpen} onOpenChange={setClearAllOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Limpar todos os eventos?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Esta ação removerá permanentemente todos os <strong>{storedEventos.length} evento{storedEventos.length !== 1 ? 's' : ''}</strong> armazenados no módulo Efemérides. Não é possível desfazer depois de confirmado.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClearAllOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleClearAll}>
              Remover todos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  )
}
