// src/pages/nodes/NodeDetailPanel.tsx

import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  X, Tag, Route, Shield, Clock, Trash2, UserCheck,
  ChevronRight, AlertTriangle, Network, Fingerprint,
} from 'lucide-react'
import { toast } from 'sonner'

import { nodesApi, getNodeDisplayName } from '@/api/nodes'
import { usersApi } from '@/api/users'
import type { HeadscaleNode } from '@/api/types'

import { NodeStatusBadge, RouteStatusBadge, Badge } from '@/components/shared/StatusBadge'
import { CopyableText } from '@/components/shared/CopyButton'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Skeleton } from '@/components/shared/SkeletonRow'

import { cn, getNodeStatus, formatAbsoluteTime, formatExpiry, truncateKey } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

interface NodeDetailPanelProps {
  nodeId: string | null
  onClose: () => void
}

type RouteStatus = 'approved' | 'pending' | 'disabled'

// ── Helpers ───────────────────────────────────────────────────────────────────

const EXIT_NODE_PREFIXES = new Set(['0.0.0.0/0', '::/0'])

function isExitNode(prefix: string): boolean {
  return EXIT_NODE_PREFIXES.has(prefix)
}

function getCidrRouteStatus(cidr: string, available: string[], approved: string[]): RouteStatus {
  const isAdvertised = available.includes(cidr)
  const isApproved = approved.includes(cidr)
  if (!isAdvertised && isApproved) return 'disabled'
  if (isAdvertised && !isApproved) return 'pending'
  return 'approved'
}

function getRegisterMethodLabel(method: string): string {
  switch (method) {
    case 'REGISTER_METHOD_AUTH_KEY': return 'Auth Key'
    case 'REGISTER_METHOD_OIDC': return 'OIDC'
    case 'REGISTER_METHOD_CLI': return 'CLI'
    default: return method.replace('REGISTER_METHOD_', '') || 'Unknown'
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

// Section container with title
function Section({ title, icon: Icon, children }: {
  title: string
  icon: React.ElementType
  children: React.ReactNode
}) {
  return (
    <div className="border-b border-[var(--color-border)] last:border-b-0">
      <div className="flex items-center gap-2 px-5 py-3 bg-[var(--color-bg-subtle)]">
        <Icon size={13} className="text-[var(--color-text-muted)] flex-shrink-0" />
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          {title}
        </span>
      </div>
      <div className="px-5 py-4 space-y-3">
        {children}
      </div>
    </div>
  )
}

// Label + value row
function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 min-h-[24px]">
      <span className="text-xs text-[var(--color-text-muted)] flex-shrink-0 pt-0.5 w-28">{label}</span>
      <div className="flex-1 text-right min-w-0">{children}</div>
    </div>
  )
}

// Tag chip
function TagChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--color-accent-subtle)] text-[var(--color-accent)] border border-[var(--color-accent)]/20">
      {label}
    </span>
  )
}

// Inline tag editor
function TagEditor({
  currentTags,
  onSave,
  onCancel,
  loading,
}: {
  currentTags: string[]
  onSave: (tags: string[]) => void
  onCancel: () => void
  loading: boolean
}) {
  const [draft, setDraft] = useState(currentTags.join(', '))
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function parseTags(value: string): string[] {
    return value
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
      // Ensure tag: prefix for headscale
      .map((t) => (t.startsWith('tag:') ? t : `tag:${t}`))
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSave(parseTags(draft))
          if (e.key === 'Escape') onCancel()
        }}
        placeholder="tag:server, tag:exit-node, ..."
        className="w-full px-3 py-1.5 text-sm font-mono bg-[var(--color-bg-base)] border border-[var(--color-accent)] rounded-lg text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none transition-colors"
      />
      <p className="text-xs text-[var(--color-text-muted)]">
        Comma-separated. <code className="font-mono text-[var(--color-text-secondary)]">tag:</code> prefix added automatically.
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onSave(parseTags(draft))}
          disabled={loading}
          className="px-3 py-1 text-xs font-medium bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Tags'}
        </button>
        <button
          onClick={onCancel}
          disabled={loading}
          className="px-3 py-1 text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)] rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// Routes section body — v0.28.0: routes are CIDR string arrays on the node
function RoutesSection({
  node,
  onApproveRoute,
  onDisableRoute,
  approveLoading,
}: {
  node: HeadscaleNode
  onApproveRoute: (cidr: string) => void
  onDisableRoute: (cidr: string) => void
  approveLoading: boolean
}) {
  const available = node.availableRoutes ?? []
  const approved = node.approvedRoutes ?? []
  const all = [...new Set([...available, ...approved])]

  if (all.length === 0) {
    return (
      <p className="text-sm text-[var(--color-text-muted)]">No routes advertised by this node.</p>
    )
  }

  return (
    <div className="space-y-2">
      {all.map((cidr) => {
        const status = getCidrRouteStatus(cidr, available, approved)
        const exit = isExitNode(cidr)

        return (
          <div
            key={cidr}
            className={cn(
              'flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border',
              exit
                ? 'bg-purple-400/5 border-purple-400/20'
                : 'bg-[var(--color-bg-base)] border-[var(--color-border)]',
            )}
          >
            <div className="flex items-center gap-2 min-w-0">
              <code className="text-xs font-mono text-[var(--color-text-primary)] truncate">
                {cidr}
              </code>
              {exit && (
                <Badge variant="info" className="text-purple-400 bg-purple-400/10 border-purple-400/20 flex-shrink-0">
                  Exit Node
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <RouteStatusBadge status={status} />
              {status === 'pending' && (
                <button
                  onClick={() => onApproveRoute(cidr)}
                  disabled={approveLoading}
                  className="px-2 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-400/30 hover:bg-emerald-400/10 rounded transition-colors disabled:opacity-50"
                >
                  Approve
                </button>
              )}
              {status === 'approved' && (
                <button
                  onClick={() => onDisableRoute(cidr)}
                  disabled={approveLoading}
                  className="px-2 py-0.5 text-xs font-medium text-[var(--color-text-muted)] border border-[var(--color-border)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-secondary)] rounded transition-colors disabled:opacity-50"
                >
                  Disable
                </button>
              )}
              {status === 'disabled' && (
                <span className="text-xs text-[var(--color-text-disabled)]">Not advertised</span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Loading skeleton for the panel body
function PanelSkeleton() {
  return (
    <div className="p-5 space-y-6">
      {Array.from({ length: 4 }).map((_, si) => (
        <div key={si} className="space-y-3">
          <Skeleton className="h-3 w-24" />
          {Array.from({ length: 3 }).map((_, ri) => (
            <div key={ri} className="flex items-center justify-between">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-32" />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

// ── Main Panel ────────────────────────────────────────────────────────────────

export function NodeDetailPanel({ nodeId, onClose }: NodeDetailPanelProps) {
  const queryClient = useQueryClient()

  // Query
  const { data, isLoading, error } = useQuery({
    queryKey: ['nodes', nodeId],
    queryFn: () => nodesApi.get(nodeId!),
    enabled: nodeId !== null,
    refetchInterval: 5_000,
  })

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.list,
    enabled: nodeId !== null,
  })

  // Local UI state
  const [editingTags, setEditingTags] = useState(false)
  const [editingMove, setEditingMove] = useState(false)
  const [moveUser, setMoveUser] = useState('')
  const [showExpireConfirm, setShowExpireConfirm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const node: HeadscaleNode | undefined = data?.node
  const users = usersData?.users ?? []

  // Sync move user dropdown when node loads
  useEffect(() => {
    if (node) setMoveUser(node.user.name)
  }, [node?.user.name])

  // Invalidation helper
  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['nodes'] })
  }

  // — Mutations —


  const expireMutation = useMutation({
    mutationFn: (id: string) => nodesApi.expire(id),
    onSuccess: () => { invalidate(); toast.success('Key expired'); setShowExpireConfirm(false) },
    onError: (err) => toast.error(`Expire failed: ${err instanceof Error ? err.message : 'Unknown error'}`),
  })

  const setTagsMutation = useMutation({
    mutationFn: ({ id, tags }: { id: string; tags: string[] }) => nodesApi.setTags(id, tags),
    onSuccess: () => { invalidate(); toast.success('Tags updated'); setEditingTags(false) },
    onError: (err) => toast.error(`Tags update failed: ${err instanceof Error ? err.message : 'Unknown error'}`),
  })

  const moveMutation = useMutation({
    mutationFn: ({ id, user }: { id: string; user: string }) => nodesApi.moveToUser(id, user),
    onSuccess: () => { invalidate(); toast.success('Node moved'); setEditingMove(false) },
    onError: (err) => toast.error(`Move failed: ${err instanceof Error ? err.message : 'Unknown error'}`),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => nodesApi.delete(id),
    onSuccess: () => {
      invalidate()
      toast.success('Node deleted')
      setShowDeleteConfirm(false)
      onClose()
    },
    onError: (err) => toast.error(`Delete failed: ${err instanceof Error ? err.message : 'Unknown error'}`),
  })

  const approveRoutesMutation = useMutation({
    mutationFn: ({ id, routes }: { id: string; routes: string[] }) =>
      nodesApi.approveRoutes(id, routes),
    onSuccess: () => { invalidate(); toast.success('Route approved') },
    onError: (err) => toast.error(`Route approval failed: ${err instanceof Error ? err.message : 'Unknown error'}`),
  })

  // Disable a route — remove cidr from approvedRoutes, send updated list
  function handleDisableRoute(cidr: string) {
    if (!node) return
    const next = (node.approvedRoutes ?? []).filter(c => c !== cidr)
    approveRoutesMutation.mutate({ id: node.id, routes: next })
  }

  // Approve a route — add cidr to approvedRoutes, send updated list
  function handleApproveRoute(cidr: string) {
    if (!node) return
    const next = [...new Set([...(node.approvedRoutes ?? []), cidr])]
    approveRoutesMutation.mutate({ id: node.id, routes: next })
  }

  // — Derived values —
  const displayName = node ? getNodeDisplayName(node) : ''
  const rawStatus = node ? getNodeStatus(node.online, node.lastSeen) : 'offline'
  const status = node?.isExpired ? 'offline' : rawStatus
  const ipv4 = node?.ipAddresses.find((ip) => ip.startsWith('100.'))
  const ipv6 = node?.ipAddresses.find((ip) => !ip.startsWith('100.'))

  // — Panel visibility —
  // If nodeId is null, don't render the portal at all so we skip the slide animation reset
  if (nodeId === null) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px]"
        onClick={onClose}
      />

      {/* Panel */}
      <aside
        className={cn(
          'fixed right-0 top-0 h-full z-50',
          'w-full sm:w-[480px]',
          'bg-[var(--color-bg-surface)] border-l border-[var(--color-border)]',
          'flex flex-col shadow-2xl overflow-hidden',
        )}
        style={{ animation: 'slide-in-right 0.2s ease-out' }}
      >
        {/* ── Panel header ── */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-[var(--color-border)] flex-shrink-0">
          <div className="flex-1 min-w-0">
            {isLoading ? (
              <Skeleton className="h-5 w-48 mb-2" />
            ) : (
              <h2 className="text-base font-semibold text-[var(--color-text-primary)] truncate">
                {displayName}
              </h2>
            )}
            {node && (
              <div className="mt-1">
                <NodeStatusBadge status={status} />
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)] transition-colors flex-shrink-0 mt-0.5"
            title="Close panel"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Panel body — scrollable ── */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <PanelSkeleton />
          ) : error ? (
            <div className="flex flex-col items-center justify-center gap-3 p-10 text-center">
              <AlertTriangle size={24} className="text-red-400" />
              <p className="text-sm text-[var(--color-text-muted)]">Failed to load node details.</p>
              <button
                onClick={() => queryClient.invalidateQueries({ queryKey: ['nodes', nodeId] })}
                className="text-xs text-[var(--color-accent)] hover:underline"
              >
                Retry
              </button>
            </div>
          ) : node ? (
            <div className="divide-y divide-[var(--color-border)]">

              {/* ── Identity ── */}
              <Section title="Identity" icon={Fingerprint}>
                <DetailRow label="Node ID">
                  <span className="font-mono text-sm text-[var(--color-text-secondary)]">{node.id}</span>
                </DetailRow>
                <DetailRow label="Machine Key">
                  <CopyableText
                    value={node.machineKey}
                    display={truncateKey(node.machineKey, 22)}
                    label="Machine Key"
                    mono
                  />
                </DetailRow>
                <DetailRow label="Node Key">
                  <CopyableText
                    value={node.nodeKey}
                    display={truncateKey(node.nodeKey, 22)}
                    label="Node Key"
                    mono
                  />
                </DetailRow>
                <DetailRow label="Created">
                  <span className="text-sm text-[var(--color-text-secondary)]">
                    {formatAbsoluteTime(node.createdAt)}
                  </span>
                </DetailRow>
              </Section>

              {/* ── Network ── */}
              <Section title="Network" icon={Network}>
                {ipv4 && (
                  <DetailRow label="IPv4">
                    <CopyableText value={ipv4} label="IPv4" mono />
                  </DetailRow>
                )}
                {ipv6 && (
                  <DetailRow label="IPv6">
                    <CopyableText value={ipv6} label="IPv6" mono />
                  </DetailRow>
                )}
                <DetailRow label="Register Method">
                  <Badge variant="default">
                    {getRegisterMethodLabel(node.registerMethod)}
                  </Badge>
                </DetailRow>
              </Section>

              {/* ── User ── */}
              <Section title="User" icon={UserCheck}>
                {editingMove ? (
                  <div className="space-y-2">
                    <select
                      value={moveUser}
                      onChange={(e) => setMoveUser(e.target.value)}
                      className="w-full px-3 py-1.5 text-sm bg-[var(--color-bg-base)] border border-[var(--color-accent)] rounded-lg text-[var(--color-text-primary)] focus:outline-none"
                    >
                      {users.map((u) => (
                        <option key={u.id} value={u.name}>{u.name}</option>
                      ))}
                    </select>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => moveMutation.mutate({ id: node.id, user: moveUser })}
                        disabled={moveMutation.isPending || moveUser === node.user.name}
                        className="px-3 py-1 text-xs font-medium bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white rounded-lg transition-colors disabled:opacity-50"
                      >
                        {moveMutation.isPending ? 'Moving...' : 'Move'}
                      </button>
                      <button
                        onClick={() => { setEditingMove(false); setMoveUser(node.user.name) }}
                        className="px-3 py-1 text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)] rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--color-text-primary)]">{node.user.name}</span>
                    <button
                      onClick={() => setEditingMove(true)}
                      className="flex items-center gap-1 text-xs text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors"
                    >
                      Move to User <ChevronRight size={12} />
                    </button>
                  </div>
                )}
              </Section>

              {/* ── Routes ── */}
              <Section title="Routes" icon={Route}>
                <RoutesSection
                  node={node}
                  onApproveRoute={handleApproveRoute}
                  onDisableRoute={handleDisableRoute}
                  approveLoading={approveRoutesMutation.isPending}
                />
              </Section>

              {/* ── Tags ── */}
              <Section title="Tags" icon={Tag}>
                {editingTags ? (
                  <TagEditor
                    currentTags={node.tags}
                    onSave={(tags) => setTagsMutation.mutate({ id: node.id, tags })}
                    onCancel={() => setEditingTags(false)}
                    loading={setTagsMutation.isPending}
                  />
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-1.5 min-h-[24px]">
                      {node.tags.length > 0 ? (
                        node.tags.map((tag) => <TagChip key={tag} label={tag} />)
                      ) : (
                        <span className="text-sm text-[var(--color-text-muted)]">No tags</span>
                      )}
                    </div>
                    <button
                      onClick={() => setEditingTags(true)}
                      className="text-xs text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors"
                    >
                      Edit Tags
                    </button>
                  </div>
                )}
              </Section>

              {/* ── Expiry ── */}
              <Section title="Expiry" icon={Clock}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--color-text-primary)]">
                      {node.expiry ? formatAbsoluteTime(node.expiry) : 'Never'}
                    </p>
                    {node.expiry && (
                      <p className={cn(
                        'text-xs mt-0.5',
                        node.isExpired ? 'text-red-400' : 'text-[var(--color-text-muted)]',
                      )}>
                        {node.isExpired ? 'Expired' : formatExpiry(node.expiry)}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setShowExpireConfirm(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-400 border border-amber-400/30 hover:bg-amber-400/10 rounded-lg transition-colors"
                  >
                    <Clock size={12} />
                    Expire Key
                  </button>
                </div>
              </Section>

              {/* ── Danger Zone ── */}
              <Section title="Danger Zone" icon={Shield}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">Delete Node</p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                      Permanently removes this node from your Tailnet.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-400 border border-red-400/30 hover:bg-red-400/10 rounded-lg transition-colors flex-shrink-0"
                  >
                    <Trash2 size={12} />
                    Delete
                  </button>
                </div>
              </Section>

            </div>
          ) : null}
        </div>
      </aside>

      {/* Expire confirm */}
      {node && (
        <ConfirmDialog
          open={showExpireConfirm}
          onClose={() => setShowExpireConfirm(false)}
          onConfirm={() => expireMutation.mutate(node.id)}
          title="Expire Node Key"
          description={`This will immediately expire the authentication key for "${displayName}". The device will need to re-authenticate before it can reconnect.`}
          confirmLabel="Expire Key"
          variant="warning"
          loading={expireMutation.isPending}
        />
      )}

      {/* Delete confirm */}
      {node && (
        <ConfirmDialog
          open={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={() => deleteMutation.mutate(node.id)}
          title="Delete Node"
          description={`This will permanently remove "${displayName}" from your Tailnet. This action cannot be undone.`}
          confirmLabel="Delete Node"
          variant="danger"
          requireTyping={displayName}
          loading={deleteMutation.isPending}
        />
      )}
    </>
  )
}
