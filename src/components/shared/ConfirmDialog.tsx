import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: string
  description: string
  confirmLabel?: string
  variant?: 'danger' | 'warning' | 'default'
  requireTyping?: string   // if set, user must type this exact string to confirm
  loading?: boolean
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  variant = 'default',
  requireTyping,
  loading = false,
}: ConfirmDialogProps) {
  const [typed, setTyped] = useState('')
  const [isPending, setIsPending] = useState(false)

  if (!open) return null

  const canConfirm = !requireTyping || typed === requireTyping
  const isLoading = loading || isPending

  const handleConfirm = async () => {
    setIsPending(true)
    try {
      await onConfirm()
    } finally {
      setIsPending(false)
      setTyped('')
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setTyped('')
      onClose()
    }
  }

  const variantStyles = {
    danger: 'text-red-400',
    warning: 'text-amber-400',
    default: 'text-[var(--color-accent)]',
  }

  const btnStyles = {
    danger: 'bg-red-500 hover:bg-red-600 disabled:bg-red-500/40 text-white',
    warning: 'bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/40 text-white',
    default: 'bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:bg-[var(--color-accent)]/40 text-white',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />
      {/* Modal */}
      <div
        className="relative z-10 w-full max-w-md mx-4 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-xl shadow-2xl"
        style={{ animation: 'fade-in 0.15s ease-out' }}
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={cn('flex-shrink-0 mt-0.5', variantStyles[variant])}>
              <AlertTriangle size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-1">{title}</h3>
              <p className="text-sm text-[var(--color-text-secondary)]">{description}</p>

              {requireTyping && (
                <div className="mt-4">
                  <label className="block text-xs text-[var(--color-text-muted)] mb-1.5">
                    Type <span className="font-mono text-[var(--color-text-secondary)]">{requireTyping}</span> to confirm
                  </label>
                  <input
                    type="text"
                    value={typed}
                    onChange={(e) => setTyped(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] font-mono placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)]"
                    placeholder={requireTyping}
                    autoFocus
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--color-border)]">
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)] rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm || isLoading}
            className={cn('px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:cursor-not-allowed', btnStyles[variant])}
          >
            {isLoading ? 'Working...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
