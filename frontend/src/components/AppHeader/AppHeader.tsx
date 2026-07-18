import { NavLink } from 'react-router-dom'

import '@/components/AppHeader/app-header.css'

function getNavClassName({ isActive }: { isActive: boolean }) {
  return isActive ? 'app-header__link app-header__link--active' : 'app-header__link'
}

export function AppHeader() {
  return (
    <header className="app-header">
      <NavLink className="app-header__brand" to="/workspace" aria-label="CodeSeek 工作台">
        CodeSeek
      </NavLink>

      <nav className="app-header__nav" aria-label="主导航">
        <NavLink className={getNavClassName} to="/workspace">
          工作台
        </NavLink>
        <NavLink className={getNavClassName} to="/guide">
          使用说明
        </NavLink>
      </nav>
    </header>
  )
}
