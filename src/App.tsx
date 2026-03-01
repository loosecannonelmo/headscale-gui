import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'

import { useConnectionStore } from '@/stores/connection'
import { useUIStore } from '@/stores/ui'

// Load runtime config injected by the Docker container
async function loadRuntimeConfig(setProxyMode: (v: boolean) => void) {
  try {
    const res = await fetch('/config.json')
    if (res.ok) {
      const cfg = await res.json() as { proxyMode?: boolean }
      if (cfg.proxyMode) setProxyMode(true)
    }
  } catch { /* no config.json = direct mode */ }
}

import { AppLayout } from '@/components/layout/AppLayout'
import { SetupWizard } from '@/pages/setup/SetupWizard'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { NodesPage } from '@/pages/nodes/NodesPage'
import { RoutesPage } from '@/pages/routes/RoutesPage'
import { UsersPage } from '@/pages/users/UsersPage'
import { UserDetailPage } from '@/pages/users/UserDetailPage'
import { PreAuthKeysPage } from '@/pages/keys/PreAuthKeysPage'
import { ApiKeysPage } from '@/pages/keys/ApiKeysPage'
import { AclPage } from '@/pages/acl/AclPage'
import { DnsPage } from '@/pages/dns/DnsPage'
import { SettingsPage } from '@/pages/settings/SettingsPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 10_000,
    },
  },
})

function ThemeEffect() {
  const { theme } = useUIStore()

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      root.classList.toggle('light', !prefersDark)
    } else {
      root.classList.toggle('light', theme === 'light')
    }
  }, [theme])

  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      document.documentElement.classList.toggle('light', !e.matches)
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  return null
}

function AppRoutes() {
  const { isConfigured, setProxyMode } = useConnectionStore()

  useEffect(() => {
    loadRuntimeConfig(setProxyMode)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!isConfigured()) {
    return <SetupWizard />
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="nodes" element={<NodesPage />} />
        <Route path="routes" element={<RoutesPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="users/:userId" element={<UserDetailPage />} />
        <Route path="keys" element={<PreAuthKeysPage />} />
        <Route path="apikeys" element={<ApiKeysPage />} />
        <Route path="acl" element={<AclPage />} />
        <Route path="dns" element={<DnsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeEffect />
        <AppRoutes />
        <Toaster
          position="bottom-right"
          theme="dark"
          toastOptions={{
            style: {
              background: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
            },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
