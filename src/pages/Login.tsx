import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ChevronDown, ChevronUp, Mail, Lock, Github, GitBranch, Bell, FlaskConical } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DEMO_PROJECT_ID } from '@/lib/demoStore'
import type { GitHubConfig } from '@/lib/github'
import type { EmailJSConfig } from '@/lib/emailjs'

export function Login() {
  const { signIn, signInDemo, session } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [pat, setPat] = useState('')
  const [repo, setRepo] = useState('')
  const [branch, setBranch] = useState('main')
  const [showPat, setShowPat] = useState(false)
  const [emailExpanded, setEmailExpanded] = useState(false)
  const [ejsServiceId, setEjsServiceId] = useState('')
  const [ejsTemplateId, setEjsTemplateId] = useState('')
  const [ejsPublicKey, setEjsPublicKey] = useState('')
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

    const emailJSConfig: EmailJSConfig | undefined =
      ejsServiceId && ejsTemplateId && ejsPublicKey
        ? { serviceId: ejsServiceId, templateId: ejsTemplateId, publicKey: ejsPublicKey }
        : undefined

    const result = await signIn(email.trim(), githubConfig, emailJSConfig)
    setLoading(false)

    if (!result.ok) {
      setError(result.error ?? 'Falha ao conectar ao GitHub. Verifique suas credenciais.')
      return
    }

    navigate('/projects', { replace: true })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-violet-50 flex items-center justify-center p-4">
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
              {/* Column headers */}
              <rect x="8"  y="11" width="14" height="5" rx="2.5" fill="white" opacity="0.55"/>
              <rect x="25" y="11" width="14" height="5" rx="2.5" fill="white" opacity="0.55"/>
              <rect x="42" y="11" width="14" height="5" rx="2.5" fill="white" opacity="0.55"/>
              {/* Column 1 */}
              <rect x="8"  y="19" width="14" height="12" rx="3" fill="white" opacity="0.9"/>
              <rect x="8"  y="34" width="14" height="10" rx="3" fill="white" opacity="0.65"/>
              {/* Column 2 */}
              <rect x="25" y="19" width="14" height="12" rx="3" fill="white" opacity="0.9"/>
              {/* Column 3 */}
              <rect x="42" y="19" width="14" height="10" rx="3" fill="white" opacity="0.9"/>
              <rect x="42" y="32" width="14" height="10" rx="3" fill="white" opacity="0.65"/>
              <rect x="42" y="45" width="14" height="7"  rx="3" fill="white" opacity="0.35"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">xoxoLAB</h1>
          <p className="text-gray-500 text-sm mt-1">Gestão editorial colaborativa</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
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
              <p className="text-xs text-gray-400">Usado para identificá-lo e receber @menções</p>
            </div>

            {/* PAT */}
            <div className="space-y-1.5">
              <Label htmlFor="pat">GitHub Personal Access Token</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPat ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Repo */}
            <div className="space-y-1.5">
              <Label htmlFor="repo">Repositório GitHub</Label>
              <div className="relative">
                <Github className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
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
                <GitBranch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="branch"
                  placeholder="main"
                  value={branch}
                  onChange={e => setBranch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* EmailJS collapsible */}
            <div className="border border-gray-100 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setEmailExpanded(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-purple-500" />
                  Notificações por Email (opcional)
                </div>
                {emailExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {emailExpanded && (
                <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
                  <p className="text-xs text-gray-500">
                    Configure uma conta no <a href="https://www.emailjs.com" target="_blank" rel="noopener noreferrer" className="text-purple-600 underline">EmailJS</a> para receber notificações quando for @mencionado.
                  </p>
                  <div className="space-y-1.5">
                    <Label htmlFor="ejs-service">Service ID</Label>
                    <Input id="ejs-service" placeholder="service_xxxxxxx" value={ejsServiceId} onChange={e => setEjsServiceId(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ejs-template">Template ID</Label>
                    <Input id="ejs-template" placeholder="template_xxxxxxx" value={ejsTemplateId} onChange={e => setEjsTemplateId(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ejs-key">Public Key</Label>
                    <Input id="ejs-key" placeholder="XXXXXXXXXXXXXXXXXX" value={ejsPublicKey} onChange={e => setEjsPublicKey(e.target.value)} />
                  </div>
                  <p className="text-xs text-gray-400">
                    O template deve ter as variáveis: <code className="bg-gray-100 px-1 rounded">{'{{to_email}}'}</code>, <code className="bg-gray-100 px-1 rounded">{'{{from_email}}'}</code>, <code className="bg-gray-100 px-1 rounded">{'{{project_name}}'}</code>, <code className="bg-gray-100 px-1 rounded">{'{{module_name}}'}</code>, <code className="bg-gray-100 px-1 rounded">{'{{excerpt}}'}</code>
                  </p>
                </div>
              )}
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
              <div className="w-full border-t border-gray-100" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-xs text-gray-400">ou</span>
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
          <p className="text-center text-xs text-gray-400 mt-2">
            Dados de exemplo — sem persistência, sem GitHub necessário.
          </p>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Dados armazenados no seu repositório GitHub privado.
        </p>
      </div>
    </div>
  )
}
