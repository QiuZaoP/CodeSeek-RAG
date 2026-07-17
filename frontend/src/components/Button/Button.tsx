import type { ButtonHTMLAttributes } from 'react'

import { LoadingIndicator } from '@/components/LoadingIndicator/LoadingIndicator'
import '@/components/Button/button.css'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  isLoading?: boolean
}

export function Button({
  children,
  className = '',
  disabled = false,
  isLoading = false,
  variant = 'primary',
  ...props
}: ButtonProps) {
  const classes = `button button--${variant} ${className}`.trim()

  return (
    <button
      className={classes}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      {...props}
    >
      {isLoading ? <LoadingIndicator label="正在处理…" /> : null}
      <span>{children}</span>
    </button>
  )
}
