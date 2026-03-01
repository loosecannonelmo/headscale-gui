// src/pages/users/UsersPage.tsx

import { useState, useRef, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient, useQueries } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Users, Plus, Pencil, Trash2, X, Check, Loader2 } from 'lucide-react'

import { usersApi, validateUsername } from '@/api/users'
import { nodesApi } from '@/api/nodes'
import { policyApi } from '@/api/policy'
import type { HeadscaleUser } from '@/api/types'
import { PageHeader } from '@/components/layout/TopBar'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Skeleton } from '@/components/shared/SkeletonRow'
import { cn, formatRelativeTime } from '@/lib/utils'

// ── Avatar color palette ────────────────────────────────────────────────────
// Six distinct accent hues. We hash the user name to a stable index.

const AVATAR_COLORS = [
  { bg: 'bg-[#5B8AF0]/15', text: 'text-[#5B8AF0]', border: 'border-[#5B8AF0]/30' },
  { bg: 'bg-emerald-400/15', text: 'text-emerald-400', border: 'border-emerald-400/30' },
  { bg: 'bg-purple-400/15', text: 'text-purple-400', border: 'border-purple-400/30' },
  { bg: 'bg-amber-400/15', text: 'text-amber-400', border: 'border-amber-400/30' },
  { bg: 'bg-rose-400/15', text: 'text-rose-400', border: 'border-rose-400/30' },
  { bg: 'bg-cyan-400/15', text: 'text-cyan-400', border: 'border-cyan-400/30' },
]

function hashName(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) {
    h = (Math.imul(31, h) + name.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

function avatarColors(name: string) {
  return AVATAR_COLORS[hashName(name) % AVATAR_COLORS.length]
}

// ── Shared input style ──────────────────────────────────────────────────────
const inputCls =
  'w-full px-3 py-2 text-sm bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded-lg ' +
  'text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] ' +
  'focus:outline-none focus:border-[var(--color-accent)] transition-colors'

// ── Create User Modal ───────────────────────────────────────────────────────

interface CreateUserModalProps {
  open: boolean
  onClose: () => void
}

function CreateUserModal({ open, onClose }: CreateUserModalProps) {
  const [name, setName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  const validationError = name ? validateUsername(name) : null

  const mutation = useMutation({
    mutationFn: () => usersApi.create(name.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['nodes'] })
      toast.success(`User "${name.trim()}" created`)
      handleClose()
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to create user')
    },
  })

  useEffect(() => {
    if (open) {
      setName('')
      // Defer focus until after the modal renders
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  function handleClose() {
    if (mutation.isPending) return
    setName('')
    onClose()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const err = validateUsername(name.trim())
    if (err) return
    mutation.mutate()
  }

  if (!open) return null

  const canSubmit = name.trim().length > 0 && validationError === null && !mutation.isPending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      {/* Panel */}
      <div
        className="relative z-10 w-full max-w-md mx-4 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-xl shadow-2xl"
        style={{ animation: 'fade-in 0.15s ease-out' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">New User</h2>
          <button
            onClick={handleClose}
            disabled={mutation.isPending}
            className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-5">
          <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
            Username
          </label>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. alice or alice@example.com"
            className={cn(inputCls, validationError ? 'border-red-400/60' : '')}
            autoComplete="off"
            spellCheck={false}
          />
          {validationError && (
            <p className="mt-1.5 text-xs text-red-400">{validationError}</p>
          )}
          <p className="mt-2 text-xs text-[var(--color-text-muted)]">
            Letters, numbers, dots, hyphens, underscores, and @ are allowed.
          </p>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={handleClose}
              disabled={mutation.isPending}
              className="px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)] rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="px-4 py-2 text-sm font-medium bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {mutation.isPending && <Loader2 size={14} className="animate-spin" />}
              Create User
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Inline Rename field ─────────────────────────────────────────────────────

interface RenameFieldProps {
  user: HeadscaleUser
  onDone: () => void
}

function RenameField({ user, onDone }: RenameFieldProps) {
  const [draft, setDraft] = useState(user.name)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  const mutation = useMutation({
    mutationFn: (newName: string) => usersApi.rename(user.id, newName),
    onSuccess: async (_, newName) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['nodes'] })
      onDone()
      // Advisory ACL check — non-blocking
      try {
        const policy = await policyApi.get()
        if (policy.policy.includes(user.name)) {
          toast.warning(
            `"${user.name}" appears in your ACL policy. Update it to "${newName}" to avoid access issues.`,
            { duration: 8000 },
          )
        }
      } catch {
        // Policy fetch failure is non-critical — silently ignore
      }
      toast.success(`Renamed to "${newName}"`)
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Rename failed')
    },
  })

  function commit() {
    const trimmed = draft.trim()
    if (trimmed === user.name) { onDone(); return }
    const err = validateUsername(trimmed)
    if (err) { setError(err); return }
    mutation.mutate(trimmed)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); commit() }
    if (e.key === 'Escape') { onDone() }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setDraft(e.target.value)
    setError(validateUsername(e.target.value.trim()))
  }

  return (
    <div className="flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-1.5">
        <input
          ref={inputRef}
          value={draft}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={commit}
          disabled={mutation.isPending}
          className={cn(
            'flex-1 min-w-0 px-2 py-1 text-base font-semibold rounded-md bg-[var(--color-bg-base)] border',
            'text-[var(--color-text-primary)] focus:outline-none transition-colors',
            error ? 'border-red-400/60' : 'border-[var(--color-accent)]',
          )}
          autoComplete="off"
          spellCheck={false}
        />
        {mutation.isPending
          ? <Loader2 size={14} className="text-[var(--color-text-muted)] animate-spin flex-shrink-0" />
          : (
            <button
              onMouseDown={(e) => { e.preventDefault(); commit() }}
              className="p-1 rounded text-emerald-400 hover:bg-emerald-400/10 transition-colors flex-shrink-0"
              tabIndex={-1}
            >
              <Check size={14} />
            </button>
          )
        }
      </div>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  )
}

// ── User Card ───────────────────────────────────────────────────────────────

interface UserCardProps {
  user: HeadscaleUser
  nodeCount: number
  nodeCountLoading: boolean
}

function UserCard({ user, nodeCount, nodeCountLoading }: UserCardProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [renaming, setRenaming] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const colors = avatarColors(user.name)

  const deleteMutation = useMutation({
    mutationFn: () => usersApi.delete(user.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['nodes'] })
      toast.success(`User "${user.name}" deleted`)
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Delete failed')
    },
  })

  function handleDeleteClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (nodeCount > 0) {
      toast.error(
        `Cannot delete: move or delete this user's ${nodeCount} ${nodeCount === 1 ? 'node' : 'nodes'} first`,
      )
      return
    }
    setDeleteOpen(true)
  }

  function handleRenameClick(e: React.MouseEvent) {
    e.stopPropagation()
    setRenaming(true)
  }

  function handleCardClick() {
    if (!renaming) navigate(`/users/${user.id}`)
  }

  const initial = (user.displayName || user.name).charAt(0).toUpperCase()

  return (
    <>
      <div
        onClick={handleCardClick}
        className={cn(
          'bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-xl p-5',
          'hover:border-[var(--color-border-strong)] transition-all duration-150 cursor-pointer',
          'flex flex-col gap-4',
          renaming && 'border-[var(--color-accent)]/50',
        )}
      >
        {/* Top row: avatar + actions */}
        <div className="flex items-start justify-between gap-3">
          {/* Avatar */}
          <div
            className={cn(
              'w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0',
              'text-lg font-bold border',
              colors.bg, colors.text, colors.border,
            )}
          >
            {initial}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={handleRenameClick}
              title="Rename"
              className={cn(
                'p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]',
                'hover:bg-[var(--color-bg-elevated)] transition-colors',
              )}
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={handleDeleteClick}
              title="Delete"
              className={cn(
                'p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-red-400',
                'hover:bg-red-400/10 transition-colors',
              )}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Name row — either static label or rename input */}
        <div className="min-w-0">
          {renaming ? (
            <RenameField user={user} onDone={() => setRenaming(false)} />
          ) : (
            <p className={cn('text-base font-semibold truncate', colors.text)}>
              {user.displayName || user.name}
            </p>
          )}
          {user.displayName && (
            <p className="text-xs text-[var(--color-text-muted)] truncate mt-0.5 font-mono">
              {user.name}
            </p>
          )}
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] border-t border-[var(--color-border)] pt-3">
          <span>
            {nodeCountLoading ? (
              <Skeleton className="w-12 h-3 inline-block" />
            ) : (
              <span>
                <span className="font-semibold text-[var(--color-text-secondary)]">{nodeCount}</span>
                {' '}{nodeCount === 1 ? 'node' : 'nodes'}
              </span>
            )}
          </span>
          <span title={new Date(user.createdAt).toLocaleString()}>
            Created {formatRelativeTime(user.createdAt)}
          </span>
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutateAsync()}
        title={`Delete user "${user.name}"?`}
        description="This action cannot be undone. The user and all associated pre-auth keys will be permanently removed."
        confirmLabel="Delete User"
        variant="danger"
        requireTyping={user.name}
        loading={deleteMutation.isPending}
      />
    </>
  )
}

// ── Skeleton cards ──────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-xl p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <Skeleton className="w-11 h-11 rounded-full" />
        <div className="flex gap-1">
          <Skeleton className="w-7 h-7 rounded-lg" />
          <Skeleton className="w-7 h-7 rounded-lg" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <div className="flex justify-between pt-3 border-t border-[var(--color-border)]">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  )
}

// ── Main page ───────────────────────────────────────────────────────────────

export function UsersPage() {
  const [createOpen, setCreateOpen] = useState(false)

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.list,
    refetchInterval: 60_000,
  })

  const users = usersData?.users ?? []

  // Fan-out: one nodes query per user, run in parallel
  const nodeQueries = useQueries({
    queries: users.map((user) => ({
      queryKey: ['nodes', 'by-user', user.name],
      queryFn: () => nodesApi.list(user.name),
      // Stale time to avoid hammering the API on every keystroke
      staleTime: 30_000,
      refetchInterval: 60_000,
    })),
  })

  const getNodeCount = useCallback(
    (idx: number) => nodeQueries[idx]?.data?.nodes.length ?? 0,
    [nodeQueries],
  )

  const getNodeCountLoading = useCallback(
    (idx: number) => nodeQueries[idx]?.isLoading ?? false,
    [nodeQueries],
  )

  return (
    <div>
      <PageHeader
        title="Users"
        description="Manage users and namespaces"
        action={
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white rounded-lg transition-colors"
          >
            <Plus size={15} />
            New User
          </button>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : users.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No users yet"
          description="Create your first user to start registering nodes"
          action={
            <button
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white rounded-lg transition-colors"
            >
              <Plus size={15} />
              Create User
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((user, idx) => (
            <UserCard
              key={user.id}
              user={user}
              nodeCount={getNodeCount(idx)}
              nodeCountLoading={getNodeCountLoading(idx)}
            />
          ))}
        </div>
      )}

      <CreateUserModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  )
}
