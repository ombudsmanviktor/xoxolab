import { useState, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Link2, Upload, Download, Trash2, ExternalLink, X, File } from 'lucide-react'
import { useProject } from '@/contexts/ProjectContext'
import { loadRecursos, saveRecursos, uploadTemplate } from '@/lib/storage'
import { readFile, getGitHubConfig } from '@/lib/github'
import { generateId, todayISO } from '@/lib/utils'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/hooks/useToast'
import { ToastContainer } from '@/components/ui/toast'
import type { RecursosData, Recurso } from '@/types'

export function Recursos() {
  const { projectId } = useProject()
  const queryClient = useQueryClient()
  const { toasts, toast, dismiss } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)

  const [linkDialog, setLinkDialog] = useState(false)
  const [editRecurso, setEditRecurso] = useState<Recurso | null>(null)
  const [rTitle, setRTitle] = useState('')
  const [rUrl, setRUrl] = useState('')
  const [rDesc, setRDesc] = useState('')
  const [rCat, setRCat] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const { data: recursosData, isLoading } = useQuery({
    queryKey: ['recursos', projectId],
    queryFn: () => loadRecursos(projectId),
  })

  const data: RecursosData = recursosData ?? { recursos: [], templates: [] }

  async function saveData(newData: RecursosData) {
    await saveRecursos(projectId, newData)
    queryClient.setQueryData(['recursos', projectId], newData)
  }

  function openNew() {
    setEditRecurso(null); setRTitle(''); setRUrl(''); setRDesc(''); setRCat('')
    setLinkDialog(true)
  }

  function openEdit(r: Recurso) {
    setEditRecurso(r); setRTitle(r.title); setRUrl(r.url); setRDesc(r.description ?? ''); setRCat(r.category ?? '')
    setLinkDialog(true)
  }

  async function tryFetchTitle(url: string) {
    if (!url.startsWith('http') || rTitle) return
    try {
      const res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`)
      const html = await res.text()
      const match = html.match(/<title[^>]*>([^<]+)<\/title>/i)
      if (match?.[1]) setRTitle(match[1].trim())
    } catch { /* ignore */ }
  }

  async function handleSaveRecurso() {
    if (!rTitle.trim() || !rUrl.trim()) return
    setSaving(true)
    try {
      const now = todayISO()
      const recurso: Recurso = editRecurso
        ? { ...editRecurso, title: rTitle.trim(), url: rUrl.trim(), description: rDesc, category: rCat }
        : { id: generateId(), title: rTitle.trim(), url: rUrl.trim(), description: rDesc, category: rCat, order: data.recursos.length, createdAt: now }

      const newRecursos = editRecurso
        ? data.recursos.map(r => r.id === recurso.id ? recurso : r)
        : [...data.recursos, recurso]

      await saveData({ ...data, recursos: newRecursos })
      setLinkDialog(false)
      toast({ title: editRecurso ? 'Link atualizado' : 'Link adicionado' })
    } catch (err) {
      toast({ title: 'Erro', description: String(err), variant: 'destructive' })
    }
    setSaving(false)
  }

  async function handleDeleteRecurso(id: string) {
    await saveData({ ...data, recursos: data.recursos.filter(r => r.id !== id) })
    setLinkDialog(false)
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 50 * 1024 * 1024) {
      toast({ title: 'Arquivo muito grande', description: 'Limite de 50MB por arquivo.', variant: 'destructive' })
      return
    }
    setUploading(true)
    try {
      const attachment = await uploadTemplate(projectId, file)
      const now = new Date().toISOString()
      const template = { id: attachment.id, name: file.name, path: attachment.path, url: attachment.url, size: file.size, type: file.type, uploadedAt: now }
      await saveData({ ...data, templates: [...data.templates, template] })
      toast({ title: 'Template enviado!' })
    } catch (err) {
      toast({ title: 'Erro no upload', description: String(err), variant: 'destructive' })
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleDeleteTemplate(id: string) {
    await saveData({ ...data, templates: data.templates.filter(t => t.id !== id) })
  }

  async function handleDownloadTemplate(path: string, name: string, type: string) {
    try {
      const cfg = getGitHubConfig()
      if (!cfg) { toast({ title: 'Não autenticado', variant: 'destructive' }); return }
      const ghFile = await readFile(cfg, path)
      // Decode base64 → binary bytes (works for any file type)
      const raw = ghFile.content.replace(/\n/g, '')
      const binary = atob(raw)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      const blob = new Blob([bytes], { type: type || 'application/octet-stream' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = name
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      toast({ title: 'Erro ao baixar arquivo', description: String(err), variant: 'destructive' })
    }
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (isLoading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Recursos</h1>
        <p className="text-sm text-gray-500 mt-0.5">Links úteis e arquivos de referência</p>
      </div>

      <Tabs defaultValue="recursos">
        <TabsList>
          <TabsTrigger value="recursos">Links ({data.recursos.length})</TabsTrigger>
          <TabsTrigger value="templates">Templates e Documentos ({data.templates.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="recursos" className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={openNew}><Plus className="w-4 h-4" /> Adicionar Link</Button>
          </div>

          {data.recursos.length === 0 ? (
            <div className="text-center py-12">
              <Link2 className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400">Nenhum recurso adicionado</p>
            </div>
          ) : (
            <div className="space-y-2">
              {data.recursos.sort((a, b) => a.order - b.order).map(r => (
                <div key={r.id} className="flex items-center gap-3 bg-white border border-gray-100 rounded-lg px-4 py-3 group hover:border-gray-200 transition-colors">
                  <Link2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{r.title}</p>
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-600 hover:underline truncate block">{r.url}</a>
                    {r.description && <p className="text-xs text-gray-400 mt-0.5">{r.description}</p>}
                  </div>
                  {r.category && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full flex-shrink-0">{r.category}</span>}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="p-1 text-gray-400 hover:text-gray-600">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button onClick={() => openEdit(r)} className="p-1 text-gray-400 hover:text-gray-600">
                      Editar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
              <Upload className="w-4 h-4" />
              {uploading ? 'Enviando…' : 'Upload'}
            </Button>
            <input ref={fileRef} type="file" className="hidden" onChange={handleUpload} />
          </div>

          {data.templates.length === 0 ? (
            <div className="text-center py-12">
              <File className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400">Nenhum template enviado</p>
            </div>
          ) : (
            <div className="space-y-2">
              {data.templates.map(t => (
                <div key={t.id} className="flex items-center gap-3 bg-white border border-gray-100 rounded-lg px-4 py-3 group hover:border-gray-200 transition-colors">
                  <File className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{t.name}</p>
                    <p className="text-xs text-gray-400">{formatSize(t.size)}</p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {t.path && (
                      <button onClick={() => handleDownloadTemplate(t.path, t.name, t.type)} className="p-1 text-gray-400 hover:text-gray-600" title="Baixar">
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button onClick={() => handleDeleteTemplate(t.id)} className="p-1 text-gray-300 hover:text-red-400">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Link dialog */}
      <Dialog open={linkDialog} onOpenChange={setLinkDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editRecurso ? 'Editar Link' : 'Novo Link'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>URL</Label>
              <Input
                placeholder="https://…"
                value={rUrl}
                onChange={e => setRUrl(e.target.value)}
                onBlur={e => tryFetchTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Título</Label>
              <Input value={rTitle} onChange={e => setRTitle(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Categoria (opcional)</Label>
                <Input placeholder="ex: Drive, Referência" value={rCat} onChange={e => setRCat(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Descrição (opcional)</Label>
              <Input value={rDesc} onChange={e => setRDesc(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            {editRecurso && (
              <Button variant="outline" className="text-red-500 mr-auto" onClick={() => handleDeleteRecurso(editRecurso.id)}>
                <X className="w-4 h-4" /> Remover
              </Button>
            )}
            <Button variant="outline" onClick={() => setLinkDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveRecurso} disabled={saving || !rTitle.trim() || !rUrl.trim()}>
              {saving ? 'Salvando…' : editRecurso ? 'Atualizar' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  )
}
