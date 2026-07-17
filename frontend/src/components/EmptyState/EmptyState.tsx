import type { ReactNode } from 'react'

import '@/components/EmptyState/empty-state.css'

interface EmptyStateProps {
  title: string
  children: ReactNode
  action?: ReactNode
}

export function EmptyState({ action, children, title }: EmptyStateProps) {
  return (
    <section className="empty-state">
      <h2>{title}</h2>
      <div>{children}</div>
      {action ? <div className="empty-state__action">{action}</div> : null}
    </section>
  )
}
