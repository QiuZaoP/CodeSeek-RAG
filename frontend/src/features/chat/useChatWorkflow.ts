import { useEffect, useRef, useState } from 'react'

import { chatService } from '@/services/serviceFactory'
import type { ChatHistoryTurn, ChatResponse } from '@/types/api'
import { AppError, isAppError } from '@/types/errors'

export type ChatStatus = 'idle' | 'loading' | 'success' | 'error'

export interface ChatTurn extends ChatHistoryTurn {
  response: ChatResponse
}

export interface ChatWorkflowState {
  status: ChatStatus
  turns: ChatTurn[]
  pendingQuestion?: string
  error?: AppError
}

const MAX_CONTEXT_TURNS = 8

function createInitialState(): ChatWorkflowState {
  return { status: 'idle', turns: [] }
}

export function useChatWorkflow() {
  const [questionInput, setQuestionInput] = useState('')
  const [state, setState] = useState<ChatWorkflowState>(createInitialState)
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
    setState(createInitialState())
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
    const turns = state.turns
    const history = turns.slice(-MAX_CONTEXT_TURNS).map(({ question: previousQuestion, answer }) => ({
      question: previousQuestion,
      answer,
    }))
    setState({ status: 'loading', turns, pendingQuestion: question })

    try {
      const response = await chatService.askQuestion(
        { project_id: projectId, question, top_k: 5, history },
        { signal: controller.signal },
      )
      if (activeController.current !== controller) {
        return
      }
      activeController.current = null
      isAnswering.current = false
      setState((current) => ({
        status: 'success',
        turns: [
          ...current.turns,
          { question, answer: response.answer, response },
        ],
      }))
    } catch (caughtError) {
      if (controller.signal.aborted || activeController.current !== controller) {
        return
      }
      activeController.current = null
      isAnswering.current = false
      setState((current) => ({
        status: 'error',
        turns: current.turns,
        pendingQuestion: question,
        error: isAppError(caughtError)
          ? caughtError
          : new AppError('问答服务发生未知错误，请重试。', {
              code: 'UNKNOWN_CHAT_ERROR',
              retryable: true,
              cause: caughtError,
            }),
      }))
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
