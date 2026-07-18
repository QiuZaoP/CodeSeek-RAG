export interface ServiceConfig {
  apiBaseUrl: string
  useMockApi: boolean
  requestTimeoutMs: number
  mockDelayMs: number
}

type Environment = Record<string, string | boolean | undefined>

const DEFAULT_CONFIG: ServiceConfig = {
  apiBaseUrl: 'http://127.0.0.1:8000',
  useMockApi: true,
  requestTimeoutMs: 15_000,
  mockDelayMs: 450,
}

function readBoolean(value: string | boolean | undefined, fallback: boolean) {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value !== 'string') {
    return fallback
  }

  const normalized = value.trim().toLowerCase()
  if (['true', '1', 'yes', 'on'].includes(normalized)) {
    return true
  }
  if (['false', '0', 'no', 'off'].includes(normalized)) {
    return false
  }
  return fallback
}

function readInteger(value: string | boolean | undefined, fallback: number, minimum: number) {
  if (typeof value !== 'string' || value.trim() === '') {
    return fallback
  }

  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed >= minimum ? parsed : fallback
}

export function resolveServiceConfig(environment: Environment = {}): ServiceConfig {
  const apiBaseUrl =
    typeof environment.VITE_API_BASE_URL === 'string' && environment.VITE_API_BASE_URL.trim()
      ? environment.VITE_API_BASE_URL.trim().replace(/\/+$/, '')
      : DEFAULT_CONFIG.apiBaseUrl

  return {
    apiBaseUrl,
    useMockApi: readBoolean(environment.VITE_USE_MOCK_API, DEFAULT_CONFIG.useMockApi),
    requestTimeoutMs: readInteger(
      environment.VITE_REQUEST_TIMEOUT_MS,
      DEFAULT_CONFIG.requestTimeoutMs,
      1,
    ),
    mockDelayMs: readInteger(environment.VITE_MOCK_DELAY_MS, DEFAULT_CONFIG.mockDelayMs, 0),
  }
}

export function getServiceConfig() {
  const environment = (import.meta.env ?? {}) as Environment
  return resolveServiceConfig(environment)
}
