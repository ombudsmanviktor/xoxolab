import { useState, useRef, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Download, X, BookOpen } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useProject } from '@/contexts/ProjectContext'
import { loadPoliticas, savePolitica, deletePolitica } from '@/lib/storage'
import { sendMentionNotification } from '@/lib/emailjs'
import { extractMentions, generateId, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { MarkdownEditor, MarkdownRenderer } from '@/components/shared/MarkdownEditor'
import { useToast } from '@/hooks/useToast'
import { ToastContainer } from '@/components/ui/toast'
import type { Politica } from '@/types'

export function Politicas() {
  const { session } = useAuth()
  const { projectId, projectMeta } = useProject()
  const queryClient = useQueryClient()
  const { toasts, toast, dismiss } = useToast()

  const [exportOpen, setExportOpen] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editPolitica, setEditPolitica] = useState<Politica | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)

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

  const { data: politicas = [], isLoading } = useQuery({
    queryKey: ['politicas', projectId],
    queryFn: () => loadPoliticas(projectId),
  })

  function openNew() {
    setEditPolitica(null); setTitle(''); setBody('')
    setDialogOpen(true)
  }

  function openEdit(p: Politica) {
    setEditPolitica(p); setTitle(p.title); setBody(p.body)
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!title.trim()) return
    setSaving(true)
    try {
      const now = new Date().toISOString()
      const prevMentions = editPolitica?.mentions ?? []
      const newMentions = extractMentions(body)
      const added = newMentions.filter(e => !prevMentions.includes(e) && e !== session?.email)

      const politica: Politica = editPolitica
        ? { ...editPolitica, title: title.trim(), body, mentions: newMentions, updatedAt: now }
        : { id: generateId(), title: title.trim(), body, mentions: newMentions, createdAt: now, updatedAt: now }

      await savePolitica(projectId, politica)
      queryClient.setQueryData(['politicas', projectId], (prev: Politica[] = []) =>
        editPolitica ? prev.map(p => p.id === politica.id ? politica : p) : [...prev, politica]
      )

      for (const email of added) {
        await sendMentionNotification({
          mentionerEmail: session!.email,
          mentionedEmail: email,
          projectName: projectMeta?.name ?? projectId,
          moduleName: 'Políticas',
          excerpt: body.slice(0, 200),
        })
      }

      setDialogOpen(false)
      toast({ title: editPolitica ? 'Política atualizada' : 'Política criada' })
    } catch (err) {
      toast({ title: 'Erro', description: String(err), variant: 'destructive' })
    }
    setSaving(false)
  }

  async function handleDelete() {
    if (!editPolitica) return
    await deletePolitica(projectId, editPolitica.id)
    queryClient.setQueryData(['politicas', projectId], (prev: Politica[] = []) => prev.filter(p => p.id !== editPolitica.id))
    setDialogOpen(false)
    toast({ title: 'Política removida' })
  }

  async function exportAllPDF() {
    if (politicas.length === 0) return
    try {
      const { jsPDF } = await import('jspdf')
      const pdf = new jsPDF({ orientation: 'portrait', format: 'a4', unit: 'mm' })
      const margin = 20
      const pageW = pdf.internal.pageSize.getWidth()

      for (let i = 0; i < politicas.length; i++) {
        const p = politicas[i]
        if (i > 0) pdf.addPage()
        let y = margin

        pdf.setFontSize(16)
        pdf.setFont('helvetica', 'bold')
        pdf.text(p.title, margin, y)
        y += 10

        pdf.setFontSize(10)
        pdf.setFont('helvetica', 'normal')
        // Strip basic markdown
        const text = p.body
          .replace(/#{1,6}\s/g, '')
          .replace(/\*\*([^*]+)\*\*/g, '$1')
          .replace(/\*([^*]+)\*/g, '$1')
          .replace(/`([^`]+)`/g, '$1')
          .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
          .replace(/^[-*+]\s/gm, '• ')
        const lines = pdf.splitTextToSize(text, pageW - margin * 2)
        for (let j = 0; j < lines.length; j++) {
          if (y > 270) { pdf.addPage(); y = margin }
          pdf.text(lines[j], margin, y)
          y += 5
        }
      }

      pdf.save('politicas.pdf')
    } catch (err) {
      toast({ title: 'Erro ao exportar PDF', description: String(err), variant: 'destructive' })
    }
  }

  async function exportAllDOCX() {
    if (politicas.length === 0) return
    try {
      const { Document, Paragraph, HeadingLevel, Packer, TextRun, PageBreak } = await import('docx')
      const children = []
      for (let i = 0; i < politicas.length; i++) {
        const p = politicas[i]
        if (i > 0) {
          children.push(new Paragraph({ children: [new PageBreak()] }))
        }
        children.push(new Paragraph({ text: p.title, heading: HeadingLevel.HEADING_1 }))
        const bodyText = p.body
          .replace(/#{1,6}\s/g, '')
          .replace(/\*\*([^*]+)\*\*/g, '$1')
          .replace(/\*([^*]+)\*/g, '$1')
          .replace(/`([^`]+)`/g, '$1')
          .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        for (const line of bodyText.split('\n')) {
          children.push(new Paragraph({ children: [new TextRun(line)] }))
        }
      }
      const doc = new Document({ sections: [{ children }] })
      const blob = await Packer.toBlob(doc)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = 'politicas.docx'; a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      toast({ title: 'Erro ao exportar DOCX', description: String(err), variant: 'destructive' })
    }
  }

  function exportAllMarkdown() {
    if (politicas.length === 0) return
    const lines = ['# Políticas\n']
    for (const p of politicas) {
      lines.push(`## ${p.title}`)
      lines.push(p.body)
      lines.push('\n---\n')
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'politicas.md'; a.click()
    URL.revokeObjectURL(url)
  }

  function exportMarkdown(p: Politica) {
    const blob = new Blob([`# ${p.title}\n\n${p.body}`], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${p.id}.md`; a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Políticas</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Guias, manuais e documentação editorial</p>
        </div>
        <div className="flex items-center gap-2">
          {politicas.length > 0 && (
            <div className="relative" ref={exportRef}>
              <Button variant="outline" size="sm" onClick={() => setExportOpen(v => !v)}>
                <Download className="w-4 h-4" />
                Exportar Tudo
              </Button>
              {exportOpen && (
                <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-30 py-1 min-w-[150px]">
                  {[
                    { label: 'PDF', fn: exportAllPDF },
                    { label: 'Word (DOCX)', fn: exportAllDOCX },
                    { label: 'Markdown', fn: exportAllMarkdown },
                  ].map(({ label, fn }) => (
                    <button
                      key={label}
                      onClick={() => { fn(); setExportOpen(false) }}
                      className="w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 text-left transition-colors"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <Button size="sm" onClick={openNew}><Plus className="w-4 h-4" /> Nova Política</Button>
        </div>
      </div>

      {politicas.length === 0 ? (
        <div className="text-center py-16">
          <BookOpen className="w-10 h-10 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
          <p className="text-gray-400 dark:text-gray-500">Nenhuma política cadastrada</p>
          <Button className="mt-4" onClick={openNew}><Plus className="w-4 h-4" /> Criar</Button>
        </div>
      ) : (
        <>
          {/* Table of Contents */}
          <div className="bg-teal-50 border border-teal-100 rounded-xl px-5 py-4">
            <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide mb-3">Índice</p>
            <ol className="space-y-1">
              {politicas.map((p, i) => (
                <li key={p.id} className="flex items-baseline gap-2">
                  <span className="text-xs text-teal-400 w-5 flex-shrink-0 text-right">{i + 1}.</span>
                  <button
                    onClick={() => document.getElementById(`pol-${p.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    className="text-sm text-teal-800 hover:text-teal-600 hover:underline text-left"
                  >
                    {p.title}
                  </button>
                </li>
              ))}
            </ol>
          </div>

          <div className="space-y-4">
            {politicas.map(p => (
              <div key={p.id} id={`pol-${p.id}`} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm scroll-mt-4">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{p.title}</h3>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{formatDate(p.updatedAt)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => exportMarkdown(p)} title="Exportar Markdown">
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>Editar</Button>
                  </div>
                </div>
                <div className="px-5 py-4">
                  <MarkdownRenderer content={p.body} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editPolitica ? 'Editar Política' : 'Nova Política'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Título</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label>Conteúdo</Label>
              <MarkdownEditor value={body} onChange={setBody} minHeight={300} projectUsers={projectMeta?.users ?? []} />
            </div>
          </div>
          <DialogFooter>
            {editPolitica && (
              <Button variant="outline" className="text-red-500 mr-auto" onClick={handleDelete}>
                <X className="w-4 h-4" /> Remover
              </Button>
            )}
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !title.trim()}>
              {saving ? 'Salvando…' : editPolitica ? 'Atualizar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  )
}
