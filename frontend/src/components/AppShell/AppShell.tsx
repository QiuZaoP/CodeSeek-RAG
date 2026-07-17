import { Outlet } from 'react-router-dom'

import { AppHeader } from '@/components/AppHeader/AppHeader'
import '@/components/AppShell/app-shell.css'

export function AppShell() {
  return (
    <div className="app-shell">
      <AppHeader />
      <Outlet />
    </div>
  )
}
