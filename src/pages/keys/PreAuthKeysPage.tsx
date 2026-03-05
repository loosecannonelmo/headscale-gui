// src/pages/keys/PreAuthKeysPage.tsx

import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Key, Plus, X, ChevronDown, Clock, Tag, AlertTriangle,
  ShieldCheck, Repeat, Zap, Copy, Check,
} from 'lucide-react'

import { preAuthKeysApi, getPreAuthKeyStatus } from '@/api/keys'
import { usersApi } from '@/api/users'
import type { HeadscalePreAuthKey, HeadscaleUser, CreatePreAuthKeyRequest } from '@/api/types'

import { PageHeader } from '@/components/layout/TopBar'
import { KeyStatusBadge, Badge } from '@/components/shared/StatusBadge'
import { CopyButton } from '@/components/shared/CopyButton'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { SkeletonRow } from '@/components/shared/SkeletonRow'

import { cn, formatExpiry, formatAbsoluteTime, formatRelativeTime, isExpiringSoon, truncateKey, copyToClipboard } from '@/lib/utils'

// ── Types ────────────────────────────────────────────────────────────────────

type StatusFilter = 'all' | 'active' | 'expiring-soon' | 'expired' | 'used'

type ExpiryPreset = '1h' | '24h' | '7d' | '30d' | '90d' | '1y' | 'custom'

interface CreateFormState {
  user: string
  reusable: boolean
  ephemeral: boolean
  expiryPreset: ExpiryPreset
  customExpiry: string
  tagInput: string
  aclTags: string[]
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function expiryPresetToDate(preset: ExpiryPreset, customExpiry: string): string {
  const now = new Date()
  switch (preset) {
    case '1h':  return new Date(now.getTime() + 1 * 60 * 60 * 1000).toISOString()
    case '24h': return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
    case '7d':  return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
    case '30d': return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
    case '90d': return new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString()
    case '1y':  return new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString()
    case 'custom':
      return customExpiry ? new Date(customExpiry).toISOString() : new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString()
  }
}

const EXPIRY_PRESETS: { value: ExpiryPreset; label: string }[] = [
  { value: '1h',     label: '1 hour' },
  { value: '24h',    label: '24 hours' },
  { value: '7d',     label: '7 days' },
  { value: '30d',    label: '30 days' },
  { value: '90d',    label: '90 days (default)' },
  { value: '1y',     label: '1 year' },
  { value: 'custom', label: 'Custom' },
]

// ── One-time reveal modal ─────────────────────────────────────────────────────

function KeyRevealModal({
  keyValue,
  onDone,
}: {
  keyValue: string
  onDone: () => void
}) {
  const [countdown, setCountdown] = useState(3)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  const handleCopy = async () => {
    try {
      await copyToClipboard(keyValue)
      setCopied(true)
      toast.success('Key copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy — please select and copy manually')
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-lg mx-4 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-xl shadow-2xl"
        style={{ animation: 'fade-in 0.15s ease-out' }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-6 pt-6 pb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center flex-shrink-0">
            <ShieldCheck size={18} className="text-emerald-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
              Pre-auth key created
            </h2>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              This key will not be shown again
            </p>
          </div>
        </div>

        {/* Warning banner */}
        <div className="mx-6 mb-4 px-3 py-2.5 bg-amber-400/8 border border-amber-400/20 rounded-lg flex items-start gap-2">
          <AlertTriangle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-400/90">
            Copy this key now — it will not be shown again. Store it somewhere safe.
          </p>
        </div>

        {/* Key display */}
        <div className="mx-6 mb-4">
          <div className="relative bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded-lg p-4">
            <p className="font-mono text-sm text-[var(--color-text-primary)] break-all leading-relaxed pr-2 select-all">
              {keyValue}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 px-6 pb-6">
          <button
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-medium rounded-lg transition-colors"
          >
            {copied
              ? <><Check size={14} /> Copied!</>
              : <><Copy size={14} /> Copy Key</>}
          </button>
          <button
            onClick={onDone}
            disabled={countdown > 0}
            className={cn(
              'px-5 py-2.5 text-sm font-medium rounded-lg transition-colors',
              countdown > 0
                ? 'bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)] cursor-not-allowed'
                : 'bg-[var(--color-bg-elevated)] hover:bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)] border border-[var(--color-border)]',
            )}
          >
            {countdown > 0 ? `Done (${countdown})` : 'Done'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Toggle Switch ─────────────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
  id,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  id: string
}) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-150',
        'focus-visible:outline-2 focus-visible:outline-[var(--color-accent)]',
        checked ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-bg-elevated)]',
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-150',
          checked ? 'translate-x-4' : 'translate-x-0',
        )}
      />
    </button>
  )
}

// ── Create Key Panel ──────────────────────────────────────────────────────────

function CreateKeyPanel({
  users,
  onClose,
  onCreated,
}: {
  users: HeadscaleUser[]
  onClose: () => void
  onCreated: (key: string) => void
}) {
  const [form, setForm] = useState<CreateFormState>({
    user: users[0]?.id ?? '',
    reusable: false,
    ephemeral: false,
    expiryPreset: '90d',
    customExpiry: '',
    tagInput: '',
    aclTags: [],
  })

  const tagInputRef = useRef<HTMLInputElement>(null)

  const update = useCallback(<K extends keyof CreateFormState>(key: K, value: CreateFormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }, [])

  // Tag management
  const addTag = useCallback((raw: string) => {
    const tags = raw
      .split(',')
      .map(t => t.trim())
      .filter(Boolean)
      .map(t => t.startsWith('tag:') ? t : `tag:${t}`)
      .filter(t => !form.aclTags.includes(t))
    if (tags.length > 0) {
      setForm(prev => ({ ...prev, aclTags: [...prev.aclTags, ...tags], tagInput: '' }))
    } else {
      setForm(prev => ({ ...prev, tagInput: '' }))
    }
  }, [form.aclTags])

  const removeTag = useCallback((tag: string) => {
    setForm(prev => ({ ...prev, aclTags: prev.aclTags.filter(t => t !== tag) }))
  }, [])

  const handleTagKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(form.tagInput)
    } else if (e.key === 'Backspace' && form.tagInput === '' && form.aclTags.length > 0) {
      setForm(prev => ({ ...prev, aclTags: prev.aclTags.slice(0, -1) }))
    }
  }, [form.tagInput, form.aclTags, addTag])

  const mutation = useMutation({
    mutationFn: (req: CreatePreAuthKeyRequest) => preAuthKeysApi.create(req),
    onSuccess: (data) => {
      // The create response includes the plaintext key
      const key = (data as unknown as { preAuthKey: HeadscalePreAuthKey & { key: string } }).preAuthKey.key
      onCreated(key)
    },
    onError: (err: Error) => {
      toast.error(`Failed to create key: ${err.message}`)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.user) {
      toast.error('Please select a user')
      return
    }
    mutation.mutate({
      user: form.user,
      reusable: form.reusable,
      ephemeral: form.ephemeral,
      expiration: expiryPresetToDate(form.expiryPreset, form.customExpiry),
      aclTags: form.aclTags,
    })
  }

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <aside
        className="fixed right-0 top-0 bottom-0 z-50 w-[420px] bg-[var(--color-bg-surface)] border-l border-[var(--color-border)] flex flex-col shadow-2xl"
        style={{ animation: 'slide-in-right 0.2s ease-out' }}
        role="dialog"
        aria-modal="true"
        aria-label="Generate pre-auth key"
      >
        {/* Panel header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--color-accent-subtle)] flex items-center justify-center">
              <Key size={15} className="text-[var(--color-accent)]" />
            </div>
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Generate Pre-Auth Key</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)] transition-colors"
            aria-label="Close panel"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form body — scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 space-y-6">

            {/* User */}
            <div>
              <label htmlFor="pak-user" className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">
                User <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <select
                  id="pak-user"
                  value={form.user}
                  onChange={e => update('user', e.target.value)}
                  required
                  className="w-full appearance-none px-3 py-2 pr-8 text-sm bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
                >
                  {users.length === 0 && (
                    <option value="">No users available</option>
                  )}
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none" />
              </div>
            </div>

            {/* Reusable / Ephemeral toggles */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label htmlFor="pak-reusable" className="text-sm font-medium text-[var(--color-text-primary)] flex items-center gap-2">
                    <Repeat size={13} className="text-[var(--color-text-muted)]" />
                    Reusable
                  </label>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5 pl-5">
                    Allow multiple nodes to register with this key
                  </p>
                </div>
                <Toggle
                  id="pak-reusable"
                  checked={form.reusable}
                  onChange={v => update('reusable', v)}
                />
              </div>

              <div className="h-px bg-[var(--color-border)]" />

              <div className="flex items-center justify-between">
                <div>
                  <label htmlFor="pak-ephemeral" className="text-sm font-medium text-[var(--color-text-primary)] flex items-center gap-2">
                    <Zap size={13} className="text-[var(--color-text-muted)]" />
                    Ephemeral
                  </label>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5 pl-5">
                    Nodes expire when they disconnect
                  </p>
                </div>
                <Toggle
                  id="pak-ephemeral"
                  checked={form.ephemeral}
                  onChange={v => update('ephemeral', v)}
                />
              </div>
            </div>

            {/* Expiry */}
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-2 flex items-center gap-1.5">
                <Clock size={12} />
                Expiry
              </label>
              <div className="space-y-1.5">
                {EXPIRY_PRESETS.map(preset => (
                  <label
                    key={preset.value}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors text-sm',
                      form.expiryPreset === preset.value
                        ? 'bg-[var(--color-accent-subtle)] text-[var(--color-accent)]'
                        : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)]',
                    )}
                  >
                    <input
                      type="radio"
                      name="expiry-preset"
                      value={preset.value}
                      checked={form.expiryPreset === preset.value}
                      onChange={() => update('expiryPreset', preset.value)}
                      className="sr-only"
                    />
                    <span
                      className={cn(
                        'w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 flex items-center justify-center',
                        form.expiryPreset === preset.value
                          ? 'border-[var(--color-accent)]'
                          : 'border-[var(--color-border-strong)]',
                      )}
                    >
                      {form.expiryPreset === preset.value && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]" />
                      )}
                    </span>
                    {preset.label}
                  </label>
                ))}
              </div>

              {/* Custom date input */}
              {form.expiryPreset === 'custom' && (
                <div className="mt-2">
                  <input
                    type="datetime-local"
                    value={form.customExpiry}
                    onChange={e => update('customExpiry', e.target.value)}
                    min={new Date(Date.now() + 60_000).toISOString().slice(0, 16)}
                    className="w-full px-3 py-2 text-sm bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
                  />
                </div>
              )}
            </div>

            {/* ACL Tags */}
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5 flex items-center gap-1.5">
                <Tag size={12} />
                ACL Tags
                <span className="text-[var(--color-text-muted)] font-normal">(optional)</span>
              </label>

              {/* Tag chips + input */}
              <div
                className="min-h-[40px] flex flex-wrap gap-1.5 px-3 py-2 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-lg cursor-text focus-within:border-[var(--color-accent)] transition-colors"
                onClick={() => tagInputRef.current?.focus()}
              >
                {form.aclTags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--color-accent-subtle)] border border-[var(--color-accent)]/20 text-[var(--color-accent)] text-xs rounded-full"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="hover:text-red-400 transition-colors"
                      aria-label={`Remove ${tag}`}
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
                <input
                  ref={tagInputRef}
                  type="text"
                  value={form.tagInput}
                  onChange={e => update('tagInput', e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  onBlur={() => { if (form.tagInput) addTag(form.tagInput) }}
                  placeholder={form.aclTags.length === 0 ? 'tag:server, tag:prod' : ''}
                  className="flex-1 min-w-[120px] bg-transparent text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
                />
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                Press Enter or comma to add. Prefix "tag:" added automatically.
              </p>
            </div>

          </div>
        </form>

        {/* Panel footer */}
        <div className="px-6 py-4 border-t border-[var(--color-border)] flex-shrink-0">
          <button
            type="button"
            onClick={handleSubmit as unknown as React.MouseEventHandler}
            disabled={mutation.isPending || !form.user}
            className={cn(
              'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors',
              'bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            {mutation.isPending
              ? <>
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Generating...
                </>
              : <>
                  <Key size={14} />
                  Generate Key
                </>}
          </button>
        </div>
      </aside>
    </>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function PreAuthKeysPage() {
  const queryClient = useQueryClient()

  const [userFilter, setUserFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [panelOpen, setPanelOpen] = useState(false)
  const [revealKey, setRevealKey] = useState<string | null>(null)

  // Confirm dialogs
  const [expireTarget, setExpireTarget] = useState<HeadscalePreAuthKey | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<HeadscalePreAuthKey | null>(null)

  // 1. Fetch users
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.list,
    refetchInterval: 30_000,
  })
  const users = usersData?.users ?? []
  const userNames = users.map(u => u.name)

  // 2. Fan-out per user, aggregate
  const {
    data: allKeys,
    isLoading: keysLoading,
  } = useQuery({
    queryKey: ['preauth-keys', userNames],
    queryFn: async () => {
      const results = await Promise.allSettled(userNames.map(u => preAuthKeysApi.listForUser(u)))
      return results.flatMap(r => r.status === 'fulfilled' ? r.value.preAuthKeys : [])
    },
    enabled: userNames.length > 0,
    refetchInterval: 30_000,
  })

  const keys = allKeys ?? []
  const isLoading = usersLoading || (keysLoading && keys.length === 0)

  // Mutations
  const expireMutation = useMutation({
    mutationFn: (id: string) => preAuthKeysApi.expire(id),
    onSuccess: () => {
      toast.success('Key expired')
      queryClient.invalidateQueries({ queryKey: ['preauth-keys'] })
      setExpireTarget(null)
    },
    onError: (err: Error) => toast.error(`Failed to expire key: ${err.message}`),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => preAuthKeysApi.delete(id),
    onSuccess: () => {
      toast.success('Key deleted')
      queryClient.invalidateQueries({ queryKey: ['preauth-keys'] })
      setDeleteTarget(null)
    },
    onError: (err: Error) => toast.error(`Failed to delete key: ${err.message}`),
  })

  // Filtering
  const filteredKeys = keys.filter(k => {
    if (userFilter !== 'all' && k.user.name !== userFilter) return false
    if (statusFilter !== 'all' && getPreAuthKeyStatus(k) !== statusFilter) return false
    return true
  })

  const handleRevealDone = () => {
    setRevealKey(null)
    setPanelOpen(false)
    queryClient.invalidateQueries({ queryKey: ['preauth-keys'] })
  }

  return (
    <div className="relative">
      <PageHeader
        title="Pre-Auth Keys"
        action={
          <button
            onClick={() => setPanelOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus size={15} />
            Generate Key
          </button>
        }
      />

      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-4">
        {/* User filter */}
        <div className="relative">
          <select
            value={userFilter}
            onChange={e => setUserFilter(e.target.value)}
            className="appearance-none pl-3 pr-8 py-1.5 text-sm bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
          >
            <option value="all">All Users</option>
            {userNames.map(u => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
          <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none" />
        </div>

        {/* Status filter */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as StatusFilter)}
            className="appearance-none pl-3 pr-8 py-1.5 text-sm bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="expiring-soon">Expiring Soon</option>
            <option value="expired">Expired</option>
            <option value="used">Used</option>
          </select>
          <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none" />
        </div>

        {/* Result count */}
        {!isLoading && (
          <span className="text-xs text-[var(--color-text-muted)]">
            {filteredKeys.length} {filteredKeys.length === 1 ? 'key' : 'keys'}
          </span>
        )}
      </div>

      {/* Table */}
      <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Key</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">User</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Reusable</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Ephemeral</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Expires</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Created</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonRow key={i} cols={8} />
                ))
              ) : filteredKeys.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <EmptyState
                      icon={Key}
                      title={
                        userFilter !== 'all' || statusFilter !== 'all'
                          ? 'No keys match your filters'
                          : 'No pre-auth keys yet'
                      }
                      description={
                        userFilter !== 'all' || statusFilter !== 'all'
                          ? 'Try changing the user or status filter.'
                          : 'Generate a key to allow nodes to register without manual approval.'
                      }
                      action={
                        userFilter === 'all' && statusFilter === 'all' ? (
                          <button
                            onClick={() => setPanelOpen(true)}
                            className="flex items-center gap-2 px-3.5 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-medium rounded-lg transition-colors"
                          >
                            <Plus size={14} />
                            Generate Key
                          </button>
                        ) : undefined
                      }
                    />
                  </td>
                </tr>
              ) : (
                filteredKeys.map(key => {
                  const status = getPreAuthKeyStatus(key)
                  const expiringSoon = isExpiringSoon(key.expiration)
                  const isExpiredKey = status === 'expired'

                  return (
                    <tr
                      key={`${key.user.name}-${key.id}`}
                      className={cn(
                        'border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg-subtle)] transition-colors',
                        expiringSoon && 'border-l-2 border-l-amber-400',
                      )}
                    >
                      {/* Key */}
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 group">
                          <span className={cn(
                            'font-mono text-sm',
                            isExpiredKey ? 'text-[var(--color-text-muted)]' : 'text-[var(--color-text-primary)]',
                          )}>
                            {truncateKey(key.key)}
                          </span>
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <CopyButton value={key.key} label="Key" />
                          </span>
                        </span>
                        {key.aclTags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {key.aclTags.map(tag => (
                              <span
                                key={tag}
                                className="inline-flex items-center px-1.5 py-0.5 text-xs bg-[var(--color-accent-subtle)] text-[var(--color-accent)] rounded"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* User */}
                      <td className="px-4 py-3">
                        <span className="text-sm text-[var(--color-text-secondary)]">{key.user.name}</span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <KeyStatusBadge status={status} />
                      </td>

                      {/* Reusable */}
                      <td className="px-4 py-3">
                        <Badge variant={key.reusable ? 'success' : 'muted'}>
                          {key.reusable ? 'Yes' : 'No'}
                        </Badge>
                      </td>

                      {/* Ephemeral */}
                      <td className="px-4 py-3">
                        <Badge variant={key.ephemeral ? 'info' : 'muted'}>
                          {key.ephemeral ? 'Yes' : 'No'}
                        </Badge>
                      </td>

                      {/* Expires */}
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'text-sm',
                            expiringSoon
                              ? 'text-amber-400 font-medium'
                              : isExpiredKey
                                ? 'text-[var(--color-text-muted)] line-through'
                                : 'text-[var(--color-text-secondary)]',
                          )}
                          title={formatAbsoluteTime(key.expiration)}
                        >
                          {formatExpiry(key.expiration)}
                        </span>
                      </td>

                      {/* Created */}
                      <td className="px-4 py-3">
                        <span
                          className="text-sm text-[var(--color-text-muted)]"
                          title={formatAbsoluteTime(key.createdAt)}
                        >
                          {formatRelativeTime(key.createdAt)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {status !== 'expired' && (
                            <button
                              onClick={() => setExpireTarget(key)}
                              className="px-2.5 py-1 text-xs text-[var(--color-text-muted)] hover:text-amber-400 hover:bg-amber-400/8 rounded-md transition-colors"
                              title="Expire key"
                            >
                              Expire
                            </button>
                          )}
                          <button
                            onClick={() => setDeleteTarget(key)}
                            className="px-2.5 py-1 text-xs text-[var(--color-text-muted)] hover:text-red-400 hover:bg-red-400/8 rounded-md transition-colors"
                            title="Delete key"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create panel */}
      {panelOpen && (
        <CreateKeyPanel
          users={users}
          onClose={() => setPanelOpen(false)}
          onCreated={(key) => {
            setRevealKey(key)
          }}
        />
      )}

      {/* One-time reveal modal */}
      {revealKey && (
        <KeyRevealModal
          keyValue={revealKey}
          onDone={handleRevealDone}
        />
      )}

      {/* Expire confirm */}
      <ConfirmDialog
        open={expireTarget !== null}
        onClose={() => setExpireTarget(null)}
        onConfirm={() => {
          if (expireTarget) expireMutation.mutate(expireTarget.id)
        }}
        title="Expire pre-auth key?"
        description={`This key will immediately become invalid and cannot be used to register new nodes. This action cannot be undone.`}
        confirmLabel="Expire Key"
        variant="warning"
        loading={expireMutation.isPending}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id)
        }}
        title="Delete pre-auth key?"
        description={`The key ${truncateKey(deleteTarget?.key ?? '', 16)} will be permanently removed.`}
        confirmLabel="Delete Key"
        variant="danger"
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
