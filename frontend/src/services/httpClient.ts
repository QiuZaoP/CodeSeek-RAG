import { AppError, isAppError } from '@/types/errors'

export interface HttpRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  headers?: HeadersInit
  signal?: AbortSignal
}

export interface HttpClient {
  request<ResponseBody>(path: string, options?: HttpRequestOptions): Promise<ResponseBody>
}

export interface HttpClientOptions {
  baseUrl: string
  timeoutMs: number
  fetchImplementation?: typeof fetch
}

interface ErrorPayload {
  detail?: unknown
}

function buildUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
}

function getDetailMessage(payload: unknown) {
  if (!payload || typeof payload !== 'object' || !('detail' in payload)) {
    return undefined
  }

  const detail = (payload as ErrorPayload).detail
  if (typeof detail === 'string' && detail.trim()) {
    return detail
  }

  if (Array.isArray(detail)) {
    const validationMessage = detail.find(
      (item): item is { msg: string } =>
        Boolean(item) && typeof item === 'object' && 'msg' in item && typeof item.msg === 'string',
    )
    return validationMessage?.msg
  }

  return undefined
}

function isRetryableStatus(status: number) {
  return status === 408 || status === 429 || status >= 500
}

function getStatusMessage(status: number) {
  if (status === 404) {
    return '请求的资源不存在。'
  }
  if (status === 422) {
    return '请求参数未通过服务端校验。'
  }
  if (status >= 500) {
    return '服务暂时不可用，请稍后重试。'
  }
  return `请求失败（HTTP ${status}）。`
}

async function parseJsonResponse(response: Response) {
  const responseText = await response.text()
  if (!responseText.trim()) {
    throw new AppError('服务返回了空响应。', {
      status: response.status,
      code: 'EMPTY_RESPONSE',
      retryable: response.status >= 500,
    })
  }

  try {
    return JSON.parse(responseText) as unknown
  } catch (error) {
    throw new AppError('服务返回了无法解析的响应。', {
      status: response.status,
      code: 'INVALID_RESPONSE',
      retryable: response.status >= 500,
      cause: error,
    })
  }
}

export function createHttpClient({
  baseUrl,
  fetchImplementation = fetch,
  timeoutMs,
}: HttpClientOptions): HttpClient {
  return {
    async request<ResponseBody>(path: string, options: HttpRequestOptions = {}) {
      const requestController = new AbortController()
      let didTimeout = false

      const handleExternalAbort = () => {
        requestController.abort(options.signal?.reason)
      }

      if (options.signal?.aborted) {
        handleExternalAbort()
      } else {
        options.signal?.addEventListener('abort', handleExternalAbort, { once: true })
      }

      const timeoutId = globalThis.setTimeout(() => {
        didTimeout = true
        requestController.abort()
      }, timeoutMs)

      const headers = new Headers(options.headers)
      headers.set('Accept', 'application/json')
      if (options.body !== undefined) {
        headers.set('Content-Type', 'application/json')
      }

      try {
        const response = await fetchImplementation(buildUrl(baseUrl, path), {
          method: options.method ?? 'GET',
          headers,
          body: options.body === undefined ? undefined : JSON.stringify(options.body),
          signal: requestController.signal,
        })
        const payload = await parseJsonResponse(response)

        if (!response.ok) {
          throw new AppError(getDetailMessage(payload) ?? getStatusMessage(response.status), {
            status: response.status,
            code: `HTTP_${response.status}`,
            retryable: isRetryableStatus(response.status),
          })
        }

        return payload as ResponseBody
      } catch (error) {
        if (isAppError(error)) {
          throw error
        }
        if (didTimeout) {
          throw new AppError('请求超时，请稍后重试。', {
            code: 'REQUEST_TIMEOUT',
            retryable: true,
            cause: error,
          })
        }
        if (options.signal?.aborted || isAbortError(error)) {
          throw new AppError('请求已取消。', {
            code: 'REQUEST_ABORTED',
            retryable: false,
            cause: error,
          })
        }
        throw new AppError('无法连接到服务，请检查后端是否已启动。', {
          code: 'NETWORK_ERROR',
          retryable: true,
          cause: error,
        })
      } finally {
        globalThis.clearTimeout(timeoutId)
        options.signal?.removeEventListener('abort', handleExternalAbort)
      }
    },
  }
}
