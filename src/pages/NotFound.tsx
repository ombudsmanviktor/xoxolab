import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export function NotFound() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">404</h1>
        <p className="text-gray-500 mb-6">Página não encontrada.</p>
        <Button onClick={() => navigate('/projects')}>Voltar ao início</Button>
      </div>
    </div>
  )
}
