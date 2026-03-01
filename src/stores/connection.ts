import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ConnectionStatus = 'unconfigured' | 'connected' | 'reconnecting' | 'disconnected' | 'auth_error'

interface ConnectionStore {
  serverUrl: string
  apiKey: string
  proxyMode: boolean
  status: ConnectionStatus
  lastConnectedAt: number | null
  headscaleVersion: string | null

  setCredentials: (serverUrl: string, apiKey: string) => void
  setProxyMode: (enabled: boolean) => void
  setStatus: (status: ConnectionStatus) => void
  setVersion: (version: string) => void
  disconnect: () => void
  isConfigured: () => boolean
}

export const useConnectionStore = create<ConnectionStore>()(
  persist(
    (set, get) => ({
      serverUrl: '',
      apiKey: '',
      proxyMode: false,
      status: 'unconfigured',
      lastConnectedAt: null,
      headscaleVersion: null,

      setCredentials: (serverUrl, apiKey) => {
        set({ serverUrl, apiKey, status: 'reconnecting' })
      },

      setProxyMode: (enabled) => {
        set({ proxyMode: enabled })
      },

      setStatus: (status) => {
        set((state) => ({
          status,
          lastConnectedAt: status === 'connected' ? Date.now() : state.lastConnectedAt,
        }))
      },

      setVersion: (version) => set({ headscaleVersion: version }),

      disconnect: () => {
        set({ serverUrl: '', apiKey: '', status: 'unconfigured', headscaleVersion: null })
      },

      isConfigured: () => {
        const { serverUrl, apiKey, proxyMode } = get()
        if (proxyMode) return Boolean(apiKey)
        return Boolean(serverUrl && apiKey)
      },
    }),
    {
      name: 'headscale-connection',
      partialize: (state: ConnectionStore) => ({
        serverUrl: state.serverUrl,
        apiKey: state.apiKey,
      } as ConnectionStore),
    },
  ),
)
