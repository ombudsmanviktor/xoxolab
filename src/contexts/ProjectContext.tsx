import { createContext, useContext, type ReactNode } from 'react'
import type { ProjectMeta } from '@/types'

interface ProjectContextType {
  projectId: string
  projectMeta: ProjectMeta | null
}

export const ProjectContext = createContext<ProjectContextType | null>(null)

export function useProject() {
  const ctx = useContext(ProjectContext)
  if (!ctx) throw new Error('useProject must be used within ProjectLayout')
  return ctx
}

export function ProjectProvider({
  projectId,
  projectMeta,
  children,
}: {
  projectId: string
  projectMeta: ProjectMeta | null
  children: ReactNode
}) {
  return (
    <ProjectContext.Provider value={{ projectId, projectMeta }}>
      {children}
    </ProjectContext.Provider>
  )
}
