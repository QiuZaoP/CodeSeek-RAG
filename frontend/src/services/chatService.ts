import type { ChatService } from '@/services/contracts'
import type { HttpClient } from '@/services/httpClient'
import { validateChatResponse } from '@/services/responseValidators'
import type { ChatResponse } from '@/types/api'

export function createChatService(httpClient: HttpClient): ChatService {
  return {
    async askQuestion(request, options) {
      const response = await httpClient.request<ChatResponse>('/api/chat', {
        method: 'POST',
        body: request,
        signal: options?.signal,
      })
      return validateChatResponse(response)
    },
  }
}
