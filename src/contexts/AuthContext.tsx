import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import {
  saveGitHubConfig,
  clearGitHubConfig,
  testConnection,
  type GitHubConfig,
} from '@/lib/github'
import {
  saveEmailJSConfig,
  clearEmailJSConfig,
  type EmailJSConfig,
} from '@/lib/emailjs'
import { setDemoMode, DEMO_EMAIL } from '@/lib/demoStore'

const SESSION_KEY = 'xoxolab_session'
const DEMO_SESSION_KEY = 'xoxolab_demo'

// Dummy config used only to satisfy the type — never used for real GitHub calls
const DEMO_GITHUB_CONFIG: GitHubConfig = { token: '', owner: '', repo: '', branch: 'main' }

export interface AuthSession {
  email: string
  githubConfig: GitHubConfig
  emailJSConfig?: EmailJSConfig
  isDemo?: boolean
}

interface AuthContextType {
  session: AuthSession | null
  loading: boolean
  isDemoMode: boolean
  signIn: (
    email: string,
    githubConfig: GitHubConfig,
    emailJSConfig?: EmailJSConfig
  ) => Promise<{ ok: boolean; error?: string }>
  signInDemo: () => void
  signOut: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      if (localStorage.getItem(DEMO_SESSION_KEY) === 'true') {
        setDemoMode(true)
        setSession({ email: DEMO_EMAIL, githubConfig: DEMO_GITHUB_CONFIG, isDemo: true })
        setLoading(false)
        return
      }
      const raw = localStorage.getItem(SESSION_KEY)
      if (raw) {
        const s = JSON.parse(raw) as AuthSession
        if (s.email && s.githubConfig?.token) {
          setSession(s)
        }
      }
    } catch {
      // ignore
    }
    setLoading(false)
  }, [])

  async function signIn(
    email: string,
    githubConfig: GitHubConfig,
    emailJSConfig?: EmailJSConfig
  ): Promise<{ ok: boolean; error?: string }> {
    const result = await testConnection(githubConfig)
    if (!result.ok) return result

    saveGitHubConfig(githubConfig)
    if (emailJSConfig) saveEmailJSConfig(emailJSConfig)

    const s: AuthSession = { email, githubConfig, emailJSConfig }
    localStorage.setItem(SESSION_KEY, JSON.stringify(s))
    setSession(s)
    return { ok: true }
  }

  function signInDemo() {
    setDemoMode(true)
    localStorage.setItem(DEMO_SESSION_KEY, 'true')
    const s: AuthSession = { email: DEMO_EMAIL, githubConfig: DEMO_GITHUB_CONFIG, isDemo: true }
    setSession(s)
  }

  function signOut() {
    setDemoMode(false)
    clearGitHubConfig()
    clearEmailJSConfig()
    localStorage.removeItem(SESSION_KEY)
    localStorage.removeItem(DEMO_SESSION_KEY)
    setSession(null)
  }

  const isDemoMode = session?.isDemo === true

  return (
    <AuthContext.Provider value={{ session, loading, isDemoMode, signIn, signInDemo, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
