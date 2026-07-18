import { useEffect, useRef, useState } from 'react'

import { chatService } from '@/services/serviceFactory'
import type { ChatResponse } from '@/types/api'
import { AppError, isAppError } from '@/types/errors'

export type ChatStatus = 'idle' | 'loading' | 'success' | 'error'

export interface ChatWorkflowState {
  status: ChatStatus
  question?: string
  response?: ChatResponse
  error?: AppError
}

const INITIAL_STATE: ChatWorkflowState = { status: 'idle' }

export function useChatWorkflow() {
  const [questionInput, setQuestionInput] = useState('')
  const [state, setState] = useState<ChatWorkflowState>(INITIAL_STATE)
  const activeController = useRef<AbortController | null>(null)
  const isAnswering = useRef(false)

  function cancelRequest() {
    activeController.current?.abort()
    activeController.current = null
    isAnswering.current = false
  }

  useEffect(() => {
    return () => cancelRequest()
  }, [])

  function reset() {
    cancelRequest()
    setQuestionInput('')
    setState(INITIAL_STATE)
  }

  async function askQuestion(projectId: string, questionOverride?: string) {
    const question = (questionOverride ?? questionInput).trim()
    if (!projectId || !question || isAnswering.current) {
      return
    }

    cancelRequest()
    const controller = new AbortController()
    activeController.current = controller
    isAnswering.current = true
    setQuestionInput('')
    setState({ status: 'loading', question })

    try {
      const response = await chatService.askQuestion(
        { project_id: projectId, question, top_k: 5 },
        { signal: controller.signal },
      )
      if (activeController.current !== controller) {
        return
      }
      activeController.current = null
      isAnswering.current = false
      setState({ status: 'success', question, response })
    } catch (caughtError) {
      if (controller.signal.aborted || activeController.current !== controller) {
        return
      }
      activeController.current = null
      isAnswering.current = false
      setState({
        status: 'error',
        question,
        error: isAppError(caughtError)
          ? caughtError
          : new AppError('问答服务发生未知错误，请重试。', {
              code: 'UNKNOWN_CHAT_ERROR',
              retryable: true,
              cause: caughtError,
            }),
      })
    }
  }

  return {
    askQuestion,
    questionInput,
    reset,
    setQuestionInput,
    state,
  }
}
