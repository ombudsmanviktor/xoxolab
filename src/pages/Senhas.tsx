import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Eye, EyeOff, X, KeyRound, ChevronDown, ChevronRight } from 'lucide-react'
import { useProject } from '@/contexts/ProjectContext'
import { loadSenhas, saveSenhas } from '@/lib/storage'
import { PLATFORMS, getPlatform } from '@/lib/platforms'
import { generateId } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/hooks/useToast'
import { ToastContainer } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import type { SenhaRow } from '@/types'

export function Senhas() {
  const { projectId } = useProject()
  const queryClient = useQueryClient()
  const { toasts, toast, dismiss } = useToast()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editSenha, setEditSenha] = useState<SenhaRow | null>(null)
  const [parentId, setParentId] = useState<string | undefined>(undefined)
  const [sService, setSService] = useState('')
  const [sUrl, setSUrl] = useState('')
  const [sLogin, setSLogin] = useState('')
  const [sPassword, setSPassword] = useState('')
  const [sNotes, setSNotes] = useState('')
  const [sPlatformId, setSPlatformId] = useState('none')
  const [saving, setSaving] = useState(false)
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set())
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const { data: senhas = [], isLoading } = useQuery({
    queryKey: ['senhas', projectId],
    queryFn: () => loadSenhas(projectId),
  })

  // Separate top-level rows and children
  const topLevel = senhas.filter(s => !s.children?.length || true).filter(s => !senhas.some(p => p.children?.some(c => c.id === s.id)))

  async function saveAll(rows: SenhaRow[]) {
    await saveSenhas(projectId, rows)
    queryClient.setQueryData(['senhas', projectId], rows)
  }

  function openNew(parent?: SenhaRow) {
    setEditSenha(null); setParentId(parent?.id)
    setSService(''); setSUrl(''); setSLogin(''); setSPassword(''); setSNotes(''); setSPlatformId('none')
    setDialogOpen(true)
  }

  function openEdit(s: SenhaRow) {
    setEditSenha(s); setParentId(undefined)
    setSService(s.service); setSUrl(s.url ?? ''); setSLogin(s.login); setSPassword(s.password); setSNotes(s.notes ?? ''); setSPlatformId(s.platformId ?? 'none')
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!sService.trim() || !sLogin.trim()) return
    setSaving(true)
    try {
      const row: SenhaRow = editSenha
        ? { ...editSenha, service: sService.trim(), url: sUrl || undefined, login: sLogin.trim(), password: sPassword, notes: sNotes || undefined, platformId: sPlatformId !== 'none' ? sPlatformId : undefined }
        : { id: generateId(), service: sService.trim(), url: sUrl || undefined, login: sLogin.trim(), password: sPassword, notes: sNotes || undefined, platformId: sPlatformId !== 'none' ? sPlatformId : undefined, order: senhas.length }

      let newRows: SenhaRow[]
      if (editSenha) {
        // Update in-place (could be nested)
        newRows = senhas.map(s => {
          if (s.id === row.id) return row
          if (s.children) return { ...s, children: s.children.map(c => c.id === row.id ? row : c) }
          return s
        })
      } else if (parentId) {
        newRows = senhas.map(s => {
          if (s.id === parentId) return { ...s, children: [...(s.children ?? []), row] }
          return s
        })
      } else {
        newRows = [...senhas, row]
      }

      await saveAll(newRows)
      setDialogOpen(false)
      toast({ title: editSenha ? 'Senha atualizada' : 'Senha adicionada' })
    } catch (err) {
      toast({ title: 'Erro', description: String(err), variant: 'destructive' })
    }
    setSaving(false)
  }

  async function handleDelete() {
    if (!editSenha) return
    const newRows = senhas
      .filter(s => s.id !== editSenha.id)
      .map(s => ({ ...s, children: s.children?.filter(c => c.id !== editSenha.id) }))
    await saveAll(newRows)
    setDialogOpen(false)
    toast({ title: 'Removido' })
  }

  function togglePassword(id: string) {
    setVisiblePasswords(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function renderRow(row: SenhaRow, depth = 0) {
    const platform = getPlatform(row.platformId ?? '')
    const isExpanded = expandedRows.has(row.id)
    const hasChildren = (row.children?.length ?? 0) > 0
    const showPass = visiblePasswords.has(row.id)

    return (
      <div key={row.id}>
        <div
          className={cn(
            'flex items-center gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50 group transition-colors',
            depth > 0 && 'pl-10 bg-gray-50/50'
          )}
        >
          {hasChildren ? (
            <button onClick={() => setExpandedRows(prev => { const n = new Set(prev); if (n.has(row.id)) n.delete(row.id); else n.add(row.id); return n })}>
              {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
            </button>
          ) : (
            <div className="w-4" />
          )}

          {/* Platform icon */}
          <div className={cn('w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold flex-shrink-0', platform?.bgColor ?? 'bg-gray-100', platform?.textColor ?? 'text-gray-500')}>
            {platform ? platform.label.slice(0, 2).toUpperCase() : <KeyRound className="w-3 h-3" />}
          </div>

          {/* Service + URL */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-gray-900">{row.service}</p>
            {row.url && <a href={row.url} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-600 hover:underline truncate block">{row.url}</a>}
          </div>

          {/* Login */}
          <div className="text-sm text-gray-600 min-w-0 w-36 truncate hidden sm:block">{row.login}</div>

          {/* Password */}
          <div className="flex items-center gap-1 w-32">
            <span className="text-sm text-gray-600 font-mono flex-1 truncate">
              {showPass ? row.password : '••••••••'}
            </span>
            <button onClick={() => togglePassword(row.id)} className="text-gray-300 hover:text-gray-500 flex-shrink-0">
              {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Notes */}
          {row.notes && <p className="text-xs text-gray-400 max-w-[120px] truncate hidden lg:block">{row.notes}</p>}

          {/* Actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={() => openNew(row)}>
              <Plus className="w-3 h-3" />
            </Button>
            <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={() => openEdit(row)}>
              Editar
            </Button>
          </div>
        </div>
        {hasChildren && isExpanded && (
          <div>
            {row.children!.map(c => renderRow(c, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  if (isLoading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Senhas</h1>
          <p className="text-sm text-gray-500 mt-0.5">Credenciais de acesso — dados armazenados apenas no repositório privado</p>
        </div>
        <Button size="sm" onClick={() => openNew()}><Plus className="w-4 h-4" /> Adicionar</Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Table header */}
        <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wide">
          <div className="w-4" />
          <div className="w-6" />
          <div className="flex-1">Serviço</div>
          <div className="w-36 hidden sm:block">Login</div>
          <div className="w-32">Senha</div>
          <div className="w-8" />
        </div>

        {senhas.length === 0 ? (
          <div className="py-16 text-center">
            <KeyRound className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">Nenhuma credencial cadastrada</p>
          </div>
        ) : (
          <div>{topLevel.map(row => renderRow(row))}</div>
        )}
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editSenha ? 'Editar Credencial' : parentId ? 'Nova Sub-conta' : 'Nova Credencial'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Serviço</Label>
              <Input placeholder="ex: Instagram da coLAB" value={sService} onChange={e => setSService(e.target.value)} autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label>Plataforma (opcional)</Label>
              <Select value={sPlatformId} onValueChange={setSPlatformId}>
                <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {PLATFORMS.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>URL (opcional)</Label>
              <Input placeholder="https://…" value={sUrl} onChange={e => setSUrl(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Login / Email</Label>
                <Input value={sLogin} onChange={e => setSLogin(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Senha</Label>
                <Input type="password" value={sPassword} onChange={e => setSPassword(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Observações (opcional)</Label>
              <Input value={sNotes} onChange={e => setSNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            {editSenha && (
              <Button variant="outline" className="text-red-500 mr-auto" onClick={handleDelete}>
                <X className="w-4 h-4" /> Remover
              </Button>
            )}
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !sService.trim() || !sLogin.trim()}>
              {saving ? 'Salvando…' : editSenha ? 'Atualizar' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  )
}
