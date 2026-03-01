import { useState } from 'react'
import { XCircle, Loader2, Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { testConnection } from '@/api/client'
import { useConnectionStore } from '@/stores/connection'

export function SetupWizard() {
  const { setCredentials, proxyMode } = useConnectionStore()
  const [serverUrl, setServerUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [testing, setTesting] = useState(false)
  const [error, setError] = useState('')
  const [cmdCopied, setCmdCopied] = useState(false)

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault()
    const url = proxyMode ? '' : serverUrl.trim()
    if (!proxyMode && !url) return
    if (!apiKey.trim()) return

    setTesting(true)
    setError('')
    try {
      await testConnection(url, apiKey.trim())
      setCredentials(url, apiKey.trim())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed')
    } finally {
      setTesting(false)
    }
  }

  const cliCommand = 'headscale apikeys create --expiration 90d'
  const handleCopyCmd = async () => {
    await navigator.clipboard.writeText(cliCommand)
    setCmdCopied(true)
    setTimeout(() => setCmdCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-base)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[var(--color-accent)] flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">H</span>
          </div>
          <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">Connect to Headscale</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            {proxyMode ? 'Enter your API key to get started' : 'Enter your server details to get started'}
          </p>
        </div>

        <form onSubmit={handleConnect} className="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-2xl p-6 space-y-5">
          {/* Server URL — hidden in proxy mode */}
          {!proxyMode && (
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
                Server URL
              </label>
              <input
                type="url"
                value={serverUrl}
                onChange={(e) => { setServerUrl(e.target.value); setError('') }}
                placeholder="https://headscale.example.com"
                required
                className={inputClass}
                autoFocus
              />
            </div>
          )}

          {/* API Key */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
              API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => { setApiKey(e.target.value); setError('') }}
              placeholder="Enter your headscale API key"
              required
              autoFocus={proxyMode}
              className={cn(inputClass, 'font-mono')}
            />
            {/* CLI helper */}
            <div className="mt-2 flex items-center justify-between bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded-lg px-3 py-2">
              <code className="text-xs font-mono text-[var(--color-text-secondary)]">{cliCommand}</code>
              <button
                type="button"
                onClick={handleCopyCmd}
                className="ml-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
              >
                {cmdCopied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              </button>
            </div>
            <p className="mt-1.5 text-xs text-[var(--color-text-muted)]">
              Generate an API key on your headscale server using the command above
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2.5">
              <XCircle size={14} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={testing || (!proxyMode && !serverUrl) || !apiKey}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
          >
            {testing ? (
              <><Loader2 size={16} className="animate-spin" /> Connecting...</>
            ) : (
              <>Connect <span>→</span></>
            )}
          </button>
        </form>

        {/* Privacy note */}
        <p className="text-center text-xs text-[var(--color-text-muted)] mt-4">
          Your credentials are stored only in your browser and sent only to your server.
        </p>
      </div>
    </div>
  )
}

const inputClass = 'w-full px-3 py-2.5 text-sm bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors'
