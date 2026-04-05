import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Settings, Users, LogOut, Folder, Trash2, FlaskConical, SlidersHorizontal, Sun, Moon } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { listProjects, createProject, saveProjectMeta, deleteProject } from '@/lib/storage'
import { registerUserEmail } from '@/lib/storage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/hooks/useToast'
import { ToastContainer } from '@/components/ui/toast'
import type { ProjectMeta } from '@/types'

export function Projects() {
  const { session, signOut, isDemoMode } = useAuth()
  const { isDark, toggle: toggleTheme } = useTheme()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toasts, toast, dismiss } = useToast()

  const [newOpen, setNewOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newUsers, setNewUsers] = useState('')
  const [creating, setCreating] = useState(false)

  const [settingsProject, setSettingsProject] = useState<ProjectMeta | null>(null)
  const [settingsName, setSettingsName] = useState('')
  const [settingsUsers, setSettingsUsers] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects', session?.email],
    queryFn: () => listProjects(session!.email),
    enabled: !!session,
  })

  async function handleCreate() {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const emails = newUsers.split(/[,;\n]/).map(e => e.trim()).filter(Boolean)
      await registerUserEmail(session!.email)
      for (const e of emails) await registerUserEmail(e)
      const meta = await createProject(newName.trim(), session!.email, emails)
      queryClient.setQueryData(['projects', session!.email], (prev: ProjectMeta[] = []) => [...prev, meta])
      setNewOpen(false)
      setNewName('')
      setNewUsers('')
      toast({ title: 'Projeto criado!', description: meta.name })
    } catch (err) {
      toast({ title: 'Erro ao criar projeto', description: String(err), variant: 'destructive' })
    }
    setCreating(false)
  }

  function openSettings(p: ProjectMeta) {
    setSettingsProject(p)
    setSettingsName(p.name)
    setSettingsUsers(p.users.filter(u => u !== session!.email).join(', '))
    setConfirmDelete(false)
  }

  async function handleSaveSettings() {
    if (!settingsProject) return
    setSaving(true)
    try {
      const emails = settingsUsers.split(/[,;\n]/).map(e => e.trim()).filter(Boolean)
      const updated: ProjectMeta = {
        ...settingsProject,
        name: settingsName.trim() || settingsProject.name,
        users: [...new Set([session!.email, ...emails])],
        updatedAt: new Date().toISOString(),
      }
      await saveProjectMeta(updated)
      queryClient.setQueryData(['projects', session!.email], (prev: ProjectMeta[] = []) =>
        prev.map(p => p.id === updated.id ? updated : p)
      )
      setSettingsProject(null)
      toast({ title: 'Projeto atualizado' })
    } catch (err) {
      toast({ title: 'Erro', description: String(err), variant: 'destructive' })
    }
    setSaving(false)
  }

  async function handleDelete() {
    if (!settingsProject) return
    setSaving(true)
    try {
      await deleteProject(settingsProject.id)
      queryClient.setQueryData(['projects', session!.email], (prev: ProjectMeta[] = []) =>
        prev.filter(p => p.id !== settingsProject.id)
      )
      setSettingsProject(null)
      toast({ title: 'Projeto removido' })
    } catch (err) {
      toast({ title: 'Erro', description: String(err), variant: 'destructive' })
    }
    setSaving(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-violet-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Top bar */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" className="w-full h-full">
              <defs><linearGradient id="hg" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#a78bfa"/><stop offset="100%" stopColor="#6d28d9"/></linearGradient></defs>
              <rect width="32" height="32" rx="9" fill="url(#hg)"/>
              <rect x="4"    y="5.5" width="7" height="2.5" rx="1.2" fill="white" opacity="0.55"/>
              <rect x="12.5" y="5.5" width="7" height="2.5" rx="1.2" fill="white" opacity="0.55"/>
              <rect x="21"   y="5.5" width="7" height="2.5" rx="1.2" fill="white" opacity="0.55"/>
              <rect x="4"    y="10"  width="7" height="6"   rx="1.5" fill="white" opacity="0.9"/>
              <rect x="4"    y="18"  width="7" height="5"   rx="1.5" fill="white" opacity="0.65"/>
              <rect x="12.5" y="10"  width="7" height="6"   rx="1.5" fill="white" opacity="0.9"/>
              <rect x="21"   y="10"  width="7" height="5"   rx="1.5" fill="white" opacity="0.9"/>
              <rect x="21"   y="17"  width="7" height="5"   rx="1.5" fill="white" opacity="0.65"/>
              <rect x="21"   y="24"  width="7" height="3.5" rx="1.5" fill="white" opacity="0.35"/>
            </svg>
          </div>
          <span className="font-semibold text-gray-900 dark:text-white">xoxoLAB</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 dark:text-gray-400 hidden sm:block">{session?.email}</span>
          <button
            onClick={toggleTheme}
            title={isDark ? 'Modo claro' : 'Modo escuro'}
            className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <Button variant="ghost" size="icon" onClick={() => navigate('/settings')} title="Configurações da conta">
            <SlidersHorizontal className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={signOut} title="Sair">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {isDemoMode && (
          <div className="flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 mb-6 text-sm text-purple-800">
            <FlaskConical className="w-4 h-4 flex-shrink-0" />
            <span>Modo demonstração — explore o app com dados de exemplo. Nada é salvo.</span>
          </div>
        )}

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Meus Projetos</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Selecione um projeto ou crie um novo</p>
          </div>
          <Button onClick={() => setNewOpen(true)} disabled={isDemoMode} title={isDemoMode ? 'Indisponível no modo demonstração' : undefined}>
            <Plus className="w-4 h-4" />
            Novo Projeto
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20">
            <Folder className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">Nenhum projeto ainda</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Crie seu primeiro projeto para começar</p>
            <Button className="mt-6" onClick={() => setNewOpen(true)}>
              <Plus className="w-4 h-4" />
              Criar Projeto
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map(p => (
              <div
                key={p.id}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-purple-200 transition-all cursor-pointer group relative"
              >
                <div
                  className="p-6"
                  onClick={() => navigate(`/projects/${p.id}/avisos`)}
                >
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                    <Folder className="w-5 h-5 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{p.name}</h3>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
                    <Users className="w-3 h-3" />
                    {p.users.length} colaborador{p.users.length !== 1 ? 'es' : ''}
                  </div>
                </div>
                {!isDemoMode && (
                  <button
                    onClick={e => { e.stopPropagation(); openSettings(p) }}
                    className="absolute top-4 right-4 p-1.5 rounded-md text-gray-300 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-all"
                    title="Configurações"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New project dialog */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Projeto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome do Projeto</Label>
              <Input placeholder="ex: coLAB/UFF" value={newName} onChange={e => setNewName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Colaboradores (emails)</Label>
              <Textarea
                placeholder="outro@email.com, mais@email.com"
                value={newUsers}
                onChange={e => setNewUsers(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-gray-400 dark:text-gray-500">Separe os emails por vírgula ou linha</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={creating || !newName.trim()}>
              {creating ? 'Criando…' : 'Criar Projeto'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings dialog */}
      <Dialog open={!!settingsProject} onOpenChange={open => { if (!open) setSettingsProject(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurações do Projeto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input value={settingsName} onChange={e => setSettingsName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Colaboradores</Label>
              <Textarea
                value={settingsUsers}
                onChange={e => setSettingsUsers(e.target.value)}
                rows={4}
                placeholder="email1@domain.com, email2@domain.com"
              />
              <p className="text-xs text-gray-400 dark:text-gray-500">O seu email ({session?.email}) é incluído automaticamente</p>
            </div>

            {confirmDelete ? (
              <div className="bg-red-50 border border-red-100 rounded-lg p-4 space-y-3">
                <p className="text-sm font-medium text-red-700">Tem certeza? Esta ação não pode ser desfeita.</p>
                <div className="flex gap-2">
                  <Button variant="destructive" size="sm" onClick={handleDelete} disabled={saving}>
                    {saving ? 'Removendo…' : 'Confirmar exclusão'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>Cancelar</Button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-2 text-sm text-red-500 hover:text-red-700 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Excluir projeto
              </button>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsProject(null)}>Cancelar</Button>
            <Button onClick={handleSaveSettings} disabled={saving}>
              {saving ? 'Salvando…' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  )
}
