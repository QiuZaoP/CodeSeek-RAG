import type { IndexService } from '@/services/contracts'
import type { HttpClient } from '@/services/httpClient'
import { validateIndexStatusResponse } from '@/services/responseValidators'
import type { IndexStatusResponse } from '@/types/api'

export function createIndexService(httpClient: HttpClient): IndexService {
  return {
    async buildIndex(request, options) {
      const response = await httpClient.request<IndexStatusResponse>('/api/index/build', {
        method: 'POST',
        body: request,
        signal: options?.signal,
      })
      return validateIndexStatusResponse(response)
    },
    async getIndexStatus(projectId, options) {
      const query = new URLSearchParams({ project_id: projectId })
      const response = await httpClient.request<IndexStatusResponse>(`/api/index/status?${query}`, {
        signal: options?.signal,
      })
      return validateIndexStatusResponse(response)
    },
  }
}
