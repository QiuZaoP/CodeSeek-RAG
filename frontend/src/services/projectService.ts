import type { ProjectService } from '@/services/contracts'
import type { HttpClient } from '@/services/httpClient'
import { validateLoadProjectResponse } from '@/services/responseValidators'
import type { LoadProjectResponse } from '@/types/api'

export function createProjectService(httpClient: HttpClient): ProjectService {
  return {
    async loadProject(request, options) {
      const response = await httpClient.request<LoadProjectResponse>('/api/projects/load', {
        method: 'POST',
        body: request,
        signal: options?.signal,
      })
      return validateLoadProjectResponse(response)
    },
  }
}
