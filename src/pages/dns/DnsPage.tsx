import { Server, Info } from 'lucide-react'
import { PageHeader } from '@/components/layout/TopBar'

export function DnsPage() {
  return (
    <div>
      <PageHeader
        title="DNS Configuration"
        description="DNS settings are managed via headscale's config.yaml"
      />

      <div className="max-w-2xl">
        <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-xl p-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] flex items-center justify-center mx-auto mb-4">
            <Server size={24} className="text-[var(--color-text-muted)]" />
          </div>
          <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-2">
            DNS is config-file driven
          </h3>
          <p className="text-sm text-[var(--color-text-muted)] max-w-sm mx-auto mb-4">
            MagicDNS, nameservers, split DNS, and search domains are configured in{' '}
            <code className="font-mono text-xs bg-[var(--color-bg-elevated)] px-1.5 py-0.5 rounded">config.yaml</code>.
            They cannot be modified via the API.
          </p>
          <div className="flex items-start gap-2 text-xs text-[var(--color-text-muted)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-lg p-3 text-left">
            <Info size={13} className="flex-shrink-0 mt-0.5 text-[var(--color-accent)]" />
            <span>
              DNS configuration management (read + edit) is planned for a future phase, including{' '}
              support for <code className="font-mono">extra_records</code> files when the UI has filesystem access.
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
