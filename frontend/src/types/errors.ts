export interface AppErrorOptions {
  status?: number
  code?: string
  retryable?: boolean
  cause?: unknown
}

export class AppError extends Error {
  readonly status?: number
  readonly code?: string
  readonly retryable: boolean

  constructor(message: string, options: AppErrorOptions = {}) {
    super(message, { cause: options.cause })
    this.name = 'AppError'
    this.status = options.status
    this.code = options.code
    this.retryable = options.retryable ?? false
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}
