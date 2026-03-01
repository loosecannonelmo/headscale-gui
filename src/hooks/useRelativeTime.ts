import { useState, useEffect } from 'react'
import { formatRelativeTime } from '@/lib/utils'

export function useRelativeTime(date: string | Date | null | undefined): string {
  const [, setTick] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60_000)
    return () => clearInterval(interval)
  }, [])

  if (!date) return 'Never'
  return formatRelativeTime(date)
}
