import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/contexts/AuthContext'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProjectLayout } from '@/components/layout/ProjectLayout'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { Login } from '@/pages/Login'
import { Projects } from '@/pages/Projects'
import { Settings } from '@/pages/Settings'
import { Avisos } from '@/pages/Avisos'
import { Pautas } from '@/pages/Pautas'
import { Kanban } from '@/pages/Kanban'
import { Efemerides } from '@/pages/Efemerides'
import { Politicas } from '@/pages/Politicas'
import { Recursos } from '@/pages/Recursos'
import { Equipe } from '@/pages/Equipe'
import { Senhas } from '@/pages/Senhas'
import { NotFound } from '@/pages/NotFound'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 5, retry: 1 },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <HashRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/projects" replace />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/projects/:projectId" element={<ProjectLayout />}>
                <Route index element={<Navigate to="avisos" replace />} />
                <Route path="avisos" element={<Avisos />} />
                <Route path="pautas" element={<Pautas />} />
                <Route path="kanban" element={<Kanban />} />
                <Route path="efemerides" element={<Efemerides />} />
                <Route path="politicas" element={<Politicas />} />
                <Route path="recursos" element={<Recursos />} />
                <Route path="equipe" element={<Equipe />} />
                <Route path="senhas" element={<Senhas />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </HashRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
