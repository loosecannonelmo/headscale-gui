import { useQuery } from '@tanstack/react-query'
import { Monitor, Users, Key, Wifi, AlertCircle } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { nodesApi } from '@/api/nodes'
import { usersApi } from '@/api/users'
import { preAuthKeysApi } from '@/api/keys'
import { healthApi } from '@/api/health'
import { PageHeader } from '@/components/layout/TopBar'
import { NodeStatusBadge } from '@/components/shared/StatusBadge'
import { Skeleton } from '@/components/shared/SkeletonRow'
import { getNodeStatus, formatRelativeTime } from '@/lib/utils'
import { getPreAuthKeyStatus } from '@/api/keys'

export function DashboardPage() {
  const navigate = useNavigate()

  const { data: nodesData, isLoading: nodesLoading } = useQuery({
    queryKey: ['nodes'],
    queryFn: () => nodesApi.list(),
    refetchInterval: 30_000,
  })

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.list,
    refetchInterval: 60_000,
  })

  const { data: healthData } = useQuery({
    queryKey: ['health'],
    queryFn: healthApi.check,
    refetchInterval: 30_000,
  })

  // v0.28.0: global list returns all users' keys; no fan-out needed
  const { data: allKeys } = useQuery({
    queryKey: ['preauth-keys'],
    queryFn: async () => {
      const result = await preAuthKeysApi.list()
      return result.preAuthKeys
    },
    refetchInterval: 60_000,
  })

  const nodes = nodesData?.nodes ?? []
  const users = usersData?.users ?? []

  const onlineCount = nodes.filter(n => n.online && !n.isExpired).length
  const offlineCount = nodes.filter(n => !n.online && !n.isExpired).length
  const expiredCount = nodes.filter(n => n.isExpired).length
  const activeKeys = (allKeys ?? []).filter(k => getPreAuthKeyStatus(k) === 'active').length

  const recentNodes = [...nodes]
    .sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime())
    .slice(0, 6)

  const isHealthy = healthData !== undefined

  return (
    <div>
      <PageHeader title="Overview" description="Network status at a glance" />

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          icon={Monitor}
          label="Total Nodes"
          value={nodesLoading ? null : nodes.length}
          to="/nodes"
          color="blue"
        />
        <MetricCard
          icon={Wifi}
          label="Online Now"
          value={nodesLoading ? null : onlineCount}
          sub={`of ${nodes.length}`}
          to="/nodes"
          color="green"
        />
        <MetricCard
          icon={Users}
          label="Users"
          value={users.length || null}
          to="/users"
          color="purple"
        />
        <MetricCard
          icon={Key}
          label="Active Keys"
          value={allKeys !== undefined ? activeKeys : null}
          to="/keys"
          color="amber"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Node status donut */}
        <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">Node Status</h2>
          {nodesLoading ? (
            <div className="flex items-center justify-center h-32">
              <Skeleton className="w-24 h-24 rounded-full" />
            </div>
          ) : (
            <DonutChart online={onlineCount} offline={offlineCount} expired={expiredCount} />
          )}
        </div>

        {/* Server info */}
        <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-xl p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">Server Status</h2>
          <div className="space-y-3">
            <InfoRow label="Database">
              <span className={isHealthy ? 'text-emerald-400' : 'text-red-400'}>
                {isHealthy ? '● Healthy' : '● Unhealthy'}
              </span>
            </InfoRow>
            <InfoRow label="Nodes expiring soon">
              {nodes.filter(n => {
                if (!n.expiry) return false
                const days = (new Date(n.expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                return days > 0 && days < 7
              }).length > 0 ? (
                <span className="text-amber-400 flex items-center gap-1">
                  <AlertCircle size={12} />
                  {nodes.filter(n => {
                    if (!n.expiry) return false
                    const days = (new Date(n.expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                    return days > 0 && days < 7
                  }).length} node(s)
                </span>
              ) : (
                <span className="text-emerald-400">None</span>
              )}
            </InfoRow>
            <InfoRow label="Routes pending approval">
              {(() => {
                // v0.28.0: pending = advertised (availableRoutes) but not approved
                const pending = nodes.reduce((acc, n) => {
                  const available = n.availableRoutes ?? []
                  const approved = n.approvedRoutes ?? []
                  return acc + available.filter(cidr => !approved.includes(cidr)).length
                }, 0)
                return pending > 0
                  ? <span className="text-amber-400 flex items-center gap-1"><AlertCircle size={12} />{pending} route(s)</span>
                  : <span className="text-emerald-400">None</span>
              })()}
            </InfoRow>
          </div>
        </div>
      </div>

      {/* Recently active nodes */}
      <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Recent Activity</h2>
          <Link to="/nodes" className="text-xs text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]">
            View all →
          </Link>
        </div>
        <div className="divide-y divide-[var(--color-border)]">
          {nodesLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3">
                <Skeleton className="w-2 h-2 rounded-full" />
                <Skeleton className="w-32 h-4" />
                <Skeleton className="w-20 h-4 ml-auto" />
              </div>
            ))
          ) : recentNodes.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-[var(--color-text-muted)]">
              No nodes registered yet
            </div>
          ) : (
            recentNodes.map(node => (
              <button
                key={node.id}
                onClick={() => navigate(`/nodes?open=${node.id}`)}
                className="w-full flex items-center gap-4 px-5 py-3 hover:bg-[var(--color-bg-subtle)] transition-colors text-left cursor-pointer"
              >
                <NodeStatusBadge status={getNodeStatus(node.online, node.lastSeen)} />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-[var(--color-text-primary)] truncate block">
                    {node.givenName || node.name}
                  </span>
                  <span className="text-xs text-[var(--color-text-muted)]">{node.user.name}</span>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-xs font-mono text-[var(--color-text-secondary)]">
                    {node.ipAddresses.find(ip => ip.startsWith('100.')) ?? node.ipAddresses[0]}
                  </div>
                  <div className="text-xs text-[var(--color-text-muted)]">
                    {formatRelativeTime(node.lastSeen)}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────

function MetricCard({
  icon: Icon, label, value, sub, to, color,
}: {
  icon: typeof Monitor
  label: string
  value: number | null
  sub?: string
  to: string
  color: 'blue' | 'green' | 'purple' | 'amber'
}) {
  const colors = {
    blue:   'text-[var(--color-accent)] bg-[var(--color-accent-subtle)]',
    green:  'text-emerald-400 bg-emerald-400/10',
    purple: 'text-purple-400 bg-purple-400/10',
    amber:  'text-amber-400 bg-amber-400/10',
  }

  return (
    <Link
      to={to}
      className="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-xl p-5 hover:border-[var(--color-border-strong)] transition-colors group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors[color]}`}>
          <Icon size={15} />
        </div>
      </div>
      {value === null ? (
        <Skeleton className="h-8 w-16 mb-1" />
      ) : (
        <div className="text-2xl font-semibold text-[var(--color-text-primary)] leading-none mb-1">
          {value}
        </div>
      )}
      <div className="text-xs text-[var(--color-text-muted)]">
        {label}{sub && <span className="ml-1 text-[var(--color-text-disabled)]">{sub}</span>}
      </div>
    </Link>
  )
}

function DonutChart({ online, offline, expired }: { online: number; offline: number; expired: number }) {
  const total = online + offline + expired
  if (total === 0) return (
    <div className="flex items-center justify-center h-32 text-sm text-[var(--color-text-muted)]">No nodes</div>
  )

  const size = 100
  const cx = size / 2
  const cy = size / 2
  const r = 36
  const strokeWidth = 14
  const circumference = 2 * Math.PI * r

  const segments = [
    { value: online,  color: '#3DD68C', label: 'Online' },
    { value: offline, color: '#FF5E5E', label: 'Offline' },
    { value: expired, color: '#606080', label: 'Expired' },
  ].filter(s => s.value > 0)

  let offset = 0
  const arcs = segments.map(seg => {
    const pct = seg.value / total
    const dash = pct * circumference
    const arc = { ...seg, dashArray: `${dash} ${circumference - dash}`, dashOffset: -offset * circumference }
    offset += pct
    return arc
  })

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--color-border)" strokeWidth={strokeWidth} />
        {arcs.map((arc, i) => (
          <circle
            key={i}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={arc.color}
            strokeWidth={strokeWidth}
            strokeDasharray={arc.dashArray}
            strokeDashoffset={arc.dashOffset}
            strokeLinecap="butt"
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        ))}
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" className="fill-[var(--color-text-primary)] text-lg font-bold" style={{ fontSize: 18 }}>
          {total}
        </text>
      </svg>
      <div className="space-y-2">
        {[
          { label: 'Online',  color: '#3DD68C', count: online },
          { label: 'Offline', color: '#FF5E5E', count: offline },
          ...(expired > 0 ? [{ label: 'Expired', color: '#606080', count: expired }] : []),
        ].map(s => (
          <div key={s.label} className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
            <span className="text-[var(--color-text-muted)]">{s.label}</span>
            <span className="text-[var(--color-text-secondary)] font-medium ml-auto pl-2">{s.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-[var(--color-text-muted)]">{label}</span>
      <span>{children}</span>
    </div>
  )
}
