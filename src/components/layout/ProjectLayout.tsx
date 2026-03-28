import { useParams, Outlet, Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { FlaskConical } from 'lucide-react'
import { ProjectProvider } from '@/contexts/ProjectContext'
import { ProjectSidebar } from './ProjectSidebar'
import { loadProjectMeta, loadEventos, saveEventos } from '@/lib/storage'
import { sendCalendarReminder } from '@/lib/emailjs'
import { useAuth } from '@/contexts/AuthContext'
import { differenceInDays, parseISO } from 'date-fns'
import { todayISO } from '@/lib/utils'

function CalendarReminderChecker({ projectId }: { projectId: string }) {
  const { session } = useAuth()

  useEffect(() => {
    if (!session?.emailJSConfig) return

    const check = async () => {
      try {
        const today = todayISO()
        const eventos = await loadEventos(projectId)
        let updated = false

        for (const e of eventos) {
          const daysUntil = differenceInDays(parseISO(e.date), parseISO(today))

          if (daysUntil === 7 && !e.notified7) {
            await sendCalendarReminder({
              recipientEmail: session.email,
              eventTitle: e.title,
              eventDate: e.date,
              projectName: '',
              daysAhead: 7,
            })
            e.notified7 = true
            updated = true
          }

          if (daysUntil === 1 && !e.notified1) {
            await sendCalendarReminder({
              recipientEmail: session.email,
              eventTitle: e.title,
              eventDate: e.date,
              projectName: '',
              daysAhead: 1,
            })
            e.notified1 = true
            updated = true
          }
        }

        if (updated) {
          await saveEventos(projectId, eventos)
        }
      } catch {
        // silently fail
      }
    }

    check()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  return null
}

export function ProjectLayout() {
  const { projectId } = useParams<{ projectId: string }>()
  const { isDemoMode } = useAuth()

  const { data: projectMeta, isLoading } = useQuery({
    queryKey: ['project-meta', projectId ?? ''],
    queryFn: () => (projectId ? loadProjectMeta(projectId) : null),
    staleTime: 1000 * 60 * 5,
    enabled: !!projectId,
  })

  if (!projectId) return <Navigate to="/projects" replace />

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <ProjectProvider projectId={projectId} projectMeta={projectMeta ?? null}>
      <CalendarReminderChecker projectId={projectId} />
      <div className="flex min-h-screen bg-gray-50 flex-col">
        {isDemoMode && (
          <div className="flex items-center justify-center gap-2 bg-purple-600 text-white text-xs px-4 py-2 flex-shrink-0">
            <FlaskConical className="w-3.5 h-3.5" />
            <span>Modo demonstração — dados de exemplo, sem persistência.</span>
          </div>
        )}
        <div className="flex flex-1 min-h-0">
          <ProjectSidebar />
          <main className="flex-1 min-w-0 overflow-auto">
            <div className="p-6 lg:p-8 max-w-7xl mx-auto">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </ProjectProvider>
  )
}
