import React, { useState, useMemo, useRef, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd'
import {
  Plus, ChevronRight, ChevronLeft, ZoomIn, ZoomOut,
  History, ExternalLink, X, Download, Share2, User,
  Calendar, ChevronDown, ChevronUp, Pencil, Paperclip, ImagePlus, Trash2,
  FileText, FileType2, FolderArchive,
} from 'lucide-react'
import { format, eachMonthOfInterval, startOfMonth, endOfMonth, addMonths, subMonths, parseISO, isValid } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useAuth } from '@/contexts/AuthContext'
import { useProject } from '@/contexts/ProjectContext'
import { loadKanbanCards, saveKanbanCard, deleteKanbanCard, loadPautas, savePautas, loadEventos, uploadKanbanAttachment } from '@/lib/storage'
import { readFile, getGitHubConfig } from '@/lib/github'
import { sendMentionNotification } from '@/lib/emailjs'
import { extractMentions, generateId, formatDate, formatDateTime, todayISO } from '@/lib/utils'
import { getPlatform, PLATFORMS, getPlatformBorderColor } from '@/lib/platforms'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { MarkdownEditor } from '@/components/shared/MarkdownEditor'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/useToast'
import { ToastContainer } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import type { KanbanCard, KanbanColumn, KanbanPriority, KanbanLogEntry, PautaItem, Evento, Attachment } from '@/types'

const COLUMNS: { id: KanbanColumn; label: string; color: string; collapsedByDefault: boolean }[] = [
  { id: 'pautas',               label: 'Pautas',               color: 'bg-gray-100 border-gray-200',    collapsedByDefault: true },
  { id: 'em-construcao',        label: 'Em Construção',         color: 'bg-blue-50 border-blue-200',     collapsedByDefault: false },
  { id: 'em-revisao',           label: 'Em Revisão',            color: 'bg-amber-50 border-amber-200',   collapsedByDefault: false },
  { id: 'aguardando-aprovacao', label: 'Aguardando Aprovação',  color: 'bg-orange-50 border-orange-200', collapsedByDefault: false },
  { id: 'divulgacao',           label: 'Divulgação',            color: 'bg-purple-50 border-purple-200', collapsedByDefault: false },
  { id: 'finalizado',           label: 'Finalizadas',            color: 'bg-green-50 border-green-200',   collapsedByDefault: true },
]

const PRIORITY_LABELS: Record<KanbanPriority, string> = {
  baixa: 'Baixa', media: 'Média', alta: 'Alta', urgente: 'Urgente',
}

function appendLog(card: KanbanCard, action: string, author: string): KanbanCard {
  const entry: KanbanLogEntry = { id: generateId(), timestamp: new Date().toISOString(), action, author }
  return { ...card, log: [...(card.log ?? []), entry], updatedAt: new Date().toISOString() }
}

function pautaToKanbanCard(item: PautaItem): KanbanCard {
  return {
    id: `pauta-${item.id}`,
    title: item.title,
    description: item.body ?? '',
    column: 'pautas',
    order: item.order,
    platforms: [],
    attachments: [],
    log: [],
    mentions: item.mentions ?? [],
    pautaId: item.id,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    dueDate: item.dueDate,
  }
}

// ─── Timeline ─────────────────────────────────────────────────────────────

function KanbanTimeline({
  cards, eventos, totalWidth, monthCount,
}: {
  cards: KanbanCard[]
  eventos: Evento[]
  totalWidth: number
  monthCount: number
}) {
  const today = new Date()
  const cardsWithDates = cards.filter(c => c.dueDate && isValid(parseISO(c.dueDate)))
  const eventosWithDates = eventos.filter(e => e.date && isValid(parseISO(e.date)))

  // monthCount total: 1 before + rest after
  const beforeMonths = 1
  const afterMonths = monthCount - beforeMonths - 1
  const rangeStart = subMonths(startOfMonth(today), beforeMonths)
  const rangeEnd = addMonths(endOfMonth(today), afterMonths)
  const months = eachMonthOfInterval({ start: rangeStart, end: rangeEnd })

  const colWidth = Math.round(totalWidth / months.length)

  return (
    <div className="flex border-b border-gray-200 bg-white" style={{ minWidth: totalWidth }}>
      {months.map(month => {
        const monthStr = format(month, 'yyyy-MM')
        const monthCards = cardsWithDates.filter(c => c.dueDate!.startsWith(monthStr))
        const monthEventos = eventosWithDates.filter(e => e.date.startsWith(monthStr))
        return (
          <div
            key={monthStr}
            className="flex-shrink-0 border-r border-gray-100 p-2"
            style={{ width: colWidth }}
          >
            <p className="text-[11px] font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
              {format(month, 'MMM yyyy', { locale: ptBR })}
            </p>
            <div className="flex flex-wrap gap-1">
              {monthCards.map(c => {
                const platform = getPlatform(c.platforms[0])
                return (
                  <div
                    key={c.id}
                    title={`${c.title} — ${c.dueDate}`}
                    className={cn(
                      'text-[10px] font-medium px-1.5 py-0.5 rounded border truncate max-w-full',
                      platform?.bgColor ?? 'bg-gray-50',
                      platform?.textColor ?? 'text-gray-600',
                      platform?.borderColor ?? 'border-gray-200',
                    )}
                    style={{ maxWidth: colWidth - 16 }}
                  >
                    {c.title}
                  </div>
                )
              })}
              {monthEventos.map(e => (
                <div
                  key={e.id}
                  title={`Efeméride: ${e.title} — ${e.date}`}
                  className="text-[10px] font-medium px-1.5 py-0.5 rounded border truncate max-w-full bg-purple-50 text-purple-700 border-purple-200"
                  style={{ maxWidth: colWidth - 16 }}
                >
                  📅 {e.title}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Card component ────────────────────────────────────────────────────────

function KanbanCardView({
  card,
  onEdit,
  onQuickAttach,
  onDownloadCard,
  isFromPautas = false,
}: {
  card: KanbanCard
  onEdit: () => void
  onQuickAttach: (files: FileList) => void
  onDownloadCard: (fmt: 'md' | 'docx' | 'zip') => void
  isFromPautas?: boolean
}) {
  const [showLog, setShowLog] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [dlOpen, setDlOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dlRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!dlOpen) return
    const handler = (e: MouseEvent) => {
      if (dlRef.current && !dlRef.current.contains(e.target as Node)) setDlOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [dlOpen])

  const primaryPlatform = card.platforms[0]
  const borderColorClass = getPlatformBorderColor(primaryPlatform)
  const today = todayISO()
  const isOverdue = card.dueDate && card.dueDate < today
  const isDueSoon = card.dueDate && card.dueDate >= today && card.dueDate <= new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0]
  const attachments = card.attachments ?? []
  const images = attachments.filter(a => a.type.startsWith('image/'))
  const videos = attachments.filter(a => a.type.startsWith('video/'))

  return (
    <div
      className={cn(
        'group bg-white rounded-lg border border-gray-100 border-l-4 p-3 shadow-sm hover:shadow-md transition-shadow',
        borderColorClass,
        isFromPautas && 'opacity-75'
      )}
    >
      <div className="flex items-start gap-1">
        <p className="font-semibold text-gray-900 text-sm leading-snug mb-1 flex-1">{card.title}</p>
        {/* Download dropdown */}
        <div className="relative opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" ref={dlRef}>
          <button
            onClick={e => { e.stopPropagation(); setDlOpen(v => !v) }}
            className="p-0.5 text-gray-400 hover:text-purple-600"
            title="Baixar card"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          {dlOpen && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1 min-w-[170px]">
              {([
                { icon: <FileText className="w-3.5 h-3.5 text-gray-500" />, label: 'Markdown (.md)', fmt: 'md' as const },
                { icon: <FileType2 className="w-3.5 h-3.5 text-blue-500" />, label: 'Word (.docx)', fmt: 'docx' as const },
                { icon: <FolderArchive className="w-3.5 h-3.5 text-amber-500" />, label: 'ZIP (texto + mídias)', fmt: 'zip' as const },
              ] as { icon: React.ReactNode; label: string; fmt: 'md' | 'docx' | 'zip' }[]).map(({ icon, label, fmt }) => (
                <button
                  key={fmt}
                  onClick={e => { e.stopPropagation(); setDlOpen(false); onDownloadCard(fmt) }}
                  className="w-full px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 text-left flex items-center gap-2"
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={e => { e.stopPropagation(); onEdit() }}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-gray-400 hover:text-purple-600 flex-shrink-0"
          title="Editar card"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      </div>
      {card.description && (
        <p className="text-xs text-gray-500 line-clamp-2 mb-2">{card.description.slice(0, 100)}</p>
      )}

      <div className="flex flex-wrap items-center gap-1.5 mt-2">
        {card.platforms.map(pid => {
          const p = getPlatform(pid)
          return p ? (
            <span key={pid} className={cn('text-[10px] px-1.5 py-0.5 rounded-full border', p.bgColor, p.textColor, p.borderColor)}>
              {p.label}
            </span>
          ) : (
            <span key={pid} className="text-[10px] px-1.5 py-0.5 rounded-full border bg-gray-50 text-gray-600 border-gray-200">
              {pid}
            </span>
          )
        })}
        {card.assignee && (
          <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
            <User className="w-3 h-3" />
            {card.assignee.split('@')[0]}
          </span>
        )}
        {card.dueDate && (
          <span className={cn('flex items-center gap-0.5 text-[10px]', isOverdue ? 'text-red-500' : isDueSoon ? 'text-amber-500' : 'text-gray-400')}>
            <Calendar className="w-3 h-3" />
            {formatDate(card.dueDate)}
          </span>
        )}
      </div>

      {/* Image thumbnails */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {images.map(att => (
            <div key={att.id} className="flex flex-col items-center gap-0.5">
              {att.thumbnail
                ? <img src={att.thumbnail} alt={att.name} className="w-12 h-12 object-cover rounded border border-gray-100" />
                : <div className="w-12 h-12 rounded border border-gray-100 bg-gray-50 flex items-center justify-center"><ImagePlus className="w-4 h-4 text-gray-300" /></div>
              }
              <span className="flex items-center gap-0.5 text-[9px] text-gray-400 max-w-[48px] truncate">
                <Paperclip className="w-2.5 h-2.5 flex-shrink-0" />
                <span className="truncate">{att.name}</span>
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Video filenames */}
      {videos.length > 0 && (
        <div className="mt-1.5 space-y-0.5">
          {videos.map(att => (
            <div key={att.id} className="flex items-center gap-1 text-[10px] text-gray-400">
              <Paperclip className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{att.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Quick-attach drop zone */}
      <div
        className={cn(
          'mt-2 border border-dashed rounded flex items-center justify-center gap-1 h-8 cursor-pointer transition-colors text-[10px]',
          isDragOver
            ? 'border-purple-400 bg-purple-50 text-purple-600'
            : 'border-gray-200 text-gray-300 hover:border-gray-400 hover:text-gray-400'
        )}
        onClick={e => { e.stopPropagation(); fileInputRef.current?.click() }}
        onDragOver={e => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true) }}
        onDragLeave={e => { e.stopPropagation(); setIsDragOver(false) }}
        onDrop={e => {
          e.preventDefault(); e.stopPropagation(); setIsDragOver(false)
          if (e.dataTransfer.files.length) onQuickAttach(e.dataTransfer.files)
        }}
        title="Clique ou arraste imagens/vídeos"
      >
        <ImagePlus className="w-3 h-3" />
        <span>{isDragOver ? 'Solte aqui' : '+'}</span>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={e => { if (e.target.files?.length) { onQuickAttach(e.target.files); e.target.value = '' } }}
        />
      </div>

      {card.log?.length > 0 && (
        <div className="mt-2 border-t border-gray-50 pt-1">
          <button
            onClick={e => { e.stopPropagation(); setShowLog(v => !v) }}
            className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-600"
          >
            <History className="w-3 h-3" />
            {card.log.length !== 1 ? `${card.log.length} ações` : '1 ação'}
            {showLog ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          {showLog && (
            <div className="mt-1 space-y-0.5 max-h-32 overflow-y-auto">
              {[...card.log].reverse().map(entry => (
                <div key={entry.id} className="text-[10px] text-gray-400">
                  <span className="text-gray-500">{entry.author.split('@')[0]}:</span> {entry.action}
                  <span className="ml-1 opacity-60">· {formatDateTime(entry.timestamp)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Kanban page ──────────────────────────────────────────────────────

export function Kanban() {
  const { session } = useAuth()
  const { projectId, projectMeta } = useProject()
  const queryClient = useQueryClient()
  const { toasts, toast, dismiss } = useToast()
  const boardRef = useRef<HTMLDivElement>(null)

  const [exportOpen, setExportOpen] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!exportOpen) return
    function handleClick(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [exportOpen])

  const [collapsed, setCollapsed] = useState<Set<KanbanColumn>>(
    new Set(COLUMNS.filter(c => c.collapsedByDefault).map(c => c.id))
  )
  const [zoom, setZoom] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editCard, setEditCard] = useState<KanbanCard | null>(null)
  const [editColumn, setEditColumn] = useState<KanbanColumn>('em-construcao')
  const [cardTitle, setCardTitle] = useState('')
  const [cardDesc, setCardDesc] = useState('')
  const [cardPriority, setCardPriority] = useState<KanbanPriority | ''>('')
  const [cardPlatforms, setCardPlatforms] = useState<string[]>([])
  const [cardAssignee, setCardAssignee] = useState('')
  const [cardDueDate, setCardDueDate] = useState('')
  const [cardCustomPlatform, setCardCustomPlatform] = useState('')
  const [cardAttachments, setCardAttachments] = useState<Attachment[]>([])
  const [attachUploading, setAttachUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const dialogFileRef = useRef<HTMLInputElement>(null)

  const { data: kanbanCards = [] } = useQuery({
    queryKey: ['kanban', projectId],
    queryFn: () => loadKanbanCards(projectId),
  })

  const { data: pautaData } = useQuery({
    queryKey: ['pautas', projectId],
    queryFn: () => loadPautas(projectId),
  })

  const { data: eventos = [] } = useQuery({
    queryKey: ['eventos', projectId],
    queryFn: () => loadEventos(projectId),
  })

  const pautasCards = useMemo(() => (pautaData?.items ?? []).map(pautaToKanbanCard), [pautaData])

  const allCards = useMemo(() => {
    // Don't show kanban cards that originated from pautas AND are still in pautas column
    const stored = kanbanCards.filter(c => !(c.pautaId && c.column === 'pautas'))
    return stored
  }, [kanbanCards])

  const cardsByColumn = useMemo(() => {
    const map = new Map<KanbanColumn, KanbanCard[]>()
    for (const col of COLUMNS) map.set(col.id, [])
    map.set('pautas', [...pautasCards])
    for (const card of allCards) {
      const list = map.get(card.column) ?? []
      list.push(card)
      map.set(card.column, list)
    }
    for (const [, list] of map) list.sort((a, b) => a.order - b.order)
    return map
  }, [allCards, pautasCards])

  function toggleCollapse(col: KanbanColumn) {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(col)) next.delete(col)
      else next.add(col)
      return next
    })
  }

  function openNew(column: KanbanColumn = 'em-construcao') {
    setEditCard(null)
    setEditColumn(column === 'finalizado' ? 'em-construcao' : column)
    setCardTitle(''); setCardDesc(''); setCardPriority(''); setCardPlatforms([]); setCardAssignee(''); setCardDueDate(''); setCardCustomPlatform('')
    setCardAttachments([])
    setDialogOpen(true)
  }

  function openEdit(card: KanbanCard) {
    setEditCard(card)
    setEditColumn(card.column)
    setCardTitle(card.title)
    setCardDesc(card.description)
    setCardPriority(card.priority ?? '')
    const knownIds = new Set(PLATFORMS.map(p => p.id))
    const knownPlatforms = card.platforms.filter(pid => knownIds.has(pid))
    const customPlatforms = card.platforms.filter(pid => !knownIds.has(pid))
    setCardPlatforms(knownPlatforms)
    setCardCustomPlatform(customPlatforms[0] ?? '')
    setCardAssignee(card.assignee ?? '')
    setCardDueDate(card.dueDate ?? '')
    setCardAttachments(card.attachments ?? [])
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!cardTitle.trim()) return
    setSaving(true)
    try {
      const now = new Date().toISOString()
      const prevMentions = editCard?.mentions ?? []
      const newMentions = extractMentions(cardDesc)
      const added = newMentions.filter(e => !prevMentions.includes(e) && e !== session?.email)

      const platforms = cardCustomPlatform.trim()
        ? [...new Set([...cardPlatforms, cardCustomPlatform.trim()])]
        : cardPlatforms

      let card: KanbanCard
      if (editCard) {
        // If editing a pautas-derived card → update the PautaItem in storage
        if (editCard.pautaId) {
          const currentPautas = pautaData ?? { sections: [], items: [], tags: [] }
          const updatedItems = currentPautas.items.map(item =>
            item.id === editCard.pautaId
              ? { ...item, title: cardTitle.trim(), body: cardDesc || undefined, dueDate: cardDueDate || undefined, mentions: newMentions, updatedAt: now }
              : item
          )
          const updatedPautas = { ...currentPautas, items: updatedItems }
          await savePautas(projectId, updatedPautas)
          queryClient.setQueryData(['pautas', projectId], updatedPautas)
          setDialogOpen(false)
          toast({ title: 'Item de Pautas atualizado' })
          setSaving(false)
          return
        }
        card = appendLog(
          {
            ...editCard,
            title: cardTitle.trim(),
            description: cardDesc,
            priority: cardPriority || undefined,
            platforms,
            assignee: cardAssignee || undefined,
            dueDate: cardDueDate || undefined,
            attachments: cardAttachments,
            mentions: newMentions,
            updatedAt: now,
          },
          'Editado',
          session!.email
        )
        await saveKanbanCard(projectId, card)
        queryClient.setQueryData(['kanban', projectId], (prev: KanbanCard[] = []) =>
          prev.map(c => c.id === card.id ? card : c)
        )
      } else {
        const existingInCol = cardsByColumn.get(editColumn) ?? []
        const newId = generateId()
        // If creating in pautas column → also persist as a PautaItem
        if (editColumn === 'pautas') {
          const currentPautas = pautaData ?? { sections: [], items: [], tags: [] }
          const pautaItem: PautaItem = {
            id: newId,
            title: cardTitle.trim(),
            body: cardDesc || undefined,
            order: currentPautas.items.length,
            tags: [],
            attachments: [],
            dueDate: cardDueDate || undefined,
            mentions: extractMentions(cardDesc),
            createdAt: now,
            updatedAt: now,
          }
          const updatedPautas = { ...currentPautas, items: [...currentPautas.items, pautaItem] }
          await savePautas(projectId, updatedPautas)
          queryClient.setQueryData(['pautas', projectId], updatedPautas)
          // The pauta item will automatically appear in kanban via pautasCards — no need to save a KanbanCard
          setDialogOpen(false)
          toast({ title: 'Item criado em Pautas' })
          setSaving(false)
          return
        }
        card = appendLog(
          {
            id: generateId(),
            title: cardTitle.trim(),
            description: cardDesc,
            column: editColumn,
            order: existingInCol.length,
            priority: cardPriority || undefined,
            platforms,
            assignee: cardAssignee || undefined,
            dueDate: cardDueDate || undefined,
            attachments: cardAttachments,
            log: [],
            mentions: newMentions,
            createdAt: now,
            updatedAt: now,
          },
          'Criado',
          session!.email
        )
        await saveKanbanCard(projectId, card)
        queryClient.setQueryData(['kanban', projectId], (prev: KanbanCard[] = []) => [...prev, card])
      }

      for (const email of added) {
        await sendMentionNotification({
          mentionerEmail: session!.email,
          mentionedEmail: email,
          projectName: projectMeta?.name ?? projectId,
          moduleName: 'Kanban',
          excerpt: cardDesc.slice(0, 200),
        })
      }

      setDialogOpen(false)
      toast({ title: editCard ? 'Card atualizado' : 'Card criado' })
    } catch (err) {
      toast({ title: 'Erro', description: String(err), variant: 'destructive' })
    }
    setSaving(false)
  }

  async function handleDelete() {
    if (!editCard) return
    await deleteKanbanCard(projectId, editCard.id)
    queryClient.setQueryData(['kanban', projectId], (prev: KanbanCard[] = []) => prev.filter(c => c.id !== editCard.id))
    setDialogOpen(false)
    toast({ title: 'Card removido' })
  }

  // ─── Attachment helpers ──────────────────────────────────────────────────

  function generateThumbnail(file: File): Promise<string | undefined> {
    if (!file.type.startsWith('image/')) return Promise.resolve(undefined)
    return new Promise(resolve => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        const MAX = 96
        const ratio = Math.min(MAX / img.width, MAX / img.height, 1)
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * ratio)
        canvas.height = Math.round(img.height * ratio)
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
        URL.revokeObjectURL(url)
        resolve(canvas.toDataURL('image/jpeg', 0.75))
      }
      img.onerror = () => { URL.revokeObjectURL(url); resolve(undefined) }
      img.src = url
    })
  }

  async function uploadFiles(cardId: string, files: FileList): Promise<Attachment[]> {
    const results: Attachment[] = []
    for (const file of Array.from(files)) {
      if (file.size > 50 * 1024 * 1024) {
        toast({ title: `"${file.name}" muito grande (máx 50 MB)`, variant: 'destructive' })
        continue
      }
      const [att, thumbnail] = await Promise.all([
        uploadKanbanAttachment(projectId, cardId, file),
        generateThumbnail(file),
      ])
      results.push({ ...att, thumbnail })
    }
    return results
  }

  /** Upload from dialog (card may not exist yet — use a temp id that becomes the real id after save) */
  async function handleDialogAttach(files: FileList) {
    setAttachUploading(true)
    try {
      const cardId = editCard?.id ?? generateId()
      const atts = await uploadFiles(cardId, files)
      setCardAttachments(prev => [...prev, ...atts])
    } catch (err) {
      toast({ title: 'Erro no upload', description: String(err), variant: 'destructive' })
    }
    setAttachUploading(false)
  }

  /** Quick-attach directly from the card tile (card must already exist) */
  async function handleQuickAttach(card: KanbanCard, files: FileList) {
    try {
      const atts = await uploadFiles(card.id, files)
      if (!atts.length) return
      const updated = appendLog(
        { ...card, attachments: [...(card.attachments ?? []), ...atts], updatedAt: new Date().toISOString() },
        `${atts.length} mídia(s) anexada(s)`,
        session!.email
      )
      await saveKanbanCard(projectId, updated)
      queryClient.setQueryData(['kanban', projectId], (prev: KanbanCard[] = []) =>
        prev.map(c => c.id === updated.id ? updated : c)
      )
      toast({ title: `${atts.length} arquivo(s) anexado(s)` })
    } catch (err) {
      toast({ title: 'Erro ao anexar', description: String(err), variant: 'destructive' })
    }
  }

  // ─── Per-card export ──────────────────────────────────────────────────────

  function cardToMarkdown(card: KanbanCard): string {
    return `# ${card.title}\n\n${card.description}`
  }

  async function exportCardMd(card: KanbanCard) {
    const blob = new Blob([cardToMarkdown(card)], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `${card.id}.md`; a.click()
    URL.revokeObjectURL(url)
  }

  async function exportCardDocx(card: KanbanCard) {
    try {
      const { Document, Paragraph, TextRun, HeadingLevel, Packer } = await import('docx')
      const doc = new Document({
        sections: [{
          children: [
            new Paragraph({ text: card.title, heading: HeadingLevel.HEADING_1 }),
            ...card.description.split('\n').map(line =>
              new Paragraph({ children: [new TextRun(line)] })
            ),
          ],
        }],
      })
      const blob = await Packer.toBlob(doc)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `${card.id}.docx`; a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      toast({ title: 'Erro ao exportar DOCX', description: String(err), variant: 'destructive' })
    }
  }

  async function exportCardZip(card: KanbanCard) {
    try {
      const JSZip = (await import('jszip')).default
      const zip = new JSZip()
      zip.file(`${card.id}.md`, cardToMarkdown(card))

      // Fetch each attachment from GitHub and add to ZIP
      const cfg = getGitHubConfig()
      if (cfg && card.attachments?.length) {
        await Promise.all(card.attachments.map(async att => {
          try {
            const ghFile = await readFile(cfg, att.path)
            const raw = ghFile.content.replace(/\n/g, '')
            const binary = atob(raw)
            const bytes = new Uint8Array(binary.length)
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
            zip.file(att.name, bytes)
          } catch { /* skip unreachable files */ }
        }))
      }

      const blob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `${card.id}.zip`; a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      toast({ title: 'Erro ao exportar ZIP', description: String(err), variant: 'destructive' })
    }
  }

  async function handleDownloadCard(card: KanbanCard, fmt: 'md' | 'docx' | 'zip') {
    if (fmt === 'md') await exportCardMd(card)
    else if (fmt === 'docx') await exportCardDocx(card)
    else await exportCardZip(card)
  }

  async function onDragEnd(result: DropResult) {
    if (!result.destination) return
    const { draggableId, source, destination } = result

    const srcCol = source.droppableId as KanbanColumn
    const dstCol = destination.droppableId as KanbanColumn

    // If dragging from pautas column → promote to a real kanban card AND remove from Pautas
    if (srcCol === 'pautas') {
      const pautaCard = pautasCards.find(c => c.id === draggableId)
      if (!pautaCard) return
      const now = new Date().toISOString()
      const newCard: KanbanCard = appendLog(
        {
          ...pautaCard,
          id: generateId(),
          column: dstCol,
          order: destination.index,
          pautaId: undefined, // promoted: no longer linked to pauta
          createdAt: now,
          updatedAt: now,
        },
        `Movido de Pautas para ${COLUMNS.find(c => c.id === dstCol)?.label ?? dstCol}`,
        session!.email
      )
      await saveKanbanCard(projectId, newCard)
      queryClient.setQueryData(['kanban', projectId], (prev: KanbanCard[] = []) => [...prev, newCard])

      // Remove corresponding PautaItem from Pautas storage
      if (pautaCard.pautaId && pautaData) {
        const updatedPautas = { ...pautaData, items: pautaData.items.filter(i => i.id !== pautaCard.pautaId) }
        await savePautas(projectId, updatedPautas)
        queryClient.setQueryData(['pautas', projectId], updatedPautas)
      }
      return
    }

    const card = allCards.find(c => c.id === draggableId)
    if (!card) return

    const moved = appendLog(
      { ...card, column: dstCol, order: destination.index },
      srcCol !== dstCol
        ? `Movido para ${COLUMNS.find(c => c.id === dstCol)?.label ?? dstCol}`
        : 'Reordenado',
      session!.email
    )

    // Optimistic update
    queryClient.setQueryData(['kanban', projectId], (prev: KanbanCard[] = []) =>
      prev.map(c => c.id === moved.id ? moved : c)
    )
    await saveKanbanCard(projectId, moved)
  }

  async function exportTimelinePDF() {
    try {
      const { jsPDF } = await import('jspdf')
      const pdf = new jsPDF({ orientation: 'portrait', format: 'a4', unit: 'mm' })
      const margin = 20
      const pageW = pdf.internal.pageSize.getWidth()
      let y = margin

      pdf.setFontSize(16)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Kanban — Linha do Tempo', margin, y)
      y += 10

      const rangeStart = subMonths(startOfMonth(new Date()), 1)
      const rangeEnd = addMonths(endOfMonth(new Date()), 6 / zoom)
      const months = eachMonthOfInterval({ start: rangeStart, end: rangeEnd })
      const cardsWithDates = [...allCards, ...pautasCards].filter(c => c.dueDate && isValid(parseISO(c.dueDate)))

      for (const month of months) {
        const monthStr = format(month, 'yyyy-MM')
        const monthCards = cardsWithDates.filter(c => c.dueDate!.startsWith(monthStr))
        if (monthCards.length === 0) continue

        if (y > 260) { pdf.addPage(); y = margin }
        pdf.setFontSize(12)
        pdf.setFont('helvetica', 'bold')
        pdf.text(format(month, 'MMMM yyyy', { locale: ptBR }), margin, y)
        y += 6

        for (const c of monthCards) {
          if (y > 270) { pdf.addPage(); y = margin }
          pdf.setFontSize(10)
          pdf.setFont('helvetica', 'normal')
          const platform = getPlatform(c.platforms[0])
          const text = `• ${c.title}${platform ? ` [${platform.label}]` : ''}${c.assignee ? ` — ${c.assignee.split('@')[0]}` : ''}`
          const lines = pdf.splitTextToSize(text, pageW - margin * 2)
          pdf.text(lines, margin, y)
          y += lines.length * 5 + 1
        }
        y += 4
      }

      pdf.save('kanban-timeline.pdf')
    } catch (err) {
      toast({ title: 'Erro ao exportar PDF da timeline', description: String(err), variant: 'destructive' })
    }
  }

  async function exportBoardPNG() {
    const el = boardRef.current
    if (!el) return
    try {
      const { captureToPng } = await import('@/lib/captureUtils')
      const dataUrl = await captureToPng(el, '#f9fafb')
      const link = document.createElement('a')
      link.download = 'kanban-board.png'
      link.href = dataUrl
      link.click()
    } catch (err) {
      toast({ title: 'Erro ao exportar PNG', description: String(err), variant: 'destructive' })
    }
  }

  async function exportBoardPDF() {
    const el = boardRef.current
    if (!el) return
    try {
      const { captureToPng } = await import('@/lib/captureUtils')
      const { jsPDF } = await import('jspdf')
      const imgData = await captureToPng(el, '#ffffff')
      const img = new Image()
      img.src = imgData
      await new Promise(r => { img.onload = r })
      const pdf = new jsPDF({ orientation: 'landscape', format: 'a4', unit: 'mm' })
      const pageW = pdf.internal.pageSize.getWidth()
      const pageH = pdf.internal.pageSize.getHeight()
      const ratio = img.width / img.height
      let imgW = pageW - 20
      let imgH = imgW / ratio
      if (imgH > pageH - 20) { imgH = pageH - 20; imgW = imgH * ratio }
      pdf.addImage(imgData, 'PNG', (pageW - imgW) / 2, 10, imgW, imgH)
      pdf.save('kanban-board.pdf')
    } catch (err) {
      toast({ title: 'Erro ao exportar PDF', description: String(err), variant: 'destructive' })
    }
  }

  async function exportBoardXLS() {
    try {
      const { utils, writeFile } = await import('xlsx')
      const rows: unknown[][] = [['Coluna', 'Título', 'Descrição', 'Prioridade', 'Plataformas', 'Responsável', 'Prazo']]
      for (const col of COLUMNS) {
        for (const card of (cardsByColumn.get(col.id) ?? [])) {
          rows.push([col.label, card.title, card.description, card.priority ?? '', card.platforms.join('; '), card.assignee ?? '', card.dueDate ?? ''])
        }
      }
      const ws = utils.aoa_to_sheet(rows)
      const wb = utils.book_new()
      utils.book_append_sheet(wb, ws, 'Kanban')
      writeFile(wb, 'kanban.xlsx')
    } catch (err) {
      toast({ title: 'Erro ao exportar XLS', description: String(err), variant: 'destructive' })
    }
  }

  function exportBoardCSV() {
    try {
      const escape = (s: string) => `"${s.replace(/"/g, '""')}"`
      const rows = [['Coluna', 'Título', 'Descrição', 'Prioridade', 'Plataformas', 'Responsável', 'Prazo'].map(escape).join(',')]
      for (const col of COLUMNS) {
        for (const card of (cardsByColumn.get(col.id) ?? [])) {
          rows.push([col.label, card.title, card.description, card.priority ?? '', card.platforms.join('; '), card.assignee ?? '', card.dueDate ?? ''].map(escape).join(','))
        }
      }
      const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = 'kanban.csv'; a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      toast({ title: 'Erro ao exportar CSV', description: String(err), variant: 'destructive' })
    }
  }

  function exportBoardMarkdown() {
    const lines = ['# Kanban\n']
    for (const col of COLUMNS) {
      lines.push(`## ${col.label}`)
      for (const card of (cardsByColumn.get(col.id) ?? [])) {
        lines.push(`### ${card.title}`)
        if (card.description) lines.push(card.description)
        if (card.platforms.length) lines.push(`**Plataformas:** ${card.platforms.join(', ')}`)
        if (card.assignee) lines.push(`**Responsável:** ${card.assignee}`)
        if (card.dueDate) lines.push(`**Prazo:** ${card.dueDate}`)
        lines.push('')
      }
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'kanban.md'; a.click()
    URL.revokeObjectURL(url)
  }

  const shareUrl = (card: KanbanCard) => {
    const platform = getPlatform(card.platforms[0])
    if (!platform?.composeUrl) return null
    return platform.composeUrl(`${card.title}\n\n${card.description}`)
  }

  const COLUMN_WIDTH = 280

  // totalWidth = board width so timeline and columns always scroll in sync
  const boardWidth = COLUMNS.reduce((sum, col) => sum + (collapsed.has(col.id) ? 40 : COLUMN_WIDTH), 0)
  const totalWidth = boardWidth

  // Zoom controls the number of months shown in the timeline (same total width)
  // zoom=1 → 6 months, zoom-out → more months, zoom-in → fewer months
  const monthCount = Math.max(2, Math.round(6 / zoom))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Kanban</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestão de conteúdo por etapas</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Export dropdown */}
          <div className="relative" ref={exportRef}>
            <Button variant="outline" size="sm" onClick={() => setExportOpen(v => !v)}>
              <Download className="w-4 h-4" />
              Exportar
            </Button>
            {exportOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-30 py-1 min-w-[180px]">
                {[
                  { label: 'Timeline — PDF', fn: exportTimelinePDF },
                  { label: 'Board — PNG', fn: exportBoardPNG },
                  { label: 'Board — PDF', fn: exportBoardPDF },
                  { label: 'Board — Excel (XLS)', fn: exportBoardXLS },
                  { label: 'Board — CSV', fn: exportBoardCSV },
                  { label: 'Board — Markdown', fn: exportBoardMarkdown },
                ].map(({ label, fn }) => (
                  <button
                    key={label}
                    onClick={() => { fn(); setExportOpen(false) }}
                    className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left transition-colors"
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} title="Zoom out">
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setZoom(z => Math.min(2, z + 0.25))} title="Zoom in">
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button size="sm" onClick={() => openNew()}>
            <Plus className="w-4 h-4" />
            Novo Card
          </Button>
        </div>
      </div>

      {/* Board wrapper (timeline + columns scroll together) */}
      <div className="overflow-x-auto rounded-xl border border-gray-200" ref={boardRef}>
        {/* Timeline */}
        <KanbanTimeline cards={[...allCards, ...pautasCards]} eventos={eventos} totalWidth={totalWidth} monthCount={monthCount} />

        {/* Divider between timeline and board */}
        <div className="border-t-4 border-gray-200 bg-gray-100 px-4 py-1.5 flex items-center gap-2">
          <span className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">Quadro</span>
        </div>

        {/* Columns */}
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-0 bg-gray-50" style={{ minWidth: totalWidth }}>
            {COLUMNS.map(col => {
              const isCollapsed = collapsed.has(col.id)
              const cards = cardsByColumn.get(col.id) ?? []
              return (
                <div
                  key={col.id}
                  className={cn('flex-shrink-0 border-r border-gray-200 last:border-r-0', isCollapsed ? 'w-10' : '')}
                  style={{ width: isCollapsed ? 40 : COLUMN_WIDTH }}
                >
                  {isCollapsed ? (
                    <div className="flex flex-col items-center py-4 h-full">
                      <button
                        onClick={() => toggleCollapse(col.id)}
                        className="p-1 text-gray-400 hover:text-gray-600 mb-2"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                      <span
                        className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest"
                        style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)' }}
                      >
                        {col.label} ({cards.length})
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col" style={{ minHeight: 400 }}>
                      {/* Column header */}
                      <div className={cn('px-3 py-2.5 border-b border-gray-200 flex items-center gap-2', col.color)}>
                        <button onClick={() => toggleCollapse(col.id)} className="text-gray-400 hover:text-gray-600">
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="font-semibold text-sm text-gray-700 flex-1">{col.label}</span>
                        <Badge variant="secondary" className="text-[10px] px-1.5">{cards.length}</Badge>
                        {col.id !== 'finalizado' && (
                          <button
                            onClick={() => openNew(col.id)}
                            className="text-gray-400 hover:text-purple-600 transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Cards */}
                      <Droppable droppableId={col.id} isDropDisabled={col.id === 'pautas'}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={cn(
                              'flex-1 p-2 space-y-2 overflow-y-auto',
                              snapshot.isDraggingOver && 'bg-purple-50',
                            )}
                            style={{ maxHeight: 600 }}
                          >
                            {cards.map((card, i) => (
                              <Draggable
                                key={card.id}
                                draggableId={card.id}
                                index={i}
                                isDragDisabled={col.id === 'finalizado'}
                              >
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={cn(snapshot.isDragging && 'shadow-xl rotate-1')}
                                  >
                                    <KanbanCardView
                                      card={card}
                                      onEdit={() => openEdit(card)}
                                      onQuickAttach={files => {
                                        if (card.pautaId) { toast({ title: 'Abra o card para anexar mídias' }); return }
                                        handleQuickAttach(card, files)
                                      }}
                                      onDownloadCard={fmt => handleDownloadCard(card, fmt)}
                                      isFromPautas={!!card.pautaId && col.id === 'pautas'}
                                    />
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </DragDropContext>
      </div>

      {/* Card dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editCard ? 'Editar Card' : 'Novo Card'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div className="space-y-1.5">
              <Label>Título</Label>
              <Input value={cardTitle} onChange={e => setCardTitle(e.target.value)} autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Coluna</Label>
                <Select value={editColumn} onValueChange={v => setEditColumn(v as KanbanColumn)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COLUMNS.filter(c => c.id !== 'finalizado').map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Prioridade</Label>
                <Select value={cardPriority} onValueChange={v => setCardPriority(v as KanbanPriority)}>
                  <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(PRIORITY_LABELS) as [KanbanPriority, string][]).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Plataformas</Label>
              <div className="flex flex-wrap gap-1.5">
                {PLATFORMS.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setCardPlatforms(prev =>
                      prev.includes(p.id) ? prev.filter(x => x !== p.id) : [...prev, p.id]
                    )}
                    className={cn(
                      'text-xs px-2 py-1 rounded-full border transition-all',
                      p.bgColor, p.textColor, p.borderColor,
                      cardPlatforms.includes(p.id) ? 'ring-2 ring-offset-1 ring-current' : 'opacity-50'
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <Input
                placeholder="Outra plataforma (opcional)"
                value={cardCustomPlatform}
                onChange={e => setCardCustomPlatform(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Responsável</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-gray-200 bg-white px-3 py-1 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                  value={cardAssignee}
                  onChange={e => setCardAssignee(e.target.value)}
                >
                  <option value="">Ninguém</option>
                  {projectMeta?.users.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Prazo</Label>
                <Input type="date" value={cardDueDate} onChange={e => setCardDueDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <MarkdownEditor
                value={cardDesc}
                onChange={setCardDesc}
                minHeight={120}
                projectUsers={projectMeta?.users ?? []}
                placeholder="Descreva o card… use @email para mencionar"
              />
            </div>

            {/* Attachments */}
            <div className="space-y-2">
              <Label>Imagens e Vídeos</Label>
              {/* Drop zone */}
              <div
                className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center cursor-pointer hover:border-purple-400 hover:bg-purple-50 transition-colors"
                onClick={() => dialogFileRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault()
                  if (e.dataTransfer.files.length) handleDialogAttach(e.dataTransfer.files)
                }}
              >
                <ImagePlus className="w-6 h-6 text-gray-300 mx-auto mb-1" />
                <p className="text-xs text-gray-400">
                  {attachUploading ? 'Enviando…' : 'Clique ou arraste imagens/vídeos aqui'}
                </p>
                <input
                  ref={dialogFileRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                  onChange={e => { if (e.target.files?.length) { handleDialogAttach(e.target.files); e.target.value = '' } }}
                />
              </div>
              {/* Existing attachments */}
              {cardAttachments.length > 0 && (
                <div className="space-y-1">
                  {cardAttachments.map(att => (
                    <div key={att.id} className="flex items-center gap-2 bg-gray-50 rounded px-3 py-1.5">
                      {att.thumbnail
                        ? <img src={att.thumbnail} alt={att.name} className="w-10 h-10 object-cover rounded flex-shrink-0 border border-gray-200" />
                        : <Paperclip className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      }
                      <span className="text-xs text-gray-700 flex-1 truncate">{att.name}</span>
                      <span className="text-[10px] text-gray-400 flex-shrink-0">
                        {att.size < 1024 * 1024 ? `${(att.size / 1024).toFixed(0)} KB` : `${(att.size / (1024 * 1024)).toFixed(1)} MB`}
                      </span>
                      <button
                        onClick={() => setCardAttachments(prev => prev.filter(a => a.id !== att.id))}
                        className="text-gray-300 hover:text-red-400 flex-shrink-0"
                        title="Remover"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Share button */}
            {editCard && editCard.platforms.length > 0 && shareUrl(editCard) && (
              <a
                href={shareUrl(editCard)!}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-purple-600 hover:text-purple-800"
              >
                <Share2 className="w-4 h-4" />
                Compartilhar em {getPlatform(editCard.platforms[0])?.label}
                <ExternalLink className="w-3 h-3" />
              </a>
            )}

            {/* Export */}
            {editCard && (
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={() => exportCardMd(editCard)}>
                  <FileText className="w-4 h-4 text-gray-500" /> Markdown
                </Button>
                <Button variant="outline" size="sm" onClick={() => exportCardDocx(editCard)}>
                  <FileType2 className="w-4 h-4 text-blue-500" /> Word (.docx)
                </Button>
                <Button variant="outline" size="sm" onClick={() => exportCardZip(editCard)}>
                  <FolderArchive className="w-4 h-4 text-amber-500" /> ZIP
                </Button>
              </div>
            )}
          </div>
          <DialogFooter>
            {editCard && (
              <Button variant="outline" className="text-red-500 mr-auto" onClick={handleDelete}>
                <X className="w-4 h-4" /> Remover
              </Button>
            )}
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !cardTitle.trim()}>
              {saving ? 'Salvando…' : editCard ? 'Atualizar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  )
}
