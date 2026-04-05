import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Mail, Lock, Github, GitBranch, FlaskConical, Sun, Moon } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DEMO_PROJECT_ID } from '@/lib/demoStore'
import type { GitHubConfig } from '@/lib/github'

export function Login() {
  const { signIn, signInDemo, session } = useAuth()
  const navigate = useNavigate()
  const { isDark, toggle } = useTheme()

  const [email, setEmail] = useState('')
  const [pat, setPat] = useState('')
  const [repo, setRepo] = useState('')
  const [branch, setBranch] = useState('main')
  const [showPat, setShowPat] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (session) navigate('/projects', { replace: true })
  }, [session, navigate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!email.trim() || !email.includes('@')) {
      setError('Informe um email válido.')
      return
    }

    const [owner, repoName] = repo.trim().split('/')
    if (!owner || !repoName) {
      setError('Repositório deve estar no formato: proprietário/repositório')
      return
    }

    if (!pat.trim()) {
      setError('Informe o Personal Access Token do GitHub.')
      return
    }

    setLoading(true)

    const githubConfig: GitHubConfig = {
      token: pat.trim(),
      owner: owner.trim(),
      repo: repoName.trim(),
      branch: branch.trim() || 'main',
    }

    const result = await signIn(email.trim(), githubConfig)
    setLoading(false)

    if (!result.ok) {
      setError(result.error ?? 'Falha ao conectar ao GitHub. Verifique suas credenciais.')
      return
    }

    navigate('/projects', { replace: true })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-violet-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4 relative">
      {/* Theme toggle */}
      <button onClick={toggle} className="absolute top-4 right-4 p-2 rounded-lg bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 shadow-sm transition-colors">
        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-4 relative">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" className="w-full h-full drop-shadow-lg">
              <defs>
                <linearGradient id="lg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#a78bfa"/>
                  <stop offset="100%" stopColor="#6d28d9"/>
                </linearGradient>
              </defs>
              <rect width="64" height="64" rx="18" fill="url(#lg)"/>
              <rect x="8"  y="11" width="14" height="5" rx="2.5" fill="white" opacity="0.55"/>
              <rect x="25" y="11" width="14" height="5" rx="2.5" fill="white" opacity="0.55"/>
              <rect x="42" y="11" width="14" height="5" rx="2.5" fill="white" opacity="0.55"/>
              <rect x="8"  y="19" width="14" height="12" rx="3" fill="white" opacity="0.9"/>
              <rect x="8"  y="34" width="14" height="10" rx="3" fill="white" opacity="0.65"/>
              <rect x="25" y="19" width="14" height="12" rx="3" fill="white" opacity="0.9"/>
              <rect x="42" y="19" width="14" height="10" rx="3" fill="white" opacity="0.9"/>
              <rect x="42" y="32" width="14" height="10" rx="3" fill="white" opacity="0.65"/>
              <rect x="42" y="45" width="14" height="7"  rx="3" fill="white" opacity="0.35"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">xoxoLAB</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">App de gestão editorial colaborativa · por coLAB-UFF</p>
        </div>

        {/* Form */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500">Usado para identificá-lo e receber @menções</p>
            </div>

            {/* PAT */}
            <div className="space-y-1.5">
              <Label htmlFor="pat">GitHub Personal Access Token</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                <Input
                  id="pat"
                  type={showPat ? 'text' : 'password'}
                  placeholder="ghp_xxxxxxxxxxxx"
                  value={pat}
                  onChange={e => setPat(e.target.value)}
                  className="pl-9 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPat(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPat ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Repo */}
            <div className="space-y-1.5">
              <Label htmlFor="repo">Repositório GitHub</Label>
              <div className="relative">
                <Github className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                <Input
                  id="repo"
                  placeholder="proprietário/repositório"
                  value={repo}
                  onChange={e => setRepo(e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
            </div>

            {/* Branch */}
            <div className="space-y-1.5">
              <Label htmlFor="branch">Branch</Label>
              <div className="relative">
                <GitBranch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                <Input
                  id="branch"
                  placeholder="main"
                  value={branch}
                  onChange={e => setBranch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Verificando conexão…' : 'Entrar'}
            </Button>
          </form>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-100 dark:border-gray-700" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white dark:bg-gray-800 px-3 text-xs text-gray-400 dark:text-gray-500">ou</span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full gap-2 text-purple-700 border-purple-200 hover:bg-purple-50"
            onClick={() => {
              signInDemo()
              navigate(`/projects/${DEMO_PROJECT_ID}/avisos`, { replace: true })
            }}
          >
            <FlaskConical className="w-4 h-4" />
            Modo demonstração
          </Button>
          <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-2">
            Dados de exemplo — sem persistência, sem GitHub necessário.
          </p>
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-6">
          Dados armazenados no seu repositório GitHub privado.
        </p>
      </div>
    </div>
  )
}
