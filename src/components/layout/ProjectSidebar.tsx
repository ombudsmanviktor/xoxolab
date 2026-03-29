import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  Megaphone, AlignLeft, Columns3, CalendarDays, BookOpen,
  Link2, Users, KeyRound, ArrowLeft, Menu, X, LogOut, LayoutList,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useProject } from '@/contexts/ProjectContext'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: 'avisos',     label: 'Quadro de Avisos', icon: Megaphone,    activeClass: 'bg-amber-50 text-amber-700',   iconClass: 'text-amber-600' },
  { to: 'pautas',     label: 'Pautas',            icon: AlignLeft,    activeClass: 'bg-orange-50 text-orange-700',  iconClass: 'text-orange-600' },
  { to: 'conteudos',  label: 'Conteúdos',         icon: LayoutList,   activeClass: 'bg-violet-50 text-violet-700',  iconClass: 'text-violet-600' },
  { to: 'kanban',     label: 'Kanban',            icon: Columns3,     activeClass: 'bg-pink-50 text-pink-700',      iconClass: 'text-pink-600' },
  { to: 'efemerides', label: 'Efemérides',        icon: CalendarDays, activeClass: 'bg-blue-50 text-blue-700',    iconClass: 'text-blue-600' },
  { to: 'politicas',  label: 'Políticas',         icon: BookOpen,     activeClass: 'bg-teal-50 text-teal-700',    iconClass: 'text-teal-600' },
  { to: 'recursos',   label: 'Recursos',          icon: Link2,        activeClass: 'bg-emerald-50 text-emerald-700', iconClass: 'text-emerald-600' },
  { to: 'equipe',     label: 'Equipe',            icon: Users,        activeClass: 'bg-indigo-50 text-indigo-700', iconClass: 'text-indigo-600' },
  { to: 'senhas',     label: 'Senhas',            icon: KeyRound,     activeClass: 'bg-slate-50 text-slate-700',  iconClass: 'text-slate-600' },
]

export function ProjectSidebar() {
  const { session, signOut } = useAuth()
  const { projectMeta } = useProject()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <button
          onClick={() => { navigate('/projects'); setMobileOpen(false) }}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm mb-3 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Projetos
        </button>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 flex-shrink-0">
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
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 text-sm truncate">
              {projectMeta?.name ?? 'Carregando…'}
            </p>
            <p className="text-xs text-gray-400">xoxoLAB</p>
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
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
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
      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
            {session?.email.slice(0, 2).toUpperCase()}
          </div>
          <p className="text-xs text-gray-500 truncate flex-1">{session?.email}</p>
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-2 text-xs text-gray-400 hover:text-red-500 transition-colors w-full"
        >
          <LogOut className="w-3 h-3" />
          Sair
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:flex flex-col w-60 bg-white border-r border-gray-100 min-h-screen sticky top-0">
        {sidebarContent}
      </aside>

      {/* Mobile toggle */}
      <button
        className="lg:hidden fixed top-4 left-4 z-40 p-2 bg-white border border-gray-200 rounded-lg shadow-sm"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="w-5 h-5 text-gray-600" />
      </button>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 bg-white flex flex-col shadow-xl">
            <button
              className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600"
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
