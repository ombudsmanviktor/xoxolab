import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AtSign, Kanban, AlignLeft, Megaphone } from 'lucide-react'
import { useProject } from '@/contexts/ProjectContext'
import { loadAvisos, loadPautas, loadKanbanCards } from '@/lib/storage'
import { emailInitials, formatDateTime } from '@/lib/utils'
import { cn } from '@/lib/utils'

export function Equipe() {
  const { projectId, projectMeta } = useProject()

  const { data: avisos = [] } = useQuery({ queryKey: ['avisos', projectId], queryFn: () => loadAvisos(projectId) })
  const { data: pautaData } = useQuery({ queryKey: ['pautas', projectId], queryFn: () => loadPautas(projectId) })
  const { data: kanbanCards = [] } = useQuery({ queryKey: ['kanban', projectId], queryFn: () => loadKanbanCards(projectId) })

  const users = projectMeta?.users ?? []

  interface UserActivity {
    email: string
    avisosMentions: { id: string; title: string; updatedAt: string }[]
    pautasMentions: { id: string; title: string; updatedAt: string }[]
    kanbanAssigned: { id: string; title: string; column: string; updatedAt: string }[]
    kanbanMentions: { id: string; title: string; updatedAt: string }[]
  }

  const userActivity = useMemo((): UserActivity[] => {
    return users.map(email => ({
      email,
      avisosMentions: avisos.filter(a => a.mentions?.includes(email)).map(a => ({ id: a.id, title: a.title, updatedAt: a.updatedAt })),
      pautasMentions: (pautaData?.items ?? []).filter(i => i.mentions?.includes(email)).map(i => ({ id: i.id, title: i.title, updatedAt: i.updatedAt })),
      kanbanAssigned: kanbanCards.filter(c => c.assignee === email).map(c => ({ id: c.id, title: c.title, column: c.column, updatedAt: c.updatedAt })),
      kanbanMentions: kanbanCards.filter(c => c.mentions?.includes(email)).map(c => ({ id: c.id, title: c.title, updatedAt: c.updatedAt })),
    }))
  }, [users, avisos, pautaData, kanbanCards])

  const columnLabels: Record<string, string> = {
    'pautas': 'Pautas', 'em-construcao': 'Em Construção', 'em-revisao': 'Em Revisão',
    'aguardando-aprovacao': 'Ag. Aprovação', 'divulgacao': 'Divulgação', 'finalizado': 'Finalizado',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Equipe</h1>
        <p className="text-sm text-gray-500 mt-0.5">{users.length} colaborador{users.length !== 1 ? 'es' : ''} — menções e atribuições</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {userActivity.map(u => {
          const totalPending = u.avisosMentions.length + u.pautasMentions.length + u.kanbanAssigned.length + u.kanbanMentions.length
          return (
            <div key={u.email} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              {/* User header */}
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-semibold text-sm flex-shrink-0">
                  {emailInitials(u.email)}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{u.email}</p>
                  <p className="text-xs text-gray-400">{totalPending} pendência{totalPending !== 1 ? 's' : ''}</p>
                </div>
              </div>

              {/* Activity */}
              <div className="px-5 py-4 space-y-4">
                {u.avisosMentions.length > 0 && (
                  <Section icon={Megaphone} label="Avisos" color="text-amber-600">
                    {u.avisosMentions.map(a => (
                      <ActivityItem key={a.id} title={a.title} date={a.updatedAt} />
                    ))}
                  </Section>
                )}
                {u.pautasMentions.length > 0 && (
                  <Section icon={AlignLeft} label="Pautas" color="text-orange-600">
                    {u.pautasMentions.map(a => (
                      <ActivityItem key={a.id} title={a.title} date={a.updatedAt} />
                    ))}
                  </Section>
                )}
                {u.kanbanAssigned.length > 0 && (
                  <Section icon={Kanban} label="Cards atribuídos" color="text-pink-600">
                    {u.kanbanAssigned.map(c => (
                      <ActivityItem key={c.id} title={c.title} subtitle={columnLabels[c.column] ?? c.column} date={c.updatedAt} />
                    ))}
                  </Section>
                )}
                {u.kanbanMentions.length > 0 && (
                  <Section icon={AtSign} label="Mencionado no Kanban" color="text-purple-600">
                    {u.kanbanMentions.map(c => (
                      <ActivityItem key={c.id} title={c.title} date={c.updatedAt} />
                    ))}
                  </Section>
                )}

                {totalPending === 0 && (
                  <p className="text-xs text-gray-300 italic text-center py-2">Sem pendências</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Section({ icon: Icon, label, color, children }: { icon: React.ComponentType<{className?: string}>; label: string; color: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className={cn('w-3.5 h-3.5', color)} />
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
      </div>
      <div className="space-y-1 pl-5">{children}</div>
    </div>
  )
}

function ActivityItem({ title, subtitle, date }: { title: string; subtitle?: string; date: string }) {
  return (
    <div className="text-xs text-gray-600">
      <p className="font-medium leading-tight truncate">{title}</p>
      {subtitle && <p className="text-gray-400 text-[10px]">{subtitle}</p>}
      <p className="text-gray-300 text-[10px]">{formatDateTime(date)}</p>
    </div>
  )
}
