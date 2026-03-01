import { api } from './client'

export const healthApi = {
  check: (): Promise<{ services: Record<string, { status: string }> }> =>
    api.get('/health'),
}
