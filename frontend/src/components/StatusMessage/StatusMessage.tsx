import type { ReactNode } from 'react'

import { AlertIcon, CheckIcon } from '@/components/Icon/Icon'
import '@/components/StatusMessage/status-message.css'

type StatusVariant = 'neutral' | 'success' | 'error'

interface StatusMessageProps {
  children: ReactNode
  variant?: StatusVariant
}

export function StatusMessage({ children, variant = 'neutral' }: StatusMessageProps) {
  const icon = variant === 'success' ? <CheckIcon /> : variant === 'error' ? <AlertIcon /> : null

  return (
    <div className={`status-message status-message--${variant}`} role={variant === 'error' ? 'alert' : 'status'}>
      {icon ? <span className="status-message__icon">{icon}</span> : null}
      <span>{children}</span>
    </div>
  )
}
