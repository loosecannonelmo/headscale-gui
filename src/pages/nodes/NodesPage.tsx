// src/pages/nodes/NodesPage.tsx

import { useState, useMemo, useRef, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Monitor, Search, ChevronUp, ChevronDown, MoreHorizontal,
  ExternalLink, Copy, Clock, Pencil, UserCheck, Trash2, RefreshCw,
  Check, X, ChevronsUpDown,
} from 'lucide-react'
import { toast } from 'sonner'

import { nodesApi, getNodeDisplayName } from '@/api/nodes'
import { usersApi } from '@/api/users'
import type { HeadscaleNode } from '@/api/types'

import { PageHeader } from '@/components/layout/TopBar'
import { NodeStatusBadge } from '@/components/shared/StatusBadge'
import { CopyButton } from '@/components/shared/CopyButton'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { SkeletonRow } from '@/components/shared/SkeletonRow'
import { NodeDetailPanel } from './NodeDetailPanel'

import { cn, getNodeStatus, copyToClipboard } from '@/lib/utils'
import { useRelativeTime } from '@/hooks/useRelativeTime'

// ── Types ───────────────────────────────────────────────────────────────────

type SortField = 'name' | 'lastSeen' | 'status' | 'user'
type SortDir = 'asc' | 'desc'
type StatusFilter = 'all' | 'online' | 'offline' | 'expired'

// ── Helpers ─────────────────────────────────────────────────────────────────

function getEffectiveStatus(node: HeadscaleNode): StatusFilter {
  if (node.isExpired) return 'expired'
  if (node.online) return 'online'
  return 'offline'
}

// ── Sub-components ───────────────────────────────────────────────────────────

function SortIcon({ field, current, dir }: { field: SortField; current: SortField; dir: SortDir }) {
  if (field !== current) return <ChevronsUpDown size={13} className="text-[var(--color-text-disabled)]" />
  return dir === 'asc'
    ? <ChevronUp size={13} className="text-[var(--color-accent)]" />
    : <ChevronDown size={13} className="text-[var(--color-accent)]" />
}

// Inline rename cell — shows a text input when active, otherwise the display name
function InlineRenameCell({
  node,
  onOpen,
  isEditing,
  onSave,
  onCancel,
}: {
  node: HeadscaleNode
  onOpen: () => void
  isEditing: boolean
  onSave: (value: string) => void
  onCancel: () => void
}) {
  const displayName = getNodeDisplayName(node)
  const [draft, setDraft] = useState(displayName)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing) {
      setDraft(getNodeDisplayName(node))
      setTimeout(() => inputRef.current?.select(), 0)
    }
  }, [isEditing, node])

  if (isEditing) {
    return (
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSave(draft.trim())
            if (e.key === 'Escape') onCancel()
          }}
          className="px-2 py-0.5 text-sm font-mono bg-[var(--color-bg-base)] border border-[var(--color-accent)] rounded text-[var(--color-text-primary)] focus:outline-none w-40"
          autoFocus
        />
        <button
          onClick={() => onSave(draft.trim())}
          className="p-1 rounded text-emerald-400 hover:bg-emerald-400/10 transition-colors"
          title="Save"
        >
          <Check size={13} />
        </button>
        <button
          onClick={onCancel}
          className="p-1 rounded text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)] transition-colors"
          title="Cancel"
        >
          <X size={13} />
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={(e) => { e.stopPropagation(); onOpen() }}
      className="group/name flex items-center gap-1.5 text-left"
      title="Click to rename"
    >
      <span className="font-mono text-sm font-medium text-[var(--color-text-primary)] truncate max-w-[200px]">
        {displayName}
      </span>
      <Pencil
        size={11}
        className="text-[var(--color-text-disabled)] opacity-0 group-hover/name:opacity-100 transition-opacity flex-shrink-0"
      />
    </button>
  )
}

// Row overflow menu
function RowMenu({
  node,
  onViewDetail,
  onRename,
  onExpire,
  onMoveToUser,
  onDelete,
}: {
  node: HeadscaleNode
  onViewDetail: () => void
  onRename: () => void
  onExpire: () => void
  onMoveToUser: () => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const ipv4 = node.ipAddresses.find(ip => ip.startsWith('100.')) ?? node.ipAddresses[0]

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const items = [
    {
      label: 'View Details',
      icon: ExternalLink,
      action: () => { onViewDetail(); setOpen(false) },
    },
    {
      label: 'Copy IP',
      icon: Copy,
      action: async () => {
        if (ipv4) {
          await copyToClipboard(ipv4)
          toast.success('IP address copied')
        }
        setOpen(false)
      },
    },
    { divider: true },
    {
      label: 'Rename',
      icon: Pencil,
      action: () => { onRename(); setOpen(false) },
    },
    {
      label: 'Move to User',
      icon: UserCheck,
      action: () => { onMoveToUser(); setOpen(false) },
    },
    {
      label: 'Expire Key',
      icon: Clock,
      action: () => { onExpire(); setOpen(false) },
      className: 'text-amber-400',
    },
    { divider: true },
    {
      label: 'Delete',
      icon: Trash2,
      action: () => { onDelete(); setOpen(false) },
      className: 'text-red-400',
    },
  ]

  return (
    <div ref={menuRef} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'p-1.5 rounded-lg transition-colors',
          open
            ? 'bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)]'
            : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-secondary)]',
        )}
        title="More actions"
      >
        <MoreHorizontal size={15} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 w-44 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-xl shadow-xl z-30 py-1 overflow-hidden"
          style={{ animation: 'fade-in 0.1s ease-out' }}
        >
          {items.map((item, i) => {
            if ('divider' in item && item.divider) {
              return <div key={i} className="my-1 border-t border-[var(--color-border)]" />
            }
            if ('action' in item) {
              const Icon = item.icon
              if (!Icon) return null
              return (
                <button
                  key={item.label}
                  onClick={item.action}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors text-left',
                    'hover:bg-[var(--color-bg-subtle)]',
                    item.className ?? 'text-[var(--color-text-secondary)]',
                  )}
                >
                  <Icon size={13} className="flex-shrink-0" />
                  {item.label}
                </button>
              )
            }
            return null
          })}
        </div>
      )}
    </div>
  )
}

// Move to user dialog — a simple modal select
function MoveToUserDialog({
  node,
  open,
  onClose,
}: {
  node: HeadscaleNode | null
  open: boolean
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [selectedUser, setSelectedUser] = useState('')

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.list,
    enabled: open,
  })

  const moveMutation = useMutation({
    mutationFn: ({ id, user }: { id: string; user: string }) =>
      nodesApi.moveToUser(id, user),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nodes'] })
      toast.success('Node moved to user')
      onClose()
    },
    onError: (err) => toast.error(`Failed to move node: ${err instanceof Error ? err.message : 'Unknown error'}`),
  })

  useEffect(() => {
    if (open && node) setSelectedUser(node.user.name)
  }, [open, node])

  if (!open || !node) return null

  const users = usersData?.users ?? []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative z-10 w-full max-w-sm mx-4 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-xl shadow-2xl p-6"
        style={{ animation: 'fade-in 0.15s ease-out' }}
      >
        <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-1">Move to User</h3>
        <p className="text-sm text-[var(--color-text-muted)] mb-4">
          Reassign <span className="font-mono text-[var(--color-text-secondary)]">{getNodeDisplayName(node)}</span> to a different user.
        </p>
        <select
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
          className="w-full px-3 py-2 text-sm bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] mb-4"
        >
          {users.map((u) => (
            <option key={u.id} value={u.name}>{u.name}</option>
          ))}
        </select>
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)] rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => moveMutation.mutate({ id: node.id, user: selectedUser })}
            disabled={!selectedUser || moveMutation.isPending}
            className="px-4 py-2 text-sm font-medium bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {moveMutation.isPending ? 'Moving...' : 'Move'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Individual table row — keeps its own relative-time ticker
function NodeRow({
  node,
  isSelected,
  onClick,
  onRename,
  onViewDetail,
  onExpire,
  onMoveToUser,
  onDelete,
  editingId,
  onSaveRename,
  onCancelRename,
}: {
  node: HeadscaleNode
  isSelected: boolean
  onClick: () => void
  onRename: () => void
  onViewDetail: () => void
  onExpire: () => void
  onMoveToUser: () => void
  onDelete: () => void
  editingId: string | null
  onSaveRename: (id: string, value: string) => void
  onCancelRename: () => void
}) {
  const lastSeenText = useRelativeTime(node.lastSeen)
  const status = node.isExpired ? 'expired' : getNodeStatus(node.online, node.lastSeen)
  const ipv4 = node.ipAddresses.find(ip => ip.startsWith('100.')) ?? node.ipAddresses[0]
  const ipv6 = node.ipAddresses.find(ip => !ip.startsWith('100.'))

  return (
    <tr
      onClick={onClick}
      className={cn(
        'border-b border-[var(--color-border)] cursor-pointer transition-colors',
        isSelected
          ? 'bg-[var(--color-accent-subtle)]'
          : 'hover:bg-[var(--color-bg-subtle)]',
        node.isExpired && 'opacity-60',
      )}
      style={{ height: 52 }}
    >
      {/* Name */}
      <td className="px-4">
        <InlineRenameCell
          node={node}
          isEditing={editingId === node.id}
          onOpen={onRename}
          onSave={(value) => onSaveRename(node.id, value)}
          onCancel={onCancelRename}
        />
      </td>

      {/* Status */}
      <td className="px-4">
        <NodeStatusBadge status={status} />
      </td>

      {/* User */}
      <td className="px-4">
        <span className="text-sm text-[var(--color-text-secondary)]">{node.user.name}</span>
      </td>

      {/* IP Addresses */}
      <td className="px-4">
        <div className="flex flex-col gap-0.5">
          {ipv4 && (
            <span className="group/ip inline-flex items-center gap-1">
              <span className="font-mono text-xs text-[var(--color-text-secondary)]">{ipv4}</span>
              <span className="opacity-0 group-hover/ip:opacity-100 transition-opacity">
                <CopyButton value={ipv4} label="IP" />
              </span>
            </span>
          )}
          {ipv6 && (
            <span className="group/ip6 inline-flex items-center gap-1">
              <span className="font-mono text-xs text-[var(--color-text-muted)] truncate max-w-[160px]">{ipv6}</span>
              <span className="opacity-0 group-hover/ip6:opacity-100 transition-opacity">
                <CopyButton value={ipv6} label="IPv6" />
              </span>
            </span>
          )}
        </div>
      </td>

      {/* Last Seen */}
      <td className="px-4">
        <span className="text-sm text-[var(--color-text-muted)]">{lastSeenText}</span>
      </td>

      {/* Actions */}
      <td className="px-4 text-right">
        <RowMenu
          node={node}
          onViewDetail={onViewDetail}
          onRename={onRename}
          onExpire={onExpire}
          onMoveToUser={onMoveToUser}
          onDelete={onDelete}
        />
      </td>
    </tr>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────

export function NodesPage() {
  const queryClient = useQueryClient()

  // — Query state —
  const { data, isLoading, isFetching, dataUpdatedAt } = useQuery({
    queryKey: ['nodes'],
    queryFn: () => nodesApi.list(),
    refetchInterval: 15_000,
  })

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.list,
    refetchInterval: 60_000,
  })

  // — UI state —
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [userFilter, setUserFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(searchParams.get('open'))
  const [editingId, setEditingId] = useState<string | null>(null)

  // — Pending action state (for dialogs) —
  const [expireTarget, setExpireTarget] = useState<HeadscaleNode | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<HeadscaleNode | null>(null)
  const [moveTarget, setMoveTarget] = useState<HeadscaleNode | null>(null)

  // — Mutations —
  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => nodesApi.rename(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nodes'] })
      toast.success('Node renamed')
      setEditingId(null)
    },
    onError: (err) => toast.error(`Rename failed: ${err instanceof Error ? err.message : 'Unknown error'}`),
  })

  const expireMutation = useMutation({
    mutationFn: (id: string) => nodesApi.expire(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nodes'] })
      toast.success('Node key expired')
      setExpireTarget(null)
    },
    onError: (err) => toast.error(`Expire failed: ${err instanceof Error ? err.message : 'Unknown error'}`),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => nodesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nodes'] })
      toast.success('Node deleted')
      setDeleteTarget(null)
      // Close detail panel if we just deleted the selected node
      if (deleteTarget && selectedNodeId === deleteTarget.id) {
        setSelectedNodeId(null)
      }
    },
    onError: (err) => toast.error(`Delete failed: ${err instanceof Error ? err.message : 'Unknown error'}`),
  })

  // — Derived data —
  const nodes = data?.nodes ?? []
  const users = usersData?.users ?? []

  const filtered = useMemo(() => {
    let result = nodes

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (n) =>
          getNodeDisplayName(n).toLowerCase().includes(q) ||
          n.name.toLowerCase().includes(q) ||
          n.ipAddresses.some((ip) => ip.includes(q)),
      )
    }

    if (userFilter !== 'all') {
      result = result.filter((n) => n.user.name === userFilter)
    }

    if (statusFilter !== 'all') {
      result = result.filter((n) => getEffectiveStatus(n) === statusFilter)
    }

    return [...result].sort((a, b) => {
      let cmp = 0
      if (sortField === 'name') {
        cmp = getNodeDisplayName(a).localeCompare(getNodeDisplayName(b))
      } else if (sortField === 'user') {
        cmp = a.user.name.localeCompare(b.user.name)
      } else if (sortField === 'status') {
        const order = { online: 0, recent: 1, offline: 2, ephemeral: 3, expired: 4 }
        const sa = a.isExpired ? 'expired' : getNodeStatus(a.online, a.lastSeen)
        const sb = b.isExpired ? 'expired' : getNodeStatus(b.online, b.lastSeen)
        cmp = (order[sa] ?? 5) - (order[sb] ?? 5)
      } else {
        cmp = new Date(a.lastSeen).getTime() - new Date(b.lastSeen).getTime()
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [nodes, search, userFilter, statusFilter, sortField, sortDir])

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const onlineCount = nodes.filter((n) => !n.isExpired && n.online).length

  // — Render —
  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <PageHeader
        title="Nodes"
        action={
          <div className="flex items-center gap-2">
            {/* Count badge */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-[var(--color-text-muted)]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {isLoading ? '—' : `${onlineCount} / ${nodes.length}`}
            </span>
            {/* Refresh indicator */}
            {isFetching && !isLoading && (
              <RefreshCw size={13} className="text-[var(--color-text-muted)] animate-spin" />
            )}
          </div>
        }
      />

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none"
          />
          <input
            type="text"
            placeholder="Search by name or IP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* User filter */}
        <select
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value)}
          className="px-3 py-2 text-sm bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
        >
          <option value="all">All Users</option>
          {users.map((u) => (
            <option key={u.id} value={u.name}>{u.name}</option>
          ))}
        </select>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="px-3 py-2 text-sm bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
        >
          <option value="all">All Statuses</option>
          <option value="online">Online</option>
          <option value="offline">Offline</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      {/* Table container */}
      <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden flex-1">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            {/* Sticky header */}
            <thead className="sticky top-0 z-10 bg-[var(--color-bg-surface)] border-b border-[var(--color-border)]">
              <tr>
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={() => toggleSort('name')}
                    className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors select-none"
                  >
                    Name
                    <SortIcon field="name" current={sortField} dir={sortDir} />
                  </button>
                </th>
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={() => toggleSort('status')}
                    className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors select-none"
                  >
                    Status
                    <SortIcon field="status" current={sortField} dir={sortDir} />
                  </button>
                </th>
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={() => toggleSort('user')}
                    className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors select-none"
                  >
                    User
                    <SortIcon field="user" current={sortField} dir={sortDir} />
                  </button>
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                  IP Addresses
                </th>
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={() => toggleSort('lastSeen')}
                    className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors select-none"
                  >
                    Last Seen
                    <SortIcon field="lastSeen" current={sortField} dir={sortDir} />
                  </button>
                </th>
                <th className="px-4 py-3 w-12" />
              </tr>
            </thead>

            <tbody>
              {isLoading
                ? Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={6} />)
                : filtered.length === 0
                ? (
                  <tr>
                    <td colSpan={6}>
                      <EmptyState
                        icon={Monitor}
                        title={search || userFilter !== 'all' || statusFilter !== 'all' ? 'No matching nodes' : 'No nodes yet'}
                        description={
                          search || userFilter !== 'all' || statusFilter !== 'all'
                            ? 'Try adjusting your search or filters.'
                            : 'Register a node to your Tailnet to see it here.'
                        }
                      />
                    </td>
                  </tr>
                )
                : filtered.map((node) => (
                  <NodeRow
                    key={node.id}
                    node={node}
                    isSelected={selectedNodeId === node.id}
                    onClick={() => setSelectedNodeId(node.id === selectedNodeId ? null : node.id)}
                    onRename={() => setEditingId(node.id)}
                    onViewDetail={() => setSelectedNodeId(node.id)}
                    onExpire={() => setExpireTarget(node)}
                    onMoveToUser={() => setMoveTarget(node)}
                    onDelete={() => setDeleteTarget(node)}
                    editingId={editingId}
                    onSaveRename={(id, value) => {
                      if (!value) { setEditingId(null); return }
                      renameMutation.mutate({ id, name: value })
                    }}
                    onCancelRename={() => setEditingId(null)}
                  />
                ))}
            </tbody>
          </table>
        </div>

        {/* Footer: last updated */}
        {!isLoading && nodes.length > 0 && (
          <div className="px-4 py-2 border-t border-[var(--color-border)] text-xs text-[var(--color-text-muted)] flex items-center justify-between">
            <span>{filtered.length} of {nodes.length} node{nodes.length !== 1 ? 's' : ''}</span>
            {dataUpdatedAt > 0 && (
              <span>Updated {new Date(dataUpdatedAt).toLocaleTimeString()}</span>
            )}
          </div>
        )}
      </div>

      {/* Detail panel */}
      <NodeDetailPanel
        nodeId={selectedNodeId}
        onClose={() => setSelectedNodeId(null)}
      />

      {/* Expire confirm dialog */}
      <ConfirmDialog
        open={expireTarget !== null}
        onClose={() => setExpireTarget(null)}
        onConfirm={() => { if (expireTarget) expireMutation.mutate(expireTarget.id) }}
        title="Expire Node Key"
        description={`This will immediately expire the key for "${expireTarget ? getNodeDisplayName(expireTarget) : ''}". The node will need to re-authenticate.`}
        confirmLabel="Expire Key"
        variant="warning"
        loading={expireMutation.isPending}
      />

      {/* Delete confirm dialog */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget.id) }}
        title="Delete Node"
        description={`This will permanently remove the node from your Tailnet. This action cannot be undone.`}
        confirmLabel="Delete Node"
        variant="danger"
        requireTyping={deleteTarget ? getNodeDisplayName(deleteTarget) : undefined}
        loading={deleteMutation.isPending}
      />

      {/* Move to user dialog */}
      <MoveToUserDialog
        node={moveTarget}
        open={moveTarget !== null}
        onClose={() => setMoveTarget(null)}
      />
    </div>
  )
}
