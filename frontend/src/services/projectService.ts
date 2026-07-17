import type { ProjectService } from '@/services/contracts'
import type { HttpClient } from '@/services/httpClient'
import type { LoadProjectResponse } from '@/types/api'

export function createProjectService(httpClient: HttpClient): ProjectService {
  return {
    loadProject(request, options) {
      return httpClient.request<LoadProjectResponse>('/api/projects/load', {
        method: 'POST',
        body: request,
        signal: options?.signal,
      })
    },
  }
}
