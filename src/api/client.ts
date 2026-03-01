import { ApiError } from './types'
import { useConnectionStore } from '@/stores/connection'

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { serverUrl, apiKey, proxyMode, setStatus } = useConnectionStore.getState()

  if (!apiKey || (!proxyMode && !serverUrl)) {
    throw new ApiError(0, 'Not configured')
  }

  const base = proxyMode ? '' : serverUrl.replace(/\/$/, '')
  const url = `${base}/api/v1${path}`

  let response: Response
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })
  } catch (err) {
    setStatus('disconnected')
    throw new ApiError(0, err instanceof Error ? err.message : 'Network error')
  }

  if (response.status === 401 || response.status === 403) {
    setStatus('auth_error')
    throw new ApiError(response.status, 'Unauthorized — check your API key')
  }

  if (!response.ok) {
    let message = `HTTP ${response.status}`
    try {
      const body = await response.json() as { message?: string }
      if (body.message) message = body.message
    } catch { /* ignore */ }
    throw new ApiError(response.status, message)
  }

  setStatus('connected')

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: body !== undefined ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'DELETE', body: body !== undefined ? JSON.stringify(body) : undefined }),
}

// Quick connectivity test — returns version info or throws
export async function testConnection(serverUrl: string, apiKey: string): Promise<{ version: string }> {
  const url = `${serverUrl.replace(/\/$/, '')}/api/v1/health`
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${apiKey}` },
  })
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new ApiError(response.status, 'Invalid API key')
    }
    throw new ApiError(response.status, `Server returned ${response.status}`)
  }
  // Try to get version from nodes endpoint
  try {
    const versionUrl = `${serverUrl.replace(/\/$/, '')}/api/v1/apikey`
    const vr = await fetch(versionUrl, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    })
    if (vr.ok) return { version: 'connected' }
  } catch { /* ignore */ }
  return { version: 'connected' }
}
