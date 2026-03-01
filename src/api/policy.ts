import { api } from './client'
import type { HeadscalePolicy } from './types'

export const policyApi = {
  get: (): Promise<HeadscalePolicy> =>
    api.get('/policy'),

  set: (policy: string): Promise<HeadscalePolicy> =>
    api.put('/policy', { policy }),
}
