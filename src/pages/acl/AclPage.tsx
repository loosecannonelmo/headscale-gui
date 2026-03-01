import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Save, RotateCcw, AlertCircle, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { policyApi } from '@/api/policy'
import { PageHeader } from '@/components/layout/TopBar'
import { cn } from '@/lib/utils'

export function AclPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['policy'],
    queryFn: policyApi.get,
  })

  const [draft, setDraft] = useState('')
  const [isDirty, setIsDirty] = useState(false)
  const [syntaxError, setSyntaxError] = useState<string | null>(null)

  useEffect(() => {
    if (data?.policy && !isDirty) {
      setDraft(data.policy)
    }
  }, [data, isDirty])

  const saveMutation = useMutation({
    mutationFn: () => policyApi.set(draft),
    onSuccess: () => {
      setIsDirty(false)
      toast.success('ACL policy saved')
    },
    onError: (e: Error) => toast.error(`Save failed: ${e.message}`),
  })

  const handleChange = (value: string) => {
    setDraft(value)
    setIsDirty(true)
    // Client-side JSON syntax validation (HuJSON = JSON with comments — strip comments first)
    try {
      const stripped = value.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '')
      JSON.parse(stripped)
      setSyntaxError(null)
    } catch (e) {
      setSyntaxError(e instanceof SyntaxError ? e.message : 'Syntax error')
    }
  }

  const handleRevert = () => {
    if (data?.policy) {
      setDraft(data.policy)
      setIsDirty(false)
      setSyntaxError(null)
    }
  }

  const handleSave = () => {
    if (syntaxError) {
      toast.error('Fix syntax errors before saving')
      return
    }
    saveMutation.mutate()
  }

  // Keyboard shortcut: Cmd/Ctrl+S
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's' && isDirty) {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isDirty, draft, syntaxError])

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between mb-4">
        <PageHeader
          title="ACL Policy"
          description="Edit your headscale access control policy (HuJSON format)"
          className="mb-0"
        />
        <div className="flex items-center gap-2">
          {isDirty && (
            <button
              onClick={handleRevert}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] border border-[var(--color-border)] rounded-lg transition-colors"
            >
              <RotateCcw size={14} /> Revert
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!isDirty || saveMutation.isPending || !!syntaxError}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={14} />
            {saveMutation.isPending ? 'Saving...' : 'Save Policy'}
          </button>
        </div>
      </div>

      {isDirty && (
        <div className="mb-3 flex items-center gap-2 px-3 py-2 bg-amber-400/10 border border-amber-400/30 rounded-lg text-xs text-amber-400">
          <AlertCircle size={13} />
          Unsaved changes · Press Cmd+S to save
        </div>
      )}

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Editor panel */}
        <div className={cn(
          'flex-1 min-w-0 bg-[var(--color-bg-surface)] border rounded-xl overflow-hidden flex flex-col',
          syntaxError ? 'border-red-400/50' : 'border-[var(--color-border)]',
        )}>
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
            <span className="text-xs font-medium text-[var(--color-text-muted)]">policy.hujson</span>
            <div className="flex items-center gap-1.5 text-xs">
              {syntaxError ? (
                <span className="text-red-400 flex items-center gap-1">
                  <AlertCircle size={11} /> {syntaxError.slice(0, 60)}
                </span>
              ) : (
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle size={11} /> Valid HuJSON
                </span>
              )}
            </div>
          </div>
          {isLoading ? (
            <div className="flex-1 animate-pulse bg-[var(--color-bg-elevated)] m-2 rounded" />
          ) : (
            <textarea
              value={draft}
              onChange={(e) => handleChange(e.target.value)}
              spellCheck={false}
              className="flex-1 p-4 font-mono text-sm bg-transparent text-[var(--color-text-primary)] resize-none focus:outline-none leading-relaxed"
              placeholder='// HuJSON ACL policy&#10;{&#10;  "acls": [&#10;    {"action": "accept", "src": ["*"], "dst": ["*:*"]}&#10;  ]&#10;}'
            />
          )}
        </div>

        {/* Info panel */}
        <div className="w-64 flex-shrink-0 space-y-3">
          <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-xl p-4">
            <h3 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">Quick Reference</h3>
            <div className="space-y-2 text-xs text-[var(--color-text-secondary)]">
              <div><span className="text-[var(--color-accent)] font-mono">acls</span> — access rules</div>
              <div><span className="text-[var(--color-accent)] font-mono">groups</span> — user groups</div>
              <div><span className="text-[var(--color-accent)] font-mono">tagOwners</span> — who can assign tags</div>
              <div><span className="text-[var(--color-accent)] font-mono">hosts</span> — named IP ranges</div>
              <div><span className="text-[var(--color-accent)] font-mono">autoApprovers</span> — auto-approve routes</div>
              <div><span className="text-[var(--color-accent)] font-mono">ssh</span> — SSH access rules</div>
            </div>
          </div>
          <div className="bg-amber-400/10 border border-amber-400/30 rounded-xl p-4 text-xs text-amber-400">
            <AlertCircle size={13} className="mb-2" />
            HuJSON allows <code className="font-mono">// comments</code> inside JSON. Saving replaces the entire policy immediately.
          </div>
        </div>
      </div>
    </div>
  )
}
