import { useState } from 'react'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { testConnection } from '@/api/client'
import { useConnectionStore } from '@/stores/connection'
import { useUIStore } from '@/stores/ui'
import { PageHeader } from '@/components/layout/TopBar'
import type { Theme } from '@/stores/ui'

export function SettingsPage() {
  const { serverUrl, apiKey, setCredentials, disconnect, status } = useConnectionStore()
  const { theme, setTheme, tableDensity, setTableDensity } = useUIStore()

  const [urlDraft, setUrlDraft] = useState(serverUrl)
  const [keyDraft, setKeyDraft] = useState(apiKey)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<'ok' | 'err' | null>(null)
  const [testError, setTestError] = useState('')

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      await testConnection(urlDraft, keyDraft)
      setTestResult('ok')
    } catch (e) {
      setTestResult('err')
      setTestError(e instanceof Error ? e.message : 'Connection failed')
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async () => {
    if (!urlDraft.trim() || !keyDraft.trim()) {
      toast.error('Server URL and API key are required')
      return
    }
    setCredentials(urlDraft.trim(), keyDraft.trim())
    toast.success('Connection settings saved')
  }

  const themeOptions: { value: Theme; label: string }[] = [
    { value: 'dark', label: 'Dark' },
    { value: 'light', label: 'Light' },
    { value: 'system', label: 'System' },
  ]

  return (
    <div className="max-w-2xl">
      <PageHeader title="Settings" description="Configure your headscale connection and interface preferences" />

      {/* CONNECTION */}
      <Section title="Connection">
        <Field label="Server URL" description="Your headscale server's base URL">
          <input
            type="url"
            value={urlDraft}
            onChange={(e) => { setUrlDraft(e.target.value); setTestResult(null) }}
            placeholder="https://headscale.example.com"
            className={inputClass}
          />
        </Field>
        <Field label="API Key" description="Generate with: headscale apikeys create">
          <div className="flex gap-2">
            <input
              type="password"
              value={keyDraft}
              onChange={(e) => { setKeyDraft(e.target.value); setTestResult(null) }}
              placeholder="Enter your headscale API key"
              className={cn(inputClass, 'flex-1 font-mono')}
            />
          </div>
        </Field>

        <div className="flex items-center gap-3 mt-2">
          <button
            onClick={handleTest}
            disabled={testing || !urlDraft || !keyDraft}
            className="px-4 py-2 text-sm font-medium bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {testing && <Loader2 size={14} className="animate-spin" />}
            Test Connection
          </button>
          <button
            onClick={handleSave}
            disabled={!urlDraft || !keyDraft}
            className="px-4 py-2 text-sm font-medium bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white rounded-lg transition-colors disabled:opacity-50"
          >
            Save
          </button>

          {testResult === 'ok' && (
            <span className="flex items-center gap-1.5 text-sm text-emerald-400">
              <CheckCircle size={14} /> Connected
            </span>
          )}
          {testResult === 'err' && (
            <span className="flex items-center gap-1.5 text-sm text-red-400">
              <XCircle size={14} /> {testError}
            </span>
          )}
        </div>

        <div className="mt-3 text-xs text-[var(--color-text-muted)]">
          Connection status:{' '}
          <span className={cn(
            'font-medium',
            status === 'connected' ? 'text-emerald-400' :
            status === 'auth_error' ? 'text-red-400' :
            'text-amber-400',
          )}>
            {status}
          </span>
        </div>
      </Section>

      {/* INTERFACE */}
      <Section title="Interface">
        <Field label="Theme">
          <div className="flex gap-2">
            {themeOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors',
                  theme === opt.value
                    ? 'bg-[var(--color-accent-subtle)] border-[var(--color-accent)] text-[var(--color-accent)]'
                    : 'bg-[var(--color-bg-elevated)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Table density">
          <div className="flex gap-2">
            {(['comfortable', 'dense'] as const).map((d) => (
              <button
                key={d}
                onClick={() => setTableDensity(d)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors capitalize',
                  tableDensity === d
                    ? 'bg-[var(--color-accent-subtle)] border-[var(--color-accent)] text-[var(--color-accent)]'
                    : 'bg-[var(--color-bg-elevated)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
                )}
              >
                {d}
              </button>
            ))}
          </div>
        </Field>
      </Section>

      {/* DANGER ZONE */}
      <Section title="Danger Zone" danger>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-[var(--color-text-primary)]">Disconnect</div>
            <div className="text-xs text-[var(--color-text-muted)]">Remove saved credentials and return to setup</div>
          </div>
          <button
            onClick={() => {
              disconnect()
              toast.success('Disconnected')
            }}
            className="px-4 py-2 text-sm font-medium text-red-400 border border-red-400/30 hover:bg-red-400/10 rounded-lg transition-colors"
          >
            Disconnect
          </button>
        </div>
      </Section>
    </div>
  )
}

// ── sub-components ─────────────────────────────────────────────────────────

function Section({ title, children, danger }: { title: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <div className={cn(
      'mb-8 border rounded-xl overflow-hidden',
      danger ? 'border-red-400/30' : 'border-[var(--color-border)]',
    )}>
      <div className={cn(
        'px-5 py-3 text-xs font-semibold uppercase tracking-wider',
        danger
          ? 'bg-red-400/5 text-red-400 border-b border-red-400/30'
          : 'bg-[var(--color-bg-surface)] text-[var(--color-text-muted)] border-b border-[var(--color-border)]',
      )}>
        {title}
      </div>
      <div className="bg-[var(--color-bg-surface)] px-5 py-4 space-y-4">
        {children}
      </div>
    </div>
  )
}

function Field({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">{label}</label>
      {description && <p className="text-xs text-[var(--color-text-muted)] mb-2">{description}</p>}
      {children}
    </div>
  )
}

const inputClass = 'w-full px-3 py-2 text-sm bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors'
