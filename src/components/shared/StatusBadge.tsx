import { cn } from '@/lib/utils'

type NodeStatus = 'online' | 'recent' | 'offline' | 'ephemeral' | 'expired'
type KeyStatus = 'active' | 'expiring-soon' | 'expired' | 'used'
type RouteStatus = 'approved' | 'pending' | 'disabled'

const nodeStatusConfig: Record<NodeStatus, { label: string; dot: string; text: string }> = {
  online:    { label: 'Online',    dot: 'bg-emerald-400 animate-[pulse-dot_2s_ease-in-out_infinite]', text: 'text-emerald-400' },
  recent:    { label: 'Recent',    dot: 'bg-amber-400',  text: 'text-amber-400' },
  offline:   { label: 'Offline',   dot: 'bg-red-400',    text: 'text-red-400' },
  ephemeral: { label: 'Ephemeral', dot: 'bg-purple-400', text: 'text-purple-400' },
  expired:   { label: 'Expired',   dot: 'bg-[var(--color-text-disabled)]', text: 'text-[var(--color-text-muted)]' },
}

const keyStatusConfig: Record<KeyStatus, { label: string; dot: string; text: string }> = {
  active:         { label: 'Active',        dot: 'bg-emerald-400', text: 'text-emerald-400' },
  'expiring-soon': { label: 'Expiring Soon', dot: 'bg-amber-400',   text: 'text-amber-400' },
  expired:        { label: 'Expired',       dot: 'bg-[var(--color-text-muted)]', text: 'text-[var(--color-text-muted)] line-through' },
  used:           { label: 'Used',          dot: 'bg-[var(--color-text-muted)]', text: 'text-[var(--color-text-muted)]' },
}

const routeStatusConfig: Record<RouteStatus, { label: string; dot: string; text: string }> = {
  approved: { label: 'Approved', dot: 'bg-emerald-400', text: 'text-emerald-400' },
  pending:  { label: 'Pending',  dot: 'bg-amber-400',   text: 'text-amber-400' },
  disabled: { label: 'Disabled', dot: 'bg-[var(--color-text-muted)]', text: 'text-[var(--color-text-muted)]' },
}

export function NodeStatusBadge({ status, className }: { status: NodeStatus; className?: string }) {
  const cfg = nodeStatusConfig[status]
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-sm', className)}>
      <span className={cn('w-2 h-2 rounded-full flex-shrink-0', cfg.dot)} />
      <span className={cfg.text}>{cfg.label}</span>
    </span>
  )
}

export function KeyStatusBadge({ status, className }: { status: KeyStatus; className?: string }) {
  const cfg = keyStatusConfig[status]
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-sm', className)}>
      <span className={cn('w-2 h-2 rounded-full flex-shrink-0', cfg.dot)} />
      <span className={cfg.text}>{cfg.label}</span>
    </span>
  )
}

export function RouteStatusBadge({ status, className }: { status: RouteStatus; className?: string }) {
  const cfg = routeStatusConfig[status]
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-sm', className)}>
      <span className={cn('w-2 h-2 rounded-full flex-shrink-0', cfg.dot)} />
      <span className={cfg.text}>{cfg.label}</span>
    </span>
  )
}

export function Badge({
  variant = 'default',
  children,
  className,
}: {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted'
  children: React.ReactNode
  className?: string
}) {
  const variantClasses = {
    default: 'bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] border border-[var(--color-border)]',
    success: 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/20',
    warning: 'bg-amber-400/10 text-amber-400 border border-amber-400/20',
    danger:  'bg-red-400/10 text-red-400 border border-red-400/20',
    info:    'bg-[var(--color-accent-subtle)] text-[var(--color-accent)] border border-[var(--color-accent)]/20',
    muted:   'bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)] border border-[var(--color-border)]',
  }
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', variantClasses[variant], className)}>
      {children}
    </span>
  )
}
