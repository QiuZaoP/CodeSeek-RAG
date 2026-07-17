import { Outlet } from 'react-router-dom'

import { AppHeader } from '@/components/AppHeader/AppHeader'
import '@/components/AppShell/app-shell.css'

export function AppShell() {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        跳到主要内容
      </a>
      <AppHeader />
      <Outlet />
    </div>
  )
}
