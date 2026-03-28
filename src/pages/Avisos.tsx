import { useState, useMemo, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd'
import { Plus, Download, CheckCircle2, ChevronDown, ChevronUp, X, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useProject } from '@/contexts/ProjectContext'
import { loadAvisos, saveAviso, deleteAviso } from '@/lib/storage'
import { sendMentionNotification } from '@/lib/emailjs'
import { extractMentions, generateId, formatDateTime } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { MarkdownEditor, MarkdownRenderer } from '@/components/shared/MarkdownEditor'
import { useToast } from '@/hooks/useToast'
import { ToastContainer } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import type { Aviso, AvisoPriority } from '@/types'

const PRIORITY_CONFIG: Record<AvisoPriority, {
  label: string
  color: string
  bgColor: string
  borderColor: string
  subtitle: string
}> = {
  critico:     { label: 'Crítico',     color: 'bg-red-500',    bgColor: 'bg-red-50',    borderColor: 'border-red-200',    subtitle: 'Alta iminência · Alto empenho' },
  estrutural:  { label: 'Estrutural',  color: 'bg-amber-500',  bgColor: 'bg-amber-50',  borderColor: 'border-amber-200',  subtitle: 'Baixa iminência · Alto empenho' },
  operacional: { label: 'Operacional', color: 'bg-blue-500',   bgColor: 'bg-blue-50',   borderColor: 'border-blue-200',   subtitle: 'Alta iminência · Baixo empenho' },
  residual:    { label: 'Residual',    color: 'bg-gray-400',   bgColor: 'bg-gray-50',   borderColor: 'border-gray-200',   subtitle: 'Baixa iminência · Baixo empenho' },
}

function getCardMinWidth(count: number): number {
  if (count <= 2) return 180
  if (count <= 4) return 150
  if (count <= 8) return 110
  if (count <= 12) return 90
  return 70
}

function AvisoCard({
  aviso,
  index,
  onDone,
  onClick,
}: {
  aviso: Aviso
  index: number
  onDone: (id: string) => void
  onClick: () => void
}) {
  const cfg = PRIORITY_CONFIG[aviso.priority]
  return (
    <Draggable draggableId={aviso.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={cn(
            'rounded-lg border p-3 cursor-pointer hover:shadow-md transition-all bg-white group',
            cfg.borderColor,
            snapshot.isDragging && 'shadow-lg ring-2 ring-purple-300 rotate-1'
          )}
          onClick={onClick}
        >
          <div className="flex items-start gap-2">
            <button
              type="button"
              title="Marcar como concluído"
              onClick={e => { e.stopPropagation(); onDone(aviso.id) }}
              className={cn(
                'flex-shrink-0 w-4 h-4 rounded-full border-2 mt-0.5 transition-all hover:opacity-70',
                cfg.color,
                'border-white'
              )}
            />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-gray-900 text-xs leading-tight truncate">{aviso.title}</p>
              {aviso.body && (
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-snug">{aviso.body.slice(0, 80)}</p>
              )}
              <p className="text-[10px] text-gray-400 mt-1">{aviso.author.split('@')[0]}</p>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  )
}

function Quadrant({
  priority,
  avisos,
  onDone,
  onCardClick,
}: {
  priority: AvisoPriority
  avisos: Aviso[]
  onDone: (id: string) => void
  onCardClick: (a: Aviso) => void
}) {
  const cfg = PRIORITY_CONFIG[priority]
  const minWidth = getCardMinWidth(avisos.length)

  return (
    <div className={cn('flex flex-col rounded-xl p-3 min-h-[200px] h-full', cfg.bgColor, 'border', cfg.borderColor)}>
      <div className="flex items-center gap-2 mb-3">
        <div className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', cfg.color)} />
        <div>
          <p className="font-semibold text-gray-800 text-sm leading-none">{cfg.label}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{cfg.subtitle}</p>
        </div>
        <span className="ml-auto text-xs text-gray-400 font-medium">{avisos.length}</span>
      </div>
      <Droppable droppableId={priority}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              'flex-1 grid gap-2 content-start rounded-lg transition-colors',
              snapshot.isDraggingOver && 'bg-white/60'
            )}
            style={{
              gridTemplateColumns: `repeat(auto-fill, minmax(${minWidth}px, 1fr))`,
            }}
          >
            {avisos.map((a, i) => (
              <AvisoCard key={a.id} aviso={a} index={i} onDone={onDone} onClick={() => onCardClick(a)} />
            ))}
            {avisos.length === 0 && !snapshot.isDraggingOver && (
              <p className="text-xs text-gray-300 italic col-span-full text-center py-4">Nenhum aviso</p>
            )}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  )
}

export function Avisos() {
  const { session } = useAuth()
  const { projectId, projectMeta } = useProject()
  const queryClient = useQueryClient()
  const { toasts, toast, dismiss } = useToast()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Aviso | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [priority, setPriority] = useState<AvisoPriority>('critico')
  const [saving, setSaving] = useState(false)
  const [showDone, setShowDone] = useState(false)
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

  const { data: avisos = [], isLoading } = useQuery({
    queryKey: ['avisos', projectId],
    queryFn: () => loadAvisos(projectId),
  })

  const activeAvisos = useMemo(() => avisos.filter(a => !a.done), [avisos])
  const doneAvisos = useMemo(() => avisos.filter(a => a.done), [avisos])

  const byPriority = useMemo(() => {
    const map: Record<AvisoPriority, Aviso[]> = {
      critico: [], estrutural: [], operacional: [], residual: [],
    }
    for (const a of activeAvisos) map[a.priority].push(a)
    return map
  }, [activeAvisos])

  async function handleDragEnd(result: DropResult) {
    if (!result.destination) return
    const sourcePriority = result.source.droppableId as AvisoPriority
    const destPriority = result.destination.droppableId as AvisoPriority
    if (sourcePriority === destPriority) return

    const aviso = byPriority[sourcePriority][result.source.index]
    if (!aviso) return

    const updated = { ...aviso, priority: destPriority, updatedAt: new Date().toISOString() }
    queryClient.setQueryData(['avisos', projectId], (prev: Aviso[] = []) =>
      prev.map(a => a.id === aviso.id ? updated : a)
    )
    try {
      await saveAviso(projectId, updated)
    } catch (err) {
      queryClient.setQueryData(['avisos', projectId], (prev: Aviso[] = []) =>
        prev.map(a => a.id === aviso.id ? aviso : a)
      )
      toast({ title: 'Erro ao mover aviso', description: String(err), variant: 'destructive' })
    }
  }

  function openNew() {
    setEditing(null)
    setTitle('')
    setBody('')
    setPriority('critico')
    setDialogOpen(true)
  }

  function openEdit(a: Aviso) {
    setEditing(a)
    setTitle(a.title)
    setBody(a.body)
    setPriority(a.priority)
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!title.trim()) return
    setSaving(true)
    try {
      const now = new Date().toISOString()
      const prevMentions = editing?.mentions ?? []
      const newMentions = extractMentions(body)
      const added = newMentions.filter(e => !prevMentions.includes(e) && e !== session?.email)

      const aviso: Aviso = editing
        ? { ...editing, title: title.trim(), body, priority, mentions: newMentions, updatedAt: now }
        : {
          id: generateId(),
          title: title.trim(),
          body,
          priority,
          author: session!.email,
          done: false,
          mentions: newMentions,
          attachments: [],
          createdAt: now,
          updatedAt: now,
        }

      await saveAviso(projectId, aviso)
      queryClient.setQueryData(['avisos', projectId], (prev: Aviso[] = []) =>
        editing ? prev.map(a => a.id === aviso.id ? aviso : a) : [...prev, aviso]
      )

      for (const email of added) {
        await sendMentionNotification({
          mentionerEmail: session!.email,
          mentionedEmail: email,
          projectName: projectMeta?.name ?? projectId,
          moduleName: 'Quadro de Avisos',
          excerpt: body.slice(0, 200),
        })
      }

      setDialogOpen(false)
      toast({ title: editing ? 'Aviso atualizado' : 'Aviso publicado' })
    } catch (err) {
      toast({ title: 'Erro ao salvar', description: String(err), variant: 'destructive' })
    }
    setSaving(false)
  }

  async function handleDone(id: string) {
    const aviso = avisos.find(a => a.id === id)
    if (!aviso) return
    const updated = { ...aviso, done: true, doneAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    await saveAviso(projectId, updated)
    queryClient.setQueryData(['avisos', projectId], (prev: Aviso[] = []) =>
      prev.map(a => a.id === id ? updated : a)
    )
  }

  async function handleDelete(id: string) {
    await deleteAviso(projectId, id)
    queryClient.setQueryData(['avisos', projectId], (prev: Aviso[] = []) => prev.filter(a => a.id !== id))
    setDialogOpen(false)
    toast({ title: 'Aviso removido' })
  }

  async function exportPNG() {
    const el = document.getElementById('avisos-matrix')
    if (!el) return
    try {
      const { captureToPng } = await import('@/lib/captureUtils')
      const dataUrl = await captureToPng(el as HTMLElement, '#f8f7ff')
      const link = document.createElement('a')
      link.download = 'avisos.png'
      link.href = dataUrl
      link.click()
    } catch (err) {
      toast({ title: 'Erro ao exportar PNG', description: String(err), variant: 'destructive' })
    }
  }

  async function exportPDF() {
    const el = document.getElementById('avisos-matrix')
    if (!el) return
    try {
      const { captureToPng } = await import('@/lib/captureUtils')
      const { jsPDF } = await import('jspdf')
      const imgData = await captureToPng(el as HTMLElement, '#ffffff')
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
      pdf.save('avisos.pdf')
    } catch (err) {
      toast({ title: 'Erro ao exportar PDF', description: String(err), variant: 'destructive' })
    }
  }

  async function exportXLS() {
    try {
      const { utils, writeFile } = await import('xlsx')
      const rows: unknown[][] = [['Quadrante', 'Título', 'Descrição', 'Autor', 'Data']]
      for (const [p, label] of [
        ['critico', 'Crítico'],
        ['estrutural', 'Estrutural'],
        ['operacional', 'Operacional'],
        ['residual', 'Residual'],
      ] as [AvisoPriority, string][]) {
        for (const a of byPriority[p]) {
          rows.push([label, a.title, a.body ?? '', a.author, a.createdAt])
        }
      }
      const ws = utils.aoa_to_sheet(rows)
      const wb = utils.book_new()
      utils.book_append_sheet(wb, ws, 'Avisos')
      writeFile(wb, 'avisos.xlsx')
    } catch (err) {
      toast({ title: 'Erro ao exportar XLS', description: String(err), variant: 'destructive' })
    }
  }

  function exportMarkdown() {
    const lines = ['# Quadro de Avisos\n']
    for (const [p, label] of [
      ['critico', 'Crítico'],
      ['estrutural', 'Estrutural'],
      ['operacional', 'Operacional'],
      ['residual', 'Residual'],
    ] as [AvisoPriority, string][]) {
      lines.push(`## ${label}`)
      for (const a of byPriority[p]) {
        lines.push(`### ${a.title}`)
        if (a.body) lines.push(a.body)
        lines.push(`*${a.author} — ${formatDateTime(a.createdAt)}*\n`)
      }
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'avisos.md'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Quadro de Avisos</h1>
          <p className="text-sm text-gray-500 mt-0.5">Organize por iminência e empenho</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Export dropdown */}
          <div className="relative" ref={exportRef}>
            <Button variant="outline" size="sm" onClick={() => setExportOpen(v => !v)}>
              <Download className="w-4 h-4" />
              Exportar
            </Button>
            {exportOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-30 py-1 min-w-[150px]">
                {[
                  { label: 'PNG (imagem)', fn: exportPNG },
                  { label: 'PDF', fn: exportPDF },
                  { label: 'Excel (XLS)', fn: exportXLS },
                  { label: 'Markdown', fn: exportMarkdown },
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
          <Button size="sm" onClick={openNew}>
            <Plus className="w-4 h-4" />
            Novo Aviso
          </Button>
        </div>
      </div>

      {/* Eisenhower Matrix */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div id="avisos-matrix" className="bg-amber-50/40 rounded-2xl p-5 border border-amber-100">
          {/* Top axis label: Alto Empenho */}
          <div className="flex justify-center mb-4">
            <div className="flex items-center gap-1.5 bg-amber-100 text-amber-800 text-xs font-bold px-4 py-1.5 rounded-full select-none">
              <ArrowUp className="w-3.5 h-3.5" />
              Alto Empenho
            </div>
          </div>

          <div className="flex items-stretch gap-3">
            {/* Left axis label: Baixa Iminência */}
            <div className="flex items-center justify-center flex-shrink-0 select-none">
              <div className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-2 rounded-full flex flex-col items-center gap-1.5">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>Baixa Iminência</span>
              </div>
            </div>

            {/* 3×3 grid: quadrants + axis lines */}
            <div
              className="flex-1"
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 4px 1fr',
                gridTemplateRows: '1fr 4px 1fr',
                gap: 0,
              }}
            >
              {/* TL: Estrutural (Baixa Iminência + Alto Empenho) */}
              <div style={{ padding: '0 8px 8px 0' }}>
                <Quadrant priority="estrutural" avisos={byPriority.estrutural} onDone={handleDone} onCardClick={openEdit} />
              </div>

              {/* Vertical axis — top segment */}
              <div className="bg-amber-300 rounded-t-full" />

              {/* TR: Crítico (Alta Iminência + Alto Empenho) */}
              <div style={{ padding: '0 0 8px 8px' }}>
                <Quadrant priority="critico" avisos={byPriority.critico} onDone={handleDone} onCardClick={openEdit} />
              </div>

              {/* Horizontal axis — left segment */}
              <div className="bg-amber-300 rounded-l-full" />

              {/* Center intersection */}
              <div className="bg-amber-400 rounded-full z-10" style={{ margin: '-1px' }} />

              {/* Horizontal axis — right segment */}
              <div className="bg-amber-300 rounded-r-full" />

              {/* BL: Residual (Baixa Iminência + Baixo Empenho) */}
              <div style={{ padding: '8px 8px 0 0' }}>
                <Quadrant priority="residual" avisos={byPriority.residual} onDone={handleDone} onCardClick={openEdit} />
              </div>

              {/* Vertical axis — bottom segment */}
              <div className="bg-amber-300 rounded-b-full" />

              {/* BR: Operacional (Alta Iminência + Baixo Empenho) */}
              <div style={{ padding: '8px 0 0 8px' }}>
                <Quadrant priority="operacional" avisos={byPriority.operacional} onDone={handleDone} onCardClick={openEdit} />
              </div>
            </div>

            {/* Right axis label: Alta Iminência */}
            <div className="flex items-center justify-center flex-shrink-0 select-none">
              <div className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-2 rounded-full flex flex-col items-center gap-1.5">
                <span style={{ writingMode: 'vertical-rl' }}>Alta Iminência</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {/* Bottom axis label: Baixo Empenho */}
          <div className="flex justify-center mt-4">
            <div className="flex items-center gap-1.5 bg-amber-100 text-amber-800 text-xs font-bold px-4 py-1.5 rounded-full select-none">
              Baixo Empenho
              <ArrowDown className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </DragDropContext>

      {/* Concluídos */}
      {doneAvisos.length > 0 && (
        <div className="border border-gray-100 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowDone(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              Concluídos ({doneAvisos.length})
            </div>
            {showDone ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showDone && (
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 border-t border-gray-100 bg-gray-50">
              {doneAvisos.map(a => (
                <div key={a.id} className="bg-white rounded-lg border border-gray-100 p-3 opacity-60">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="font-medium text-gray-700 text-sm line-through truncate">{a.title}</p>
                      <p className="text-xs text-gray-400">{a.author.split('@')[0]}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Aviso' : 'Novo Aviso'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Título</Label>
              <Input
                placeholder="Título do aviso"
                value={title}
                onChange={e => setTitle(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>Prioridade</Label>
              <Select value={priority} onValueChange={v => setPriority(v as AvisoPriority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(PRIORITY_CONFIG) as [AvisoPriority, typeof PRIORITY_CONFIG.critico][]).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      <div className="flex items-center gap-2">
                        <div className={cn('w-2 h-2 rounded-full', v.color)} />
                        {v.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <MarkdownEditor
                value={body}
                onChange={setBody}
                placeholder="Descreva o aviso… use @email para mencionar colaboradores"
                minHeight={150}
                projectUsers={projectMeta?.users ?? []}
              />
            </div>
          </div>
          <DialogFooter>
            {editing && (
              <Button
                variant="outline"
                className="text-red-500 hover:text-red-700 mr-auto"
                onClick={() => handleDelete(editing.id)}
              >
                <X className="w-4 h-4" />
                Remover
              </Button>
            )}
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !title.trim()}>
              {saving ? 'Salvando…' : editing ? 'Atualizar' : 'Publicar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  )
}

export function AvisoPreview({ aviso }: { aviso: Aviso }) {
  const cfg = PRIORITY_CONFIG[aviso.priority]
  return (
    <div className={cn('rounded-lg border p-3', cfg.bgColor, cfg.borderColor)}>
      <div className="flex items-center gap-2 mb-1">
        <div className={cn('w-2 h-2 rounded-full', cfg.color)} />
        <span className="font-semibold text-sm text-gray-900">{aviso.title}</span>
      </div>
      {aviso.body && <MarkdownRenderer content={aviso.body.slice(0, 150)} />}
    </div>
  )
}
