import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Monitor, Route, Users, Key, Shield,
  Settings, ChevronLeft, ChevronRight, Wifi, WifiOff, Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/stores/ui'
import { useConnectionStore } from '@/stores/connection'

const navItems = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { type: 'section', label: 'Network' },
  { to: '/nodes', label: 'Nodes', icon: Monitor },
  { to: '/routes', label: 'Routes', icon: Route },
  { type: 'section', label: 'Identity' },
  { to: '/users', label: 'Users', icon: Users },
  { to: '/keys', label: 'Pre-Auth Keys', icon: Key },
  { type: 'section', label: 'Policy' },
  { to: '/acl', label: 'ACL Editor', icon: Shield },
  { type: 'section', label: 'System' },
  { to: '/apikeys', label: 'API Keys', icon: Key },
  { to: '/settings', label: 'Settings', icon: Settings },
] as const

type NavItem =
  | { type: 'section'; label: string }
  | { to: string; label: string; icon: typeof LayoutDashboard; end?: boolean }

function ConnectionStatus() {
  const { status, headscaleVersion } = useConnectionStore()
  const { sidebarCollapsed } = useUIStore()

  const statusInfo = {
    connected:    { icon: Wifi,    color: 'text-emerald-400', label: headscaleVersion || 'Connected' },
    reconnecting: { icon: Loader2, color: 'text-amber-400',   label: 'Reconnecting...' },
    disconnected: { icon: WifiOff, color: 'text-red-400',     label: 'Disconnected' },
    auth_error:   { icon: WifiOff, color: 'text-red-400',     label: 'Auth Error' },
    unconfigured: { icon: WifiOff, color: 'text-[var(--color-text-muted)]', label: 'Not configured' },
  }

  const info = statusInfo[status]
  const Icon = info.icon

  return (
    <div className={cn(
      'flex items-center gap-2 px-3 py-2 rounded-lg',
      'text-xs text-[var(--color-text-muted)]',
      sidebarCollapsed && 'justify-center',
    )}>
      <Icon
        size={14}
        className={cn(info.color, status === 'reconnecting' && 'animate-spin')}
      />
      {!sidebarCollapsed && <span className="truncate">{info.label}</span>}
    </div>
  )
}

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore()

  return (
    <aside className={cn(
      'flex flex-col h-full bg-[var(--color-bg-surface)] border-r border-[var(--color-border)]',
      'transition-all duration-200 ease-in-out flex-shrink-0',
      sidebarCollapsed ? 'w-14' : 'w-60',
    )}>
      {/* Logo */}
      <div className={cn(
        'flex items-center gap-3 px-4 py-4 border-b border-[var(--color-border)]',
        sidebarCollapsed && 'justify-center px-2',
      )}>
        <div className="w-8 h-8 rounded-lg bg-[var(--color-accent)] flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm">H</span>
        </div>
        {!sidebarCollapsed && (
          <span className="font-semibold text-[var(--color-text-primary)] truncate">Headscale</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {(navItems as unknown as NavItem[]).map((item, i) => {
          if ('type' in item) {
            if (sidebarCollapsed) {
              return <div key={i} className="my-1.5 border-t border-[var(--color-border)]" />
            }
            return (
              <div key={i} className="px-3 pb-1 pt-3 text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                {item.label}
              </div>
            )
          }

          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={'end' in item ? item.end : false}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg mb-0.5 text-sm transition-colors',
                sidebarCollapsed && 'justify-center px-2',
                isActive
                  ? 'bg-[var(--color-accent-subtle)] text-[var(--color-accent)]'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)]',
              )}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <Icon size={16} className="flex-shrink-0" />
              {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          )
        })}
      </nav>

      {/* Footer: connection status + collapse toggle */}
      <div className="border-t border-[var(--color-border)] p-2">
        <ConnectionStatus />
        <button
          onClick={toggleSidebar}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs',
            'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)]',
            'transition-colors',
            sidebarCollapsed && 'justify-center',
          )}
        >
          {sidebarCollapsed
            ? <ChevronRight size={14} />
            : <><ChevronLeft size={14} /><span>Collapse</span></>}
        </button>
      </div>
    </aside>
  )
}
