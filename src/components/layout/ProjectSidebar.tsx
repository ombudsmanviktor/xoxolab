import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  Megaphone, AlignLeft, Columns3, CalendarDays, BookOpen,
  Link2, Users, KeyRound, ArrowLeft, Menu, X, LogOut, LayoutList,
  Sun, Moon,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useProject } from '@/contexts/ProjectContext'
import { useTheme } from '@/contexts/ThemeContext'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: 'avisos',     label: 'Quadro de Avisos', icon: Megaphone,    activeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',   iconClass: 'text-amber-600' },
  { to: 'pautas',     label: 'Pautas',            icon: AlignLeft,    activeClass: 'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300',  iconClass: 'text-orange-600' },
  { to: 'conteudos',  label: 'Conteúdos',         icon: LayoutList,   activeClass: 'bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300',  iconClass: 'text-violet-500' },
  { to: 'kanban',     label: 'Kanban',            icon: Columns3,     activeClass: 'bg-pink-50 text-pink-700 dark:bg-pink-950 dark:text-pink-300',          iconClass: 'text-pink-600' },
  { to: 'efemerides', label: 'Efemérides',        icon: CalendarDays, activeClass: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',          iconClass: 'text-blue-600' },
  { to: 'politicas',  label: 'Políticas',         icon: BookOpen,     activeClass: 'bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300',          iconClass: 'text-teal-600' },
  { to: 'recursos',   label: 'Recursos',          icon: Link2,        activeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300', iconClass: 'text-emerald-600' },
  { to: 'equipe',     label: 'Equipe',            icon: Users,        activeClass: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',   iconClass: 'text-indigo-600' },
  { to: 'senhas',     label: 'Senhas',            icon: KeyRound,     activeClass: 'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300',       iconClass: 'text-slate-600' },
]

const AppLogo = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" className="w-full h-full">
    <defs><linearGradient id="sg" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#a78bfa"/><stop offset="100%" stopColor="#6d28d9"/></linearGradient></defs>
    <rect width="32" height="32" rx="9" fill="url(#sg)"/>
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
)

function ThemeToggleButton({ small = false }: { small?: boolean }) {
  const { isDark, toggle } = useTheme()
  return (
    <button
      onClick={toggle}
      title={isDark ? 'Modo claro' : 'Modo escuro'}
      className={cn(
        'rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
        small ? 'p-1.5' : 'p-2'
      )}
    >
      {isDark
        ? <Sun className={cn(small ? 'w-3.5 h-3.5' : 'w-4 h-4')} />
        : <Moon className={cn(small ? 'w-3.5 h-3.5' : 'w-4 h-4')} />
      }
    </button>
  )
}

export function ProjectSidebar() {
  const { session, signOut } = useAuth()
  const { projectMeta } = useProject()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-700">
        <button
          onClick={() => { navigate('/projects'); setMobileOpen(false) }}
          className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm mb-3 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Projetos
        </button>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 flex-shrink-0">
            <AppLogo />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">
              {projectMeta?.name ?? 'Carregando…'}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">xoxoLAB</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ to, label, icon: Icon, activeClass, iconClass }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? activeClass
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={cn('w-4 h-4 flex-shrink-0', isActive ? '' : iconClass)} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 flex items-center justify-center text-xs font-semibold flex-shrink-0">
            {session?.email.slice(0, 2).toUpperCase()}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate flex-1">{session?.email}</p>
        </div>
        <div className="flex items-center justify-between">
          <button
            onClick={signOut}
            className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
          >
            <LogOut className="w-3 h-3" />
            Sair
          </button>
          <ThemeToggleButton small />
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-700 min-h-screen sticky top-0">
        {sidebarContent}
      </aside>

      {/* Mobile top bar — replaces the old floating button */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-30 h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center px-3 gap-2">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <Menu className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 flex-shrink-0">
            <AppLogo />
          </div>
          <span className="font-semibold text-gray-900 dark:text-white text-sm">xoxoLAB</span>
        </div>
        <div className="ml-auto">
          <ThemeToggleButton />
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 bg-white dark:bg-gray-900 flex flex-col shadow-xl">
            <button
              className="absolute top-4 right-4 p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              onClick={() => setMobileOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  )
}
