import { useId, type InputHTMLAttributes } from 'react'

import '@/components/TextField/text-field.css'

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: string
  error?: string
}

export function TextField({
  className = '',
  error,
  hint,
  id,
  label,
  ...props
}: TextFieldProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const descriptionId = error || hint ? `${inputId}-description` : undefined
  const classes = `text-field__input ${error ? 'text-field__input--error' : ''} ${className}`.trim()

  return (
    <div className="text-field">
      <label className="text-field__label" htmlFor={inputId}>
        {label}
      </label>
      <input
        className={classes}
        id={inputId}
        aria-describedby={descriptionId}
        aria-invalid={error ? true : undefined}
        {...props}
      />
      {error || hint ? (
        <p className={error ? 'text-field__message text-field__message--error' : 'text-field__message'} id={descriptionId}>
          {error ?? hint}
        </p>
      ) : null}
    </div>
  )
}
