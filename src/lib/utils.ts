import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffSec < 60) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDay < 30) return `${diffDay}d ago`
  return d.toLocaleDateString()
}

export function formatAbsoluteTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatExpiry(date: string | Date | null | undefined): string {
  if (!date) return 'Never'
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  if (d.getTime() < now.getTime()) return 'Expired'
  const diffMs = d.getTime() - now.getTime()
  const diffDay = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDay === 0) return 'Today'
  if (diffDay === 1) return 'Tomorrow'
  if (diffDay < 30) return `${diffDay}d`
  return d.toLocaleDateString()
}

export function isExpired(date: string | Date | null | undefined): boolean {
  if (!date) return false
  const d = typeof date === 'string' ? new Date(date) : date
  return d.getTime() < Date.now()
}

export function isExpiringSoon(date: string | Date | null | undefined, days = 7): boolean {
  if (!date) return false
  const d = typeof date === 'string' ? new Date(date) : date
  const cutoff = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
  return d.getTime() > Date.now() && d.getTime() < cutoff.getTime()
}

// Use node.online (authoritative from headscale) as primary signal.
// lastSeen is used only to show "recently disconnected" vs long-offline.
export function getNodeStatus(online: boolean, lastSeen?: string | null): 'online' | 'recent' | 'offline' {
  if (online) return 'online'
  if (!lastSeen) return 'offline'
  const diffMin = (Date.now() - new Date(lastSeen).getTime()) / 60_000
  if (diffMin < 15) return 'recent'
  return 'offline'
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text)
}

export function truncateKey(key: string, chars = 20): string {
  if (key.length <= chars + 8) return key
  return key.slice(0, chars) + '...'
}
