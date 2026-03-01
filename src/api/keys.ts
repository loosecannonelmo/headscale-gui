import { api } from './client'
import type {
  ListPreAuthKeysResponse, ListApiKeysResponse,
  HeadscalePreAuthKey,
  CreatePreAuthKeyRequest, CreateApiKeyRequest,
} from './types'

export const preAuthKeysApi = {
  // Must fetch per-user — no global listing endpoint
  listForUser: (user: string): Promise<ListPreAuthKeysResponse> =>
    api.get(`/preauthkey?user=${encodeURIComponent(user)}`),

  create: (req: CreatePreAuthKeyRequest): Promise<{ preAuthKey: HeadscalePreAuthKey }> =>
    api.post('/preauthkey', req),

  expire: (user: string, key: string): Promise<void> =>
    api.post('/preauthkey/expire', { user, key }),

  delete: (user: string, key: string): Promise<void> =>
    api.delete('/preauthkey', { user, key }),
}

export const apiKeysApi = {
  list: (): Promise<ListApiKeysResponse> =>
    api.get('/apikey'),

  create: (expiration: string): Promise<{ apiKey: string }> =>
    api.post('/apikey', { expiration } satisfies CreateApiKeyRequest),

  expire: (prefix: string): Promise<void> =>
    api.post('/apikey/expire', { prefix }),

  delete: (prefix: string): Promise<void> =>
    api.delete(`/apikey/${prefix}`),
}

export function getPreAuthKeyStatus(key: HeadscalePreAuthKey): 'active' | 'expiring-soon' | 'expired' | 'used' {
  if (key.used && !key.reusable) return 'used'
  const expiry = new Date(key.expiration)
  if (expiry.getTime() < Date.now()) return 'expired'
  const sevenDays = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  if (expiry < sevenDays) return 'expiring-soon'
  return 'active'
}
