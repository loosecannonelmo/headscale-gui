import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { usersApi } from '@/api/users'
import { nodesApi } from '@/api/nodes'
import { preAuthKeysApi, getPreAuthKeyStatus } from '@/api/keys'
import { PageHeader } from '@/components/layout/TopBar'
import { NodeStatusBadge, KeyStatusBadge } from '@/components/shared/StatusBadge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { SkeletonRow, Skeleton } from '@/components/shared/SkeletonRow'
import { EmptyState } from '@/components/shared/EmptyState'
import { cn, getNodeStatus, formatRelativeTime, formatExpiry } from '@/lib/utils'
import { Monitor, Key } from 'lucide-react'

export function UserDetailPage() {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.list,
    refetchInterval: 60_000,
  })

  const user = usersData?.users.find(u => u.id === userId)

  const { data: nodesData, isLoading: nodesLoading } = useQuery({
    queryKey: ['nodes', 'user', user?.name],
    queryFn: () => nodesApi.list(user?.name),
    enabled: !!user?.name,
    refetchInterval: 15_000,
  })

  const { data: keysData } = useQuery({
    queryKey: ['preauth-keys', user?.name],
    queryFn: () => preAuthKeysApi.listForUser(user!.name),
    enabled: !!user?.name,
    refetchInterval: 30_000,
  })

  const deleteMutation = useMutation({
    mutationFn: () => usersApi.delete(user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success(`User "${user!.name}" deleted`)
      navigate('/users')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const expireNodeMutation = useMutation({
    mutationFn: (nodeId: string) => nodesApi.expire(nodeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nodes'] })
      toast.success('Node key expired')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const nodes = nodesData?.nodes ?? []
  const keys = keysData?.preAuthKeys ?? []
  const activeKeyCount = keys.filter(k => getPreAuthKeyStatus(k) === 'active').length

  if (usersLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="text-center py-16 text-[var(--color-text-muted)]">
        User not found.{' '}
        <Link to="/users" className="text-[var(--color-accent)] hover:underline">Back to Users</Link>
      </div>
    )
  }

  const canDelete = nodes.length === 0

  return (
    <div>
      {/* Back link */}
      <Link
        to="/users"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] mb-4 transition-colors"
      >
        <ArrowLeft size={14} /> Users
      </Link>

      <PageHeader
        title={user.displayName || user.name}
        description={`@${user.name} · Created ${formatRelativeTime(user.createdAt)}`}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <StatCard icon={Monitor} label="Nodes" value={nodes.length} />
        <StatCard icon={Key} label="Active Keys" value={activeKeyCount} />
      </div>

      {/* Nodes table */}
      <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-[var(--color-border)]">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Nodes</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-xs text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="text-left px-5 py-3 font-medium">Name</th>
                <th className="text-left px-5 py-3 font-medium">Status</th>
                <th className="text-left px-5 py-3 font-medium">IP Address</th>
                <th className="text-left px-5 py-3 font-medium">Last Seen</th>
                <th className="text-right px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {nodesLoading ? (
                Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} cols={5} />)
              ) : nodes.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <EmptyState
                      icon={Monitor}
                      title="No nodes"
                      description="This user has no registered nodes"
                    />
                  </td>
                </tr>
              ) : (
                nodes.map(node => (
                  <tr key={node.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg-subtle)] transition-colors">
                    <td className="px-5 py-3">
                      <span className="font-mono text-sm text-[var(--color-text-primary)]">
                        {node.givenName || node.name}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <NodeStatusBadge status={getNodeStatus(node.online, node.lastSeen)} />
                    </td>
                    <td className="px-5 py-3">
                      <span className="font-mono text-sm text-[var(--color-text-secondary)]">
                        {node.ipAddresses.find(ip => ip.startsWith('100.')) ?? node.ipAddresses[0] ?? '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-[var(--color-text-muted)]">
                      {formatRelativeTime(node.lastSeen)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => expireNodeMutation.mutate(node.id)}
                        disabled={expireNodeMutation.isPending}
                        className="px-3 py-1 text-xs text-[var(--color-text-muted)] hover:text-amber-400 border border-[var(--color-border)] hover:border-amber-400/30 rounded-lg transition-colors disabled:opacity-50"
                      >
                        Expire Key
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pre-auth keys */}
      {keys.length > 0 && (
        <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-[var(--color-border)]">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Pre-Auth Keys</h2>
          </div>
          <div className="divide-y divide-[var(--color-border)]">
            {keys.map(key => (
              <div key={key.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <span className="font-mono text-xs text-[var(--color-text-secondary)]">
                    {key.key.slice(0, 12)}...
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <KeyStatusBadge status={getPreAuthKeyStatus(key)} />
                    {key.reusable && <span className="text-xs text-[var(--color-text-muted)]">Reusable</span>}
                    {key.ephemeral && <span className="text-xs text-[var(--color-text-muted)]">Ephemeral</span>}
                  </div>
                </div>
                <div className="text-xs text-[var(--color-text-muted)]">
                  Expires {formatExpiry(key.expiration)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Danger zone */}
      <div className="border border-red-400/30 rounded-xl overflow-hidden">
        <div className="px-5 py-3 bg-red-400/5 border-b border-red-400/30 text-xs font-semibold uppercase tracking-wider text-red-400">
          Danger Zone
        </div>
        <div className="bg-[var(--color-bg-surface)] px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-[var(--color-text-primary)]">Delete User</div>
              {!canDelete ? (
                <div className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  Move or delete all {nodes.length} node(s) before deleting this user
                </div>
              ) : (
                <div className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  Permanently delete this user
                </div>
              )}
            </div>
            <button
              onClick={() => setConfirmDelete(true)}
              disabled={!canDelete}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                canDelete
                  ? 'text-red-400 border border-red-400/30 hover:bg-red-400/10'
                  : 'text-[var(--color-text-disabled)] border border-[var(--color-border)] cursor-not-allowed',
              )}
            >
              <Trash2 size={14} /> Delete User
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => deleteMutation.mutate()}
        title={`Delete user "${user.name}"`}
        description="This action cannot be undone. The user will be permanently removed."
        confirmLabel="Delete User"
        variant="danger"
        requireTyping={user.name}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Monitor; label: string; value: number }) {
  return (
    <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} className="text-[var(--color-text-muted)]" />
        <span className="text-xs text-[var(--color-text-muted)]">{label}</span>
      </div>
      <div className="text-2xl font-semibold text-[var(--color-text-primary)]">{value}</div>
    </div>
  )
}
