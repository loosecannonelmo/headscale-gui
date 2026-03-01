import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { useUIStore } from '@/stores/ui'

export function AppLayout() {
  const tableDensity = useUIStore(s => s.tableDensity)

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-bg-base)]" data-density={tableDensity}>
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 max-w-[1400px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
