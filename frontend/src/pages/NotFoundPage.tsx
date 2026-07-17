import { NavLink } from 'react-router-dom'

import { EmptyState } from '@/components/EmptyState/EmptyState'
import '@/pages/content-page.css'

export function NotFoundPage() {
  return (
    <main className="content-page page-container">
      <EmptyState
        title="页面不存在"
        action={
          <NavLink className="button button--primary" to="/workspace">
            返回工作台
          </NavLink>
        }
      >
        当前地址没有对应页面，请返回工作台继续使用 CodeSeek。
      </EmptyState>
    </main>
  )
}
