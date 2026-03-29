import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Pencil, ChevronUp, ChevronDown, X,
  ChevronRight, User, Calendar, Tag, Paperclip,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useProject } from '@/contexts/ProjectContext'
import { loadConteudos, saveConteudos, saveKanbanCard, deleteKanbanCard } from '@/lib/storage'
import { sendMentionNotification } from '@/lib/emailjs'
import { generateId, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { MarkdownEditor } from '@/components/shared/MarkdownEditor'
import { useToast } from '@/hooks/useToast'
import { ToastContainer } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import type { ConteudoData, ConteudoItem, ConteudoProgresso, ConteudoImportancia, KanbanCard } from '@/types'

// ─── Constants ────────────────────────────────────────────────────────────

const PROGRESSO_CYCLE: ConteudoProgresso[] = [
  'na-fila', 'em-producao', 'em-revisao', 'aguardando-aprovacao', 'atrasado', 'pronto',
]

const PROGRESSO_LABELS: Record<ConteudoProgresso, string> = {
  'na-fila': 'Aguardando na Fila',
  'em-producao': 'Em Produção',
  'em-revisao': 'Em Revisão',
  'aguardando-aprovacao': 'Aguardando Aprovação',
  'atrasado': 'Atrasado',
  'pronto': 'Pronto',
}

const PROGRESSO_CLASSES: Record<ConteudoProgresso, string> = {
  'na-fila': 'bg-gray-100 text-gray-600',
  'em-producao': 'bg-blue-100 text-blue-700',
  'em-revisao': 'bg-amber-100 text-amber-700',
  'aguardando-aprovacao': 'bg-orange-100 text-orange-700',
  'atrasado': 'bg-red-100 text-red-700',
  'pronto': 'bg-green-100 text-green-700',
}

const IMPORTANCIA_CYCLE: ConteudoImportancia[] = ['baixa', 'media', 'alta', 'urgente']
const IMPORTANCIA_LABELS: Record<ConteudoImportancia, string> = {
  baixa: 'Baixa', media: 'Média', alta: 'Alta', urgente: 'Urgente',
}
const IMPORTANCIA_CLASSES: Record<ConteudoImportancia, string> = {
  baixa: 'bg-gray-100 text-gray-500',
  media: 'bg-yellow-100 text-yellow-700',
  alta: 'bg-orange-100 text-orange-700',
  urgente: 'bg-red-100 text-red-700',
}

type SortCol = 'descricao' | 'atribuicao' | 'prazo' | 'tipo' | 'importancia' | 'progresso' | 'createdAt'

// ─── Avatar chip ──────────────────────────────────────────────────────────

function UserChip({ email, onClear }: { email: string; onClear?: () => void }) {
  const colors = ['bg-violet-200 text-violet-800', 'bg-blue-200 text-blue-800', 'bg-green-200 text-green-800', 'bg-amber-200 text-amber-800', 'bg-pink-200 text-pink-800']
  const idx = email.charCodeAt(0) % colors.length
  const initials = email.slice(0, 2).toUpperCase()
  return (
    <span className="inline-flex items-center gap-1">
      <span className={cn('w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0', colors[idx])}>
        {initials}
      </span>
      <span className="text-xs text-gray-700 truncate max-w-[90px]">{email.split('@')[0]}</span>
      {onClear && (
        <button onClick={onClear} className="text-gray-300 hover:text-red-400 flex-shrink-0">
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  )
}

// ─── User picker popover (portal-based to avoid table overflow clipping) ──

function UserPicker({
  users, value, onChange, placeholder = 'Indefinido',
}: {
  users: string[]; value?: string; onChange: (v: string | undefined) => void; placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [pos, setPos] = useState({ top: 0, left: 0, width: 220 })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  const updatePos = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    setPos({
      top: rect.bottom + window.scrollY + 4,
      left: rect.left + window.scrollX,
      width: Math.max(220, rect.width),
    })
  }, [])

  useEffect(() => {
    if (!open) return
    updatePos()
    const handleClose = (e: MouseEvent) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target as Node) &&
        dropRef.current && !dropRef.current.contains(e.target as Node)
      ) setOpen(false)
    }
    const handleScroll = () => updatePos()
    document.addEventListener('mousedown', handleClose)
    window.addEventListener('scroll', handleScroll, true)
    return () => {
      document.removeEventListener('mousedown', handleClose)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [open, updatePos])

  const filtered = users.filter(u =>
    !query.trim() || u.toLowerCase().includes(query.replace('@', '').toLowerCase())
  )

  const dropdown = open ? createPortal(
    <div
      ref={dropRef}
      style={{ position: 'absolute', top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
      className="bg-white border border-gray-200 rounded-lg shadow-xl"
    >
      <div className="p-2 border-b border-gray-100">
        <input
          autoFocus
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="@usuário..."
          className="w-full text-xs outline-none placeholder:text-gray-300"
        />
      </div>
      <div className="max-h-48 overflow-y-auto py-1">
        <button
          onMouseDown={e => e.preventDefault()}
          onClick={() => { onChange(undefined); setOpen(false); setQuery('') }}
          className="w-full px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-50 text-left"
        >
          Indefinido
        </button>
        {filtered.length === 0 && (
          <p className="px-3 py-1.5 text-xs text-gray-400">Nenhum usuário encontrado</p>
        )}
        {filtered.map(u => (
          <button
            key={u}
            onMouseDown={e => e.preventDefault()}
            onClick={() => { onChange(u); setOpen(false); setQuery('') }}
            className="w-full px-3 py-1.5 text-xs hover:bg-violet-50 text-left flex items-center gap-2"
          >
            <UserChip email={u} />
          </button>
        ))}
      </div>
    </div>,
    document.body
  ) : null

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        onClick={() => { setOpen(v => !v); setQuery('') }}
        className="flex items-center gap-1 text-xs min-w-0"
      >
        {value
          ? <UserChip email={value} />
          : <span className="text-gray-400 flex items-center gap-1"><User className="w-3 h-3" />{placeholder}</span>
        }
      </button>
      {dropdown}
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────

export function Conteudos() {
  const { session } = useAuth()
  const { projectId, projectMeta } = useProject()
  const queryClient = useQueryClient()
  const { toasts, toast, dismiss } = useToast()

  const users = projectMeta?.users ?? []

  const [sortCol, setSortCol] = useState<SortCol>('createdAt')
  const [sortAsc, setSortAsc] = useState(true)
  const [showDone, setShowDone] = useState(false)

  // Inline edit cell
  const [editingCell, setEditingCell] = useState<{ id: string; col: string } | null>(null)
  const [cellValue, setCellValue] = useState('')

  // Markdown dialog
  const [mdDialogItem, setMdDialogItem] = useState<ConteudoItem | null>(null)
  const [mdBody, setMdBody] = useState('')
  const [savingMd, setSavingMd] = useState(false)

  // New row
  const [addingNew, setAddingNew] = useState(false)
  const [newDescricao, setNewDescricao] = useState('')

  // Tipos manager
  const [tiposDialog, setTiposDialog] = useState(false)
  const [newTipo, setNewTipo] = useState('')

  const { data: conteudoData, isLoading } = useQuery({
    queryKey: ['conteudos', projectId],
    queryFn: () => loadConteudos(projectId),
  })

  const data: ConteudoData = conteudoData ?? { items: [], tipos: [] }

  async function saveData(newData: ConteudoData) {
    await saveConteudos(projectId, newData)
    queryClient.setQueryData(['conteudos', projectId], newData)
  }

  // Sort + split done/active
  const { activeItems, doneItems } = useMemo(() => {
    const sorted = [...data.items].sort((a, b) => {
      let va: string = '', vb: string = ''
      switch (sortCol) {
        case 'descricao': va = a.descricao; vb = b.descricao; break
        case 'atribuicao': va = a.atribuicao ?? ''; vb = b.atribuicao ?? ''; break
        case 'prazo': va = a.prazo ?? ''; vb = b.prazo ?? ''; break
        case 'tipo': va = a.tipo ?? ''; vb = b.tipo ?? ''; break
        case 'importancia': va = String(IMPORTANCIA_CYCLE.indexOf(a.importancia)); vb = String(IMPORTANCIA_CYCLE.indexOf(b.importancia)); break
        case 'progresso': va = String(PROGRESSO_CYCLE.indexOf(a.progresso)); vb = String(PROGRESSO_CYCLE.indexOf(b.progresso)); break
        case 'createdAt': va = a.createdAt; vb = b.createdAt; break
      }
      return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va)
    })
    return {
      activeItems: sorted.filter(i => i.progresso !== 'pronto'),
      doneItems: sorted.filter(i => i.progresso === 'pronto'),
    }
  }, [data.items, sortCol, sortAsc])

  function handleSort(col: SortCol) {
    if (sortCol === col) setSortAsc(v => !v)
    else { setSortCol(col); setSortAsc(true) }
  }

  // Cycle progresso
  async function cycleProgresso(item: ConteudoItem) {
    const idx = PROGRESSO_CYCLE.indexOf(item.progresso)
    const next = PROGRESSO_CYCLE[(idx + 1) % PROGRESSO_CYCLE.length]
    const now = new Date().toISOString()

    // If leaving 'pronto' and a Kanban card exists, remove it to avoid duplicates
    if (item.progresso === 'pronto' && item.kanbanCardId) {
      try {
        await deleteKanbanCard(projectId, item.kanbanCardId)
        queryClient.setQueryData(['kanban', projectId], (prev: KanbanCard[] = []) =>
          prev.filter(c => c.id !== item.kanbanCardId)
        )
        toast({ title: 'Card removido do Kanban' })
      } catch {
        // Card may already not exist; continue regardless
      }
    }

    const updated: ConteudoItem = {
      ...item,
      progresso: next,
      kanbanCardId: item.progresso === 'pronto' ? undefined : item.kanbanCardId,
      updatedAt: now,
    }
    const newItems = data.items.map(i => i.id === item.id ? updated : i)
    await saveData({ ...data, items: newItems })

    if (next === 'pronto') {
      // Transfer to Kanban
      try {
        const card: KanbanCard = {
          id: generateId(),
          title: item.descricao,
          description: item.body ?? '',
          column: 'planejamento',
          order: Date.now(),
          platforms: [],
          assignee: item.atribuicao,
          dueDate: item.prazo,
          attachments: [],
          log: [],
          mentions: [],
          conteudoId: item.id,
          createdAt: now,
          updatedAt: now,
        }
        await saveKanbanCard(projectId, card)
        // Save kanbanCardId back
        const withCardId = newItems.map(i => i.id === item.id ? { ...updated, kanbanCardId: card.id } : i)
        await saveData({ ...data, items: withCardId })
        queryClient.invalidateQueries({ queryKey: ['kanban', projectId] })
        toast({ title: 'Conteúdo enviado para o Kanban (Planejamento)' })
      } catch (err) {
        toast({ title: 'Erro ao criar card no Kanban', description: String(err), variant: 'destructive' })
      }
    }
  }

  // Cycle importancia
  async function cycleImportancia(item: ConteudoItem) {
    const idx = IMPORTANCIA_CYCLE.indexOf(item.importancia)
    const next = IMPORTANCIA_CYCLE[(idx + 1) % IMPORTANCIA_CYCLE.length]
    const updated = { ...item, importancia: next, updatedAt: new Date().toISOString() }
    await saveData({ ...data, items: data.items.map(i => i.id === item.id ? updated : i) })
  }

  // Update field helper
  async function updateField(item: ConteudoItem, patch: Partial<ConteudoItem>, notifyEmail?: string) {
    const updated: ConteudoItem = { ...item, ...patch, updatedAt: new Date().toISOString() }
    await saveData({ ...data, items: data.items.map(i => i.id === item.id ? updated : i) })
    if (notifyEmail && notifyEmail !== session?.email) {
      await sendMentionNotification({
        mentionerEmail: session!.email,
        mentionedEmail: notifyEmail,
        projectName: projectMeta?.name ?? projectId,
        moduleName: 'Conteúdos',
        excerpt: item.descricao.slice(0, 100),
      })
    }
  }

  // Inline cell edit
  function startEdit(item: ConteudoItem, col: string, val: string) {
    setEditingCell({ id: item.id, col })
    setCellValue(val)
  }

  async function commitEdit(item: ConteudoItem, col: string) {
    if (!editingCell || editingCell.id !== item.id || editingCell.col !== col) return
    setEditingCell(null)
    if (col === 'descricao' && cellValue.trim()) {
      await updateField(item, { descricao: cellValue.trim() })
    }
  }

  // New row
  async function handleAddNew() {
    if (!newDescricao.trim()) { setAddingNew(false); return }
    const now = new Date().toISOString()
    const newItem: ConteudoItem = {
      id: generateId(),
      descricao: newDescricao.trim(),
      importancia: 'baixa',
      progresso: 'na-fila',
      order: data.items.length,
      createdAt: now,
      updatedAt: now,
    }
    await saveData({ ...data, items: [...data.items, newItem] })
    setNewDescricao('')
    setAddingNew(false)
    toast({ title: 'Conteúdo adicionado' })
  }

  // Markdown editor dialog
  function openMdDialog(item: ConteudoItem) {
    setMdDialogItem(item)
    setMdBody(item.body ?? '')
  }

  async function saveMd() {
    if (!mdDialogItem) return
    setSavingMd(true)
    try {
      await updateField(mdDialogItem, { body: mdBody })
      setMdDialogItem(null)
      toast({ title: 'Texto salvo' })
    } catch (err) {
      toast({ title: 'Erro', description: String(err), variant: 'destructive' })
    }
    setSavingMd(false)
  }

  // Delete item
  async function handleDelete(id: string) {
    await saveData({ ...data, items: data.items.filter(i => i.id !== id) })
  }

  // Tipos manager
  async function addTipo() {
    if (!newTipo.trim() || data.tipos.includes(newTipo.trim())) return
    await saveData({ ...data, tipos: [...data.tipos, newTipo.trim()] })
    setNewTipo('')
  }

  async function removeTipo(t: string) {
    await saveData({ ...data, tipos: data.tipos.filter(x => x !== t) })
  }

  // Sort icon helper
  function SortIcon({ col }: { col: SortCol }) {
    if (sortCol !== col) return <ChevronRight className="w-3 h-3 text-gray-300 rotate-90" />
    return sortAsc ? <ChevronUp className="w-3 h-3 text-violet-500" /> : <ChevronDown className="w-3 h-3 text-violet-500" />
  }

  function renderRow(item: ConteudoItem) {
    const isEditingDesc = editingCell?.id === item.id && editingCell.col === 'descricao'

    return (
      <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50 group">
        {/* Descrição */}
        <td className="px-3 py-2 min-w-[180px] max-w-[260px]">
          <div className="flex items-center gap-1">
            {isEditingDesc ? (
              <input
                autoFocus
                value={cellValue}
                onChange={e => setCellValue(e.target.value)}
                onBlur={() => commitEdit(item, 'descricao')}
                onKeyDown={e => { if (e.key === 'Enter') commitEdit(item, 'descricao'); if (e.key === 'Escape') setEditingCell(null) }}
                className="flex-1 text-sm text-gray-900 border-b border-violet-400 outline-none bg-transparent py-0.5"
              />
            ) : (
              <span
                className="flex-1 text-sm text-gray-900 cursor-text truncate"
                onClick={() => startEdit(item, 'descricao', item.descricao)}
                title={item.descricao}
              >
                {item.descricao}
              </span>
            )}
            <button
              onClick={() => openMdDialog(item)}
              className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-violet-500 flex-shrink-0 transition-opacity"
              title="Editar texto completo (Markdown)"
            >
              <Pencil className="w-3 h-3" />
            </button>
            {item.body && (
              <span title="Tem texto adicional">
                <Paperclip className="w-3 h-3 text-gray-300 flex-shrink-0" />
              </span>
            )}
          </div>
        </td>

        {/* Atribuição */}
        <td className="px-3 py-2 min-w-[130px]">
          <UserPicker
            users={users}
            value={item.atribuicao}
            onChange={v => updateField(item, { atribuicao: v }, v)}
          />
        </td>

        {/* Prazo */}
        <td className="px-3 py-2 min-w-[110px]">
          <div className="flex items-center gap-1">
            {item.prazo ? (
              <span className="flex items-center gap-1 text-xs text-gray-600">
                <Calendar className="w-3 h-3 text-gray-400" />
                {formatDate(item.prazo)}
                <button onClick={() => updateField(item, { prazo: undefined })} className="text-gray-300 hover:text-red-400">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ) : (
              <input
                type="date"
                value=""
                onChange={e => { if (e.target.value) updateField(item, { prazo: e.target.value }) }}
                className="text-xs text-gray-400 border-0 outline-none cursor-pointer bg-transparent w-full"
                title="Definir prazo"
              />
            )}
          </div>
        </td>

        {/* Tipo */}
        <td className="px-3 py-2 min-w-[100px]">
          <select
            value={item.tipo ?? ''}
            onChange={e => updateField(item, { tipo: e.target.value || undefined })}
            className="text-xs text-gray-600 border-0 outline-none bg-transparent cursor-pointer w-full"
          >
            <option value="">Indefinido</option>
            {data.tipos.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </td>

        {/* Importância */}
        <td className="px-3 py-2">
          <button
            onClick={() => cycleImportancia(item)}
            className={cn('text-[11px] px-2 py-0.5 rounded-full font-medium cursor-pointer select-none whitespace-nowrap', IMPORTANCIA_CLASSES[item.importancia])}
            title="Clique para alterar"
          >
            {IMPORTANCIA_LABELS[item.importancia]}
          </button>
        </td>

        {/* Dependência */}
        <td className="px-3 py-2 min-w-[130px]">
          <UserPicker
            users={users}
            value={item.dependencia}
            onChange={v => updateField(item, { dependencia: v }, v)}
            placeholder="Indefinido"
          />
        </td>

        {/* Progresso */}
        <td className="px-3 py-2">
          <button
            onClick={() => cycleProgresso(item)}
            className={cn('text-[11px] px-2 py-0.5 rounded-full font-medium cursor-pointer select-none whitespace-nowrap', PROGRESSO_CLASSES[item.progresso])}
            title="Clique para avançar o progresso"
          >
            {PROGRESSO_LABELS[item.progresso]}
          </button>
        </td>

        {/* Criado em */}
        <td className="px-3 py-2 text-xs text-gray-400 whitespace-nowrap">
          {formatDate(item.createdAt.slice(0, 10))}
        </td>

        {/* Ações */}
        <td className="px-2 py-2">
          <button
            onClick={() => handleDelete(item.id)}
            className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-opacity"
            title="Remover"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </td>
      </tr>
    )
  }

  if (isLoading) {
    return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" /></div>
  }

  const colHeaders: { col: SortCol | null; label: string }[] = [
    { col: 'descricao', label: 'Descrição' },
    { col: 'atribuicao', label: 'Atribuição' },
    { col: 'prazo', label: 'Prazo' },
    { col: 'tipo', label: 'Tipo' },
    { col: 'importancia', label: 'Importância' },
    { col: null, label: 'Dependência' },
    { col: 'progresso', label: 'Progresso' },
    { col: 'createdAt', label: 'Criado em' },
  ]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Conteúdos</h1>
          <p className="text-sm text-gray-500 mt-0.5">Em Produção · {activeItems.length} ativo{activeItems.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setTiposDialog(true)}>
            <Tag className="w-4 h-4" />
            Gerenciar Tipos
          </Button>
          <Button size="sm" onClick={() => { setAddingNew(true); setNewDescricao('') }}>
            <Plus className="w-4 h-4" />
            Novo Conteúdo
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              {colHeaders.map(({ col, label }) => (
                <th
                  key={label}
                  onClick={() => col && handleSort(col)}
                  className={cn('px-3 py-2.5 text-left text-xs font-semibold text-gray-500 select-none whitespace-nowrap', col ? 'cursor-pointer hover:text-gray-900' : '')}
                >
                  <span className="flex items-center gap-1">
                    {label}
                    {col && <SortIcon col={col} />}
                  </span>
                </th>
              ))}
              <th className="px-2 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {activeItems.map(item => renderRow(item))}

            {/* New row */}
            {addingNew && (
              <tr className="border-b border-gray-50 bg-violet-50/30">
                <td className="px-3 py-2" colSpan={9}>
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      value={newDescricao}
                      onChange={e => setNewDescricao(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleAddNew(); if (e.key === 'Escape') setAddingNew(false) }}
                      placeholder="Descrição do novo conteúdo…"
                      className="flex-1 text-sm outline-none bg-transparent border-b border-violet-400 py-0.5"
                    />
                    <button onClick={handleAddNew} className="text-xs text-violet-600 font-medium hover:text-violet-800">Adicionar</button>
                    <button onClick={() => setAddingNew(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            )}

            {activeItems.length === 0 && !addingNew && (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-sm text-gray-400">
                  Nenhum conteúdo em produção. Clique em <strong>Novo Conteúdo</strong> ou encaminhe uma pauta.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Done section */}
      {doneItems.length > 0 && (
        <div>
          <button
            onClick={() => setShowDone(v => !v)}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition-colors mb-2"
          >
            {showDone ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {showDone ? 'Ocultar' : 'Mostrar'} concluídos ({doneItems.length})
          </button>
          {showDone && (
            <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white/50 shadow-sm opacity-70">
              <table className="w-full text-sm">
                <tbody>
                  {doneItems.map(item => renderRow(item))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Markdown editor dialog */}
      <Dialog open={!!mdDialogItem} onOpenChange={open => { if (!open) setMdDialogItem(null) }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">Editar texto — {mdDialogItem?.descricao}</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <MarkdownEditor
              value={mdBody}
              onChange={setMdBody}
              projectUsers={users}
              placeholder="Texto completo do conteúdo…"
              minHeight={200}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMdDialogItem(null)}>Cancelar</Button>
            <Button onClick={saveMd} disabled={savingMd}>
              {savingMd ? 'Salvando…' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tipos manager dialog */}
      <Dialog open={tiposDialog} onOpenChange={setTiposDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Gerenciar Tipos</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex gap-2">
              <Input
                value={newTipo}
                onChange={e => setNewTipo(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addTipo() }}
                placeholder="Ex: Artigo, Resenha…"
                className="flex-1 h-8 text-sm"
              />
              <Button size="sm" onClick={addTipo} disabled={!newTipo.trim()}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {data.tipos.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-2">Nenhum tipo definido ainda.</p>
            )}
            <div className="space-y-1">
              {data.tipos.map(t => (
                <div key={t} className="flex items-center justify-between px-3 py-1.5 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-700 flex items-center gap-2">
                    <Tag className="w-3.5 h-3.5 text-gray-400" />
                    {t}
                  </span>
                  <button onClick={() => removeTipo(t)} className="text-gray-300 hover:text-red-400">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTiposDialog(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  )
}
