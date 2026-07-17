import type { ReactNode } from 'react'

import { AlertIcon } from '@/components/Icon/Icon'
import '@/components/ErrorNotice/error-notice.css'

interface ErrorNoticeProps {
  title: string
  children: ReactNode
  action?: ReactNode
}

export function ErrorNotice({ action, children, title }: ErrorNoticeProps) {
  return (
    <section className="error-notice" role="alert">
      <AlertIcon className="error-notice__icon" />
      <div>
        <h2>{title}</h2>
        <div className="error-notice__body">{children}</div>
        {action ? <div className="error-notice__action">{action}</div> : null}
      </div>
    </section>
  )
}
