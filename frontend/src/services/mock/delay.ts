import { AppError } from '@/types/errors'

export function waitForMockDelay(delayMs: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(
        new AppError('请求已取消。', {
          code: 'REQUEST_ABORTED',
          retryable: false,
        }),
      )
      return
    }

    const handleAbort = () => {
      globalThis.clearTimeout(timeoutId)
      reject(
        new AppError('请求已取消。', {
          code: 'REQUEST_ABORTED',
          retryable: false,
        }),
      )
    }

    const timeoutId = globalThis.setTimeout(() => {
      signal?.removeEventListener('abort', handleAbort)
      resolve()
    }, delayMs)

    signal?.addEventListener('abort', handleAbort, { once: true })
  })
}
