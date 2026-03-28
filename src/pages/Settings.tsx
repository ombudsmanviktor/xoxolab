import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Bell, BellOff, Github, GitBranch, Mail, CheckCircle2, Save, Trash2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getEmailJSConfig, type EmailJSConfig } from '@/lib/emailjs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function Settings() {
  const { session, updateEmailJSConfig } = useAuth()
  const navigate = useNavigate()

  // EmailJS state — pre-loaded from localStorage
  const [serviceId, setServiceId] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [publicKey, setPublicKey] = useState('')
  const [saved, setSaved] = useState(false)
  const [cleared, setCleared] = useState(false)

  const isConfigured = !!(serviceId && templateId && publicKey)

  useEffect(() => {
    const cfg = getEmailJSConfig()
    if (cfg) {
      setServiceId(cfg.serviceId)
      setTemplateId(cfg.templateId)
      setPublicKey(cfg.publicKey)
    }
  }, [])

  function handleSave() {
    if (!serviceId.trim() || !templateId.trim() || !publicKey.trim()) return
    const cfg: EmailJSConfig = {
      serviceId: serviceId.trim(),
      templateId: templateId.trim(),
      publicKey: publicKey.trim(),
    }
    updateEmailJSConfig(cfg)
    setSaved(true)
    setCleared(false)
    setTimeout(() => setSaved(false), 2500)
  }

  function handleClear() {
    updateEmailJSConfig(null)
    setServiceId('')
    setTemplateId('')
    setPublicKey('')
    setCleared(true)
    setSaved(false)
    setTimeout(() => setCleared(false), 2500)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-violet-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate('/projects')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Projetos
        </button>
        <div className="h-4 w-px bg-gray-200" />
        <span className="font-semibold text-gray-900">Configurações da Conta</span>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">

        {/* Conta */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="font-semibold text-gray-900 text-base">Conta</h2>

          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Email</p>
                <p className="text-sm text-gray-800 font-medium">{session?.email}</p>
              </div>
            </div>

            {!session?.isDemo && (
              <>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Github className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Repositório GitHub</p>
                    <p className="text-sm text-gray-800 font-medium font-mono">
                      {session?.githubConfig.owner}/{session?.githubConfig.repo}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <GitBranch className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Branch</p>
                    <p className="text-sm text-gray-800 font-medium font-mono">
                      {session?.githubConfig.branch}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>

          <p className="text-xs text-gray-400">
            Para alterar o repositório ou token de acesso, faça logout e entre novamente.
          </p>
        </section>

        {/* Notificações por Email */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-purple-500" />
              <h2 className="font-semibold text-gray-900 text-base">Notificações por Email</h2>
            </div>
            <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
              isConfigured
                ? 'bg-green-50 text-green-700'
                : 'bg-gray-100 text-gray-400'
            }`}>
              {isConfigured
                ? <><CheckCircle2 className="w-3.5 h-3.5" /> Configurado</>
                : <><BellOff className="w-3.5 h-3.5" /> Não configurado</>
              }
            </span>
          </div>

          <p className="text-sm text-gray-500">
            Configure uma conta no{' '}
            <a
              href="https://www.emailjs.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-600 underline"
            >
              EmailJS
            </a>{' '}
            para receber notificações por email quando for @mencionado em pautas, avisos ou
            comentários, e lembretes de eventos do módulo Efemérides.
          </p>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ejs-service">Service ID</Label>
              <Input
                id="ejs-service"
                placeholder="service_xxxxxxx"
                value={serviceId}
                onChange={e => setServiceId(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ejs-template">Template ID</Label>
              <Input
                id="ejs-template"
                placeholder="template_xxxxxxx"
                value={templateId}
                onChange={e => setTemplateId(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ejs-key">Public Key</Label>
              <Input
                id="ejs-key"
                placeholder="XXXXXXXXXXXXXXXXXX"
                value={publicKey}
                onChange={e => setPublicKey(e.target.value)}
              />
            </div>

            <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 space-y-1">
              <p className="font-medium text-gray-600">Variáveis necessárias no template EmailJS:</p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {['{{to_email}}', '{{from_email}}', '{{project_name}}', '{{module_name}}', '{{excerpt}}'].map(v => (
                  <code key={v} className="bg-white border border-gray-200 px-1.5 py-0.5 rounded text-purple-700">{v}</code>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <Button
                onClick={handleSave}
                disabled={!serviceId.trim() || !templateId.trim() || !publicKey.trim()}
                className="gap-2"
              >
                {saved
                  ? <><CheckCircle2 className="w-4 h-4" /> Salvo!</>
                  : <><Save className="w-4 h-4" /> Salvar configuração</>
                }
              </Button>

              {isConfigured && (
                <Button
                  variant="outline"
                  onClick={handleClear}
                  className="gap-2 text-red-500 border-red-200 hover:bg-red-50 hover:text-red-700"
                >
                  {cleared
                    ? <><CheckCircle2 className="w-4 h-4" /> Removido</>
                    : <><Trash2 className="w-4 h-4" /> Remover configuração</>
                  }
                </Button>
              )}
            </div>

            <p className="text-xs text-gray-400">
              As credenciais são armazenadas apenas no seu navegador (localStorage) e nunca são
              enviadas para nenhum servidor além do EmailJS.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
