import type { IndexService } from '@/services/contracts'
import type { HttpClient } from '@/services/httpClient'
import type { IndexStatusResponse } from '@/types/api'

export function createIndexService(httpClient: HttpClient): IndexService {
  return {
    buildIndex(request, options) {
      return httpClient.request<IndexStatusResponse>('/api/index/build', {
        method: 'POST',
        body: request,
        signal: options?.signal,
      })
    },
    getIndexStatus(projectId, options) {
      const query = new URLSearchParams({ project_id: projectId })
      return httpClient.request<IndexStatusResponse>(`/api/index/status?${query}`, {
        signal: options?.signal,
      })
    },
  }
}
