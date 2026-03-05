import { api } from './client'
import type {
  ListPreAuthKeysResponse, ListApiKeysResponse,
  HeadscalePreAuthKey,
  CreatePreAuthKeyRequest, CreateApiKeyRequest,
} from './types'

export const preAuthKeysApi = {
  // v0.28.0: global list returns all users' keys; ?user= param is ignored
  list: (): Promise<ListPreAuthKeysResponse> =>
    api.get('/preauthkey'),

  listForUser: (user: string): Promise<ListPreAuthKeysResponse> =>
    api.get(`/preauthkey?user=${encodeURIComponent(user)}`),

  create: (req: CreatePreAuthKeyRequest): Promise<{ preAuthKey: HeadscalePreAuthKey }> =>
    api.post('/preauthkey', req),

  // v0.28.0: expire/delete now take the key's id (uint64), not user+key string
  expire: (id: string): Promise<void> =>
    api.post('/preauthkey/expire', { id }),

  delete: (id: string): Promise<void> =>
    api.delete(`/preauthkey?id=${encodeURIComponent(id)}`),
}

export const apiKeysApi = {
  list: (): Promise<ListApiKeysResponse> =>
    api.get('/apikey'),

  create: (expiration: string): Promise<{ apiKey: string }> =>
    api.post('/apikey', { expiration } satisfies CreateApiKeyRequest),

  expire: (prefix: string): Promise<void> =>
    api.post('/apikey/expire', { prefix: prefix.replace(/\*+$/, '') }),

  // v0.28.0: list response masks prefix as "hskey-api-XXXX-***" — strip *** before URL
  delete: (prefix: string): Promise<void> =>
    api.delete(`/apikey/${prefix.replace(/\*+$/, '')}`),
}

export function getPreAuthKeyStatus(key: HeadscalePreAuthKey): 'active' | 'expiring-soon' | 'expired' | 'used' {
  if (key.used && !key.reusable) return 'used'
  const expiry = new Date(key.expiration)
  if (expiry.getTime() < Date.now()) return 'expired'
  const sevenDays = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  if (expiry < sevenDays) return 'expiring-soon'
  return 'active'
}
