import { Moon, Sun, Monitor as SystemIcon, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/stores/ui'
import { useIsFetching } from '@tanstack/react-query'
import type { Theme } from '@/stores/ui'

export function TopBar() {
  const { theme, setTheme } = useUIStore()
  const isFetching = useIsFetching()

  const themes: { value: Theme; icon: React.ReactNode; label: string }[] = [
    { value: 'dark',   icon: <Moon size={14} />,        label: 'Dark' },
    { value: 'light',  icon: <Sun size={14} />,         label: 'Light' },
    { value: 'system', icon: <SystemIcon size={14} />,  label: 'System' },
  ]

  const nextTheme = themes[(themes.findIndex(t => t.value === theme) + 1) % themes.length]

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg-surface)] flex-shrink-0">
      <div className="flex items-center gap-2">
        {/* Background refresh indicator */}
        {isFetching > 0 && (
          <RefreshCw size={13} className="text-[var(--color-text-muted)] animate-spin" />
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <button
          onClick={() => setTheme(nextTheme.value)}
          className="p-2 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)] transition-colors"
          title={`Switch to ${nextTheme.label} mode`}
        >
          {themes.find(t => t.value === theme)?.icon}
        </button>
      </div>
    </header>
  )
}

interface PageHeaderProps {
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function PageHeader({ title, description, action, className }: PageHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between mb-6', className)}>
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">{title}</h1>
        {description && (
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">{description}</p>
        )}
      </div>
      {action && <div className="flex-shrink-0 ml-4">{action}</div>}
    </div>
  )
}
