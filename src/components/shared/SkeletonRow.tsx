import { cn } from '@/lib/utils'

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded bg-[var(--color-bg-elevated)]',
        'bg-gradient-to-r from-[var(--color-bg-elevated)] via-[var(--color-bg-subtle)] to-[var(--color-bg-elevated)]',
        'bg-[length:200%_100%]',
        'animate-[shimmer_1.5s_infinite]',
        className,
      )}
    />
  )
}

export function SkeletonRow({ cols = 5 }: { cols?: number }) {
  const widths = ['w-32', 'w-24', 'w-20', 'w-28', 'w-16', 'w-24']
  return (
    <tr className="border-b border-[var(--color-border)]">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className={cn('h-4', widths[i % widths.length])} />
        </td>
      ))}
    </tr>
  )
}
