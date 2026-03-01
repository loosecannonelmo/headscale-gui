import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { cn, copyToClipboard } from '@/lib/utils'
import { toast } from 'sonner'

interface CopyButtonProps {
  value: string
  label?: string
  className?: string
  iconSize?: number
}

export function CopyButton({ value, label, className, iconSize = 14 }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await copyToClipboard(value)
      setCopied(true)
      toast.success(label ? `${label} copied` : 'Copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy')
    }
  }

  return (
    <button
      onClick={handleCopy}
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs',
        'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]',
        'hover:bg-[var(--color-bg-elevated)] transition-colors',
        className,
      )}
      title={`Copy ${label || 'to clipboard'}`}
    >
      {copied
        ? <Check size={iconSize} className="text-emerald-400" />
        : <Copy size={iconSize} />}
    </button>
  )
}

export function CopyableText({
  value,
  display,
  label,
  mono = true,
  className,
}: {
  value: string
  display?: string
  label?: string
  mono?: boolean
  className?: string
}) {
  return (
    <span className={cn('inline-flex items-center gap-1 group', className)}>
      <span className={cn(mono && 'font-mono text-sm', 'text-[var(--color-text-primary)]')}>
        {display ?? value}
      </span>
      <span className="opacity-0 group-hover:opacity-100 transition-opacity">
        <CopyButton value={value} label={label} />
      </span>
    </span>
  )
}
