import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { healthApi } from '@/api/health'
import { useConnectionStore } from '@/stores/connection'

export function useConnectionStatus() {
  const { isConfigured, status, setStatus } = useConnectionStore()

  const { isError, isSuccess } = useQuery({
    queryKey: ['health'],
    queryFn: healthApi.check,
    enabled: isConfigured(),
    refetchInterval: 30_000,
    retry: 2,
  })

  useEffect(() => {
    if (isSuccess && status !== 'connected') {
      setStatus('connected')
    } else if (isError && status === 'connected') {
      setStatus('reconnecting')
    }
  }, [isSuccess, isError, status, setStatus])

  return status
}
