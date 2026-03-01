import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Route, ExternalLink, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { nodesApi } from '@/api/nodes'
import type { HeadscaleNode } from '@/api/types'
import { PageHeader } from '@/components/layout/TopBar'
import { Badge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { SkeletonRow } from '@/components/shared/SkeletonRow'
import { cn } from '@/lib/utils'

// In v0.28.0, routes are string[] fields on the node object:
//   availableRoutes — CIDRs the node is advertising
//   approvedRoutes  — CIDRs admin has approved
//   subnetRoutes    — CIDRs currently active as subnet routes

interface FlatRoute {
  cidr: string
  node: HeadscaleNode
  advertised: boolean  // in availableRoutes
  approved: boolean    // in approvedRoutes
  isExitNode: boolean
}

function isExitCIDR(cidr: string) {
  return cidr === '0.0.0.0/0' || cidr === '::/0'
}

function buildFlatRoutes(nodes: HeadscaleNode[]): FlatRoute[] {
  const routes: FlatRoute[] = []
  for (const node of nodes) {
    const available = node.availableRoutes ?? []
    const approved = node.approvedRoutes ?? []
    // Union of all known CIDRs for this node
    const all = [...new Set([...available, ...approved])]
    for (const cidr of all) {
      routes.push({
        cidr,
        node,
        advertised: available.includes(cidr),
        approved: approved.includes(cidr),
        isExitNode: isExitCIDR(cidr),
      })
    }
  }
  return routes
}

function routeStatus(r: FlatRoute): 'pending' | 'approved' | 'disabled' {
  if (!r.advertised && r.approved) return 'disabled'   // was approved, node stopped advertising
  if (r.advertised && !r.approved) return 'pending'
  return 'approved'
}

function RouteStatusBadge({ route }: { route: FlatRoute }) {
  const s = routeStatus(route)
  const cfg = {
    pending:  { label: 'Pending',  cls: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
    approved: { label: 'Approved', cls: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
    disabled: { label: 'Disabled', cls: 'text-[var(--color-text-muted)] bg-[var(--color-bg-elevated)] border-[var(--color-border)]' },
  }[s]
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border', cfg.cls)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', s === 'approved' ? 'bg-emerald-400' : s === 'pending' ? 'bg-amber-400' : 'bg-[var(--color-text-muted)]')} />
      {cfg.label}
    </span>
  )
}

export function RoutesPage() {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['nodes'],
    queryFn: () => nodesApi.list(),
    refetchInterval: 30_000,
  })

  const nodes = data?.nodes ?? []
  const allRoutes = buildFlatRoutes(nodes)

  const subnetRoutes = allRoutes.filter(r => !r.isExitNode)
  const exitRoutes   = allRoutes.filter(r => r.isExitNode)
  const pendingCount = subnetRoutes.filter(r => routeStatus(r) === 'pending').length

  const approveMutation = useMutation({
    mutationFn: async ({ node, cidr, approve }: { node: HeadscaleNode; cidr: string; approve: boolean }) => {
      const current = node.approvedRoutes ?? []
      const next = approve
        ? [...new Set([...current, cidr])]
        : current.filter(c => c !== cidr)
      return nodesApi.approveRoutes(node.id, next)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nodes'] })
      toast.success('Route updated')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div>
      <PageHeader
        title="Routes & Exit Nodes"
        description="Subnet routes and exit nodes advertised by your tailnet nodes"
      />

      {/* Pending banner */}
      {pendingCount > 0 && (
        <div className="mb-6 flex items-center gap-3 px-4 py-3 bg-amber-400/10 border border-amber-400/30 rounded-xl text-sm text-amber-400">
          <AlertCircle size={16} className="flex-shrink-0" />
          <span>
            <strong>{pendingCount}</strong> subnet route{pendingCount !== 1 ? 's' : ''} pending approval
          </span>
        </div>
      )}

      {/* Subnet routes table */}
      <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Subnet Routes</h2>
          {subnetRoutes.length > 0 && (
            <span className="text-xs text-[var(--color-text-muted)]">{subnetRoutes.length} route{subnetRoutes.length !== 1 ? 's' : ''}</span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-xs text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="text-left px-5 py-3 font-medium">Route</th>
                <th className="text-left px-5 py-3 font-medium">Node</th>
                <th className="text-left px-5 py-3 font-medium">User</th>
                <th className="text-left px-5 py-3 font-medium">Status</th>
                <th className="text-right px-5 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} cols={5} />)
              ) : subnetRoutes.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <EmptyState
                      icon={Route}
                      title="No subnet routes"
                      description="Nodes can advertise subnet routes with: tailscale up --advertise-routes=10.0.0.0/24"
                    />
                  </td>
                </tr>
              ) : (
                subnetRoutes
                  .sort((a, b) => {
                    // Pending first
                    const order = { pending: 0, approved: 1, disabled: 2 }
                    return order[routeStatus(a)] - order[routeStatus(b)]
                  })
                  .map((route, i) => {
                    const status = routeStatus(route)
                    return (
                      <tr
                        key={`${route.node.id}-${route.cidr}-${i}`}
                        className={cn(
                          'border-b border-[var(--color-border)] hover:bg-[var(--color-bg-subtle)] transition-colors',
                          status === 'pending' && 'border-l-2 border-l-amber-400',
                        )}
                      >
                        <td className="px-5 py-3">
                          <span className="font-mono text-sm text-[var(--color-text-primary)]">{route.cidr}</span>
                        </td>
                        <td className="px-5 py-3 text-sm text-[var(--color-text-secondary)]">
                          {route.node.givenName || route.node.name}
                        </td>
                        <td className="px-5 py-3 text-sm text-[var(--color-text-secondary)]">
                          {route.node.user.name}
                        </td>
                        <td className="px-5 py-3">
                          <RouteStatusBadge route={route} />
                        </td>
                        <td className="px-5 py-3 text-right">
                          {status === 'pending' ? (
                            <button
                              onClick={() => approveMutation.mutate({ node: route.node, cidr: route.cidr, approve: true })}
                              disabled={approveMutation.isPending}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-400 border border-emerald-400/30 hover:bg-emerald-400/10 rounded-lg transition-colors disabled:opacity-50"
                            >
                              <CheckCircle size={12} /> Approve
                            </button>
                          ) : status === 'approved' ? (
                            <button
                              onClick={() => approveMutation.mutate({ node: route.node, cidr: route.cidr, approve: false })}
                              disabled={approveMutation.isPending}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--color-text-muted)] border border-[var(--color-border)] hover:text-red-400 hover:border-red-400/30 rounded-lg transition-colors disabled:opacity-50"
                            >
                              <XCircle size={12} /> Disable
                            </button>
                          ) : (
                            // disabled — node stopped advertising; offer to remove approval
                            <button
                              onClick={() => approveMutation.mutate({ node: route.node, cidr: route.cidr, approve: false })}
                              disabled={approveMutation.isPending}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--color-text-disabled)] border border-[var(--color-border)] hover:text-red-400 hover:border-red-400/30 rounded-lg transition-colors disabled:opacity-50"
                            >
                              <XCircle size={12} /> Remove
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Exit nodes section */}
      <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--color-border)]">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Exit Nodes</h2>
        </div>
        {isLoading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <SkeletonRow key={i} cols={3} />
            ))}
          </div>
        ) : exitRoutes.length === 0 ? (
          <EmptyState
            icon={ExternalLink}
            title="No exit nodes"
            description="Advertise an exit node with: tailscale up --advertise-exit-node"
          />
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {exitRoutes
              .sort((a, b) => `${a.node.id}${a.cidr}`.localeCompare(`${b.node.id}${b.cidr}`))
              .map((route, i) => {
                const status = routeStatus(route)
                const ipv4 = route.node.ipAddresses.find(ip => ip.startsWith('100.')) ?? route.node.ipAddresses[0]
                return (
                  <div key={`${route.node.id}-${route.cidr}-${i}`} className="flex items-center justify-between px-5 py-4 hover:bg-[var(--color-bg-subtle)] transition-colors">
                    <div className="flex items-center gap-3">
                      <ExternalLink size={15} className={status === 'approved' ? 'text-emerald-400' : 'text-[var(--color-text-muted)]'} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-[var(--color-text-primary)]">
                            {route.node.givenName || route.node.name}
                          </span>
                          <Badge variant="info">Exit Node</Badge>
                          <span className="text-xs text-[var(--color-text-muted)] font-mono">{route.cidr}</span>
                        </div>
                        <div className="text-xs text-[var(--color-text-muted)] mt-0.5">
                          {route.node.user.name} · {ipv4}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <RouteStatusBadge route={route} />
                      {status === 'pending' ? (
                        <button
                          onClick={() => approveMutation.mutate({ node: route.node, cidr: route.cidr, approve: true })}
                          disabled={approveMutation.isPending}
                          className="px-3 py-1.5 text-xs font-medium text-emerald-400 border border-emerald-400/30 hover:bg-emerald-400/10 rounded-lg transition-colors disabled:opacity-50"
                        >
                          Approve
                        </button>
                      ) : status === 'approved' ? (
                        <button
                          onClick={() => approveMutation.mutate({ node: route.node, cidr: route.cidr, approve: false })}
                          disabled={approveMutation.isPending}
                          className="px-3 py-1.5 text-xs font-medium text-[var(--color-text-muted)] border border-[var(--color-border)] hover:text-red-400 hover:border-red-400/30 rounded-lg transition-colors disabled:opacity-50"
                        >
                          Disable
                        </button>
                      ) : null}
                    </div>
                  </div>
                )
              })}
          </div>
        )}
      </div>
    </div>
  )
}
