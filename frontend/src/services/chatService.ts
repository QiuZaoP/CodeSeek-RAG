import type { ChatService } from '@/services/contracts'
import type { HttpClient } from '@/services/httpClient'
import type { ChatResponse } from '@/types/api'

export function createChatService(httpClient: HttpClient): ChatService {
  return {
    askQuestion(request, options) {
      return httpClient.request<ChatResponse>('/api/chat', {
        method: 'POST',
        body: request,
        signal: options?.signal,
      })
    },
  }
}
