import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Key, Plus, Trash2, Clock, Copy, Check, AlertTriangle } from 'lucide-react'

import { apiKeysApi } from '@/api/keys'
import { useConnectionStore } from '@/stores/connection'
import { PageHeader } from '@/components/layout/TopBar'
import { Badge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { SkeletonRow } from '@/components/shared/SkeletonRow'
import { cn, formatAbsoluteTime, formatExpiry, isExpired, isExpiringSoon, copyToClipboard } from '@/lib/utils'
import type { HeadscaleApiKey } from '@/api/types'

type ExpiryPreset = '30d' | '90d' | '1y' | 'never' | 'custom'

const EXPIRY_PRESETS: { value: ExpiryPreset; label: string }[] = [
  { value: '30d',    label: '30 days' },
  { value: '90d',    label: '90 days' },
  { value: '1y',     label: '1 year' },
  { value: 'never',  label: 'Never' },
  { value: 'custom', label: 'Custom' },
]

function expiryPresetToDate(preset: ExpiryPreset, custom?: string): string {
  const now = new Date()
  switch (preset) {
    case '30d':   now.setDate(now.getDate() + 30); break
    case '90d':   now.setDate(now.getDate() + 90); break
    case '1y':    now.setFullYear(now.getFullYear() + 1); break
    case 'never': now.setFullYear(now.getFullYear() + 100); break
    case 'custom': return custom ? new Date(custom).toISOString() : now.toISOString()
  }
  return now.toISOString()
}

function KeyStatusBadge({ apiKey }: { apiKey: HeadscaleApiKey }) {
  if (isExpired(apiKey.expiration)) return <Badge variant="muted">Expired</Badge>
  if (isExpiringSoon(apiKey.expiration, 30)) return <Badge variant="warning">Expiring Soon</Badge>
  return <Badge variant="success">Active</Badge>
}

// One-time key reveal modal
function KeyRevealModal({ prefix, keyValue, onDone }: { prefix: string; keyValue: string; onDone: () => void }) {
  const [copied, setCopied] = useState(false)
  const [countdown, setCountdown] = useState(3)

  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(c => c - 1), 1000)
      return () => clearTimeout(t)
    }
  }, [countdown])

  const handleCopy = async () => {
    await copyToClipboard(keyValue)
    setCopied(true)
    toast.success('API key copied')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-lg mx-4 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-xl shadow-2xl" style={{ animation: 'fade-in 0.15s ease-out' }}>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-emerald-400/10 flex items-center justify-center">
              <Key size={18} className="text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[var(--color-text-primary)]">API Key Created</h3>
              <p className="text-xs text-[var(--color-text-muted)]">Prefix: {prefix}</p>
            </div>
          </div>

          <div className="bg-amber-400/10 border border-amber-400/30 rounded-lg px-3 py-2.5 mb-4 flex items-center gap-2 text-sm text-amber-400">
            <AlertTriangle size={14} className="flex-shrink-0" />
            Copy this key now — it will not be shown again.
          </div>

          <div className="flex items-center gap-2 bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded-lg p-3 mb-4">
            <code className="flex-1 font-mono text-sm text-[var(--color-text-primary)] break-all">{keyValue}</code>
            <button onClick={handleCopy} className="flex-shrink-0 p-2 rounded hover:bg-[var(--color-bg-elevated)] transition-colors text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]">
              {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
            </button>
          </div>

          <button
            onClick={handleCopy}
            className="w-full py-2.5 mb-3 bg-emerald-400/10 hover:bg-emerald-400/20 text-emerald-400 border border-emerald-400/30 rounded-lg text-sm font-medium transition-colors"
          >
            {copied ? <span className="flex items-center justify-center gap-2"><Check size={14} /> Copied!</span> : 'Copy Key'}
          </button>

          <button
            onClick={onDone}
            disabled={countdown > 0}
            className="w-full py-2 text-sm font-medium text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:bg-[var(--color-bg-subtle)] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {countdown > 0 ? `Done (${countdown})` : 'Done'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function ApiKeysPage() {
  const queryClient = useQueryClient()
  const { apiKey: currentKey } = useConnectionStore()

  const [showCreate, setShowCreate] = useState(false)
  const [expiryPreset, setExpiryPreset] = useState<ExpiryPreset>('90d')
  const [customExpiry, setCustomExpiry] = useState('')
  const [confirmExpire, setConfirmExpire] = useState<HeadscaleApiKey | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<HeadscaleApiKey | null>(null)
  const [newKey, setNewKey] = useState<{ prefix: string; keyValue: string } | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: apiKeysApi.list,
    refetchInterval: 30_000,
  })

  const createMutation = useMutation({
    mutationFn: () => apiKeysApi.create(expiryPresetToDate(expiryPreset, customExpiry)),
    onSuccess: (data) => {
      const keyValue = data.apiKey
      // Derive the prefix: "hskey-api-XXXXX-" — first 3 dash-segments + trailing dash
      const prefix = keyValue.split('-').slice(0, 3).join('-') + '-'
      setNewKey({ prefix, keyValue })
      setShowCreate(false)
      setExpiryPreset('90d')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const expireMutation = useMutation({
    mutationFn: (prefix: string) => apiKeysApi.expire(prefix),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
      toast.success('API key expired')
      setConfirmExpire(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (prefix: string) => apiKeysApi.delete(prefix),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
      toast.success('API key deleted')
      setConfirmDelete(null)
    },
    onError: (e: Error) => {
      // "record not found" means headscale already cleaned up the expired key — treat as deleted
      if (e.message.toLowerCase().includes('record not found')) {
        queryClient.invalidateQueries({ queryKey: ['api-keys'] })
        toast.success('API key removed')
        setConfirmDelete(null)
      } else {
        toast.error(`Failed to delete key: ${e.message}`)
      }
    },
  })

  const apiKeys = data?.apiKeys ?? []

  const isCurrentKey = (key: HeadscaleApiKey) => currentKey.startsWith(key.prefix)

  return (
    <div>
      <PageHeader
        title="API Keys"
        description="Keys for programmatic access to the headscale API"
        action={
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus size={16} /> Create API Key
          </button>
        }
      />

      <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-xs text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="text-left px-5 py-3 font-medium">Prefix</th>
                <th className="text-left px-5 py-3 font-medium">Status</th>
                <th className="text-left px-5 py-3 font-medium">Created</th>
                <th className="text-left px-5 py-3 font-medium">Expires</th>
                <th className="text-left px-5 py-3 font-medium">Last Used</th>
                <th className="text-right px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} cols={6} />)
              ) : apiKeys.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState icon={Key} title="No API keys" description="Create an API key for programmatic headscale access" />
                  </td>
                </tr>
              ) : (
                apiKeys.map(key => (
                  <tr
                    key={key.id}
                    className={cn(
                      'border-b border-[var(--color-border)] hover:bg-[var(--color-bg-subtle)] transition-colors',
                      isExpiringSoon(key.expiration, 30) && 'border-l-2 border-l-amber-400',
                    )}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <code className="font-mono text-sm text-[var(--color-text-primary)]">{key.prefix}...</code>
                        {isCurrentKey(key) && <Badge variant="info">In Use</Badge>}
                      </div>
                    </td>
                    <td className="px-5 py-3"><KeyStatusBadge apiKey={key} /></td>
                    <td className="px-5 py-3 text-sm text-[var(--color-text-muted)]">{formatAbsoluteTime(key.createdAt)}</td>
                    <td className="px-5 py-3 text-sm">
                      <span className={cn(isExpiringSoon(key.expiration, 30) ? 'text-amber-400' : 'text-[var(--color-text-muted)]')}>
                        {formatExpiry(key.expiration)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-[var(--color-text-muted)]">
                      {key.lastSeen ? formatAbsoluteTime(key.lastSeen) : '—'}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setConfirmExpire(key)}
                          disabled={isExpired(key.expiration)}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-[var(--color-text-muted)] hover:text-amber-400 border border-[var(--color-border)] hover:border-amber-400/30 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Clock size={11} /> Expire
                        </button>
                        <button
                          onClick={() => setConfirmDelete(key)}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-[var(--color-text-muted)] hover:text-red-400 border border-[var(--color-border)] hover:border-red-400/30 rounded-lg transition-colors"
                        >
                          <Trash2 size={11} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create panel */}
      {showCreate && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative z-10 w-full max-w-md mx-4 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-xl shadow-2xl" style={{ animation: 'fade-in 0.15s ease-out' }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
              <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Create API Key</h2>
              <button onClick={() => setShowCreate(false)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">Expiry</label>
                <div className="space-y-2">
                  {EXPIRY_PRESETS.map(p => (
                    <label key={p.value} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="expiry"
                        value={p.value}
                        checked={expiryPreset === p.value}
                        onChange={() => setExpiryPreset(p.value)}
                        className="accent-[var(--color-accent)]"
                      />
                      <span className="text-sm text-[var(--color-text-secondary)]">{p.label}</span>
                    </label>
                  ))}
                </div>
                {expiryPreset === 'custom' && (
                  <input
                    type="datetime-local"
                    value={customExpiry}
                    onChange={e => setCustomExpiry(e.target.value)}
                    className="mt-3 w-full px-3 py-2 text-sm bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
                  />
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 px-5 py-4 border-t border-[var(--color-border)]">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] border border-[var(--color-border)] rounded-lg">
                Cancel
              </button>
              <button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
                className="px-4 py-2 text-sm font-medium bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white rounded-lg disabled:opacity-50"
              >
                {createMutation.isPending ? 'Creating...' : 'Create Key'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm dialogs */}
      <ConfirmDialog
        open={!!confirmExpire}
        onClose={() => setConfirmExpire(null)}
        onConfirm={() => { if (confirmExpire) expireMutation.mutate(confirmExpire.prefix) }}
        title="Expire API key"
        description={
          confirmExpire && isCurrentKey(confirmExpire)
            ? '⚠️ This is the key the UI is currently using. Expiring it will disconnect the UI.'
            : `Expire key ${confirmExpire?.prefix}...? It will no longer work.`
        }
        confirmLabel="Expire"
        variant={confirmExpire && isCurrentKey(confirmExpire) ? 'danger' : 'warning'}
        loading={expireMutation.isPending}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => { if (confirmDelete) deleteMutation.mutate(confirmDelete.prefix) }}
        title="Delete API key"
        description={`Permanently delete key ${confirmDelete?.prefix}...? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleteMutation.isPending}
      />

      {/* One-time reveal */}
      {newKey && (
        <KeyRevealModal
          prefix={newKey.prefix}
          keyValue={newKey.keyValue}
          onDone={() => {
            setNewKey(null)
            queryClient.invalidateQueries({ queryKey: ['api-keys'] })
          }}
        />
      )}
    </div>
  )
}
