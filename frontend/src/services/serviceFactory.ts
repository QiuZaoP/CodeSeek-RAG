import { createChatService } from '@/services/chatService'
import { getServiceConfig } from '@/services/config'
import type { ServiceConfig } from '@/services/config'
import type { ServiceBundle } from '@/services/contracts'
import { createHttpClient } from '@/services/httpClient'
import { createIndexService } from '@/services/indexService'
import type { MockServiceOptions } from '@/services/mock/mockServices'
import { createMockServices } from '@/services/mock/mockServices'
import { createProjectService } from '@/services/projectService'

export interface ServiceFactoryOptions {
  config?: ServiceConfig
  fetchImplementation?: typeof fetch
  mock?: Omit<MockServiceOptions, 'delayMs'>
}

export function createServices(options: ServiceFactoryOptions = {}): ServiceBundle {
  const config = options.config ?? getServiceConfig()
  if (config.useMockApi) {
    return createMockServices({
      delayMs: config.mockDelayMs,
      ...options.mock,
    })
  }

  const httpClient = createHttpClient({
    baseUrl: config.apiBaseUrl,
    timeoutMs: config.requestTimeoutMs,
    fetchImplementation: options.fetchImplementation,
  })

  return {
    projectService: createProjectService(httpClient),
    indexService: createIndexService(httpClient),
    chatService: createChatService(httpClient),
  }
}

export const services = createServices()
export const projectService = services.projectService
export const indexService = services.indexService
export const chatService = services.chatService
