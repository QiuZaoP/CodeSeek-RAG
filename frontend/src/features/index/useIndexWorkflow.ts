import { useEffect, useRef, useState } from 'react'

import { indexService } from '@/services/serviceFactory'
import type { IndexStatus, IndexStatusResponse } from '@/types/api'
import { isAppError } from '@/types/errors'

const POLL_INTERVAL_MS = 1_500

export interface IndexWorkflowState {
  status: IndexStatus
  chunkCount?: number
  elapsedMs?: number
  errorMessage?: string
}

interface UseIndexWorkflowOptions {
  onBuildStart?: () => void
}

const INITIAL_STATE: IndexWorkflowState = { status: 'idle' }

export function useIndexWorkflow(options: UseIndexWorkflowOptions = {}) {
  const [state, setState] = useState<IndexWorkflowState>(INITIAL_STATE)
  const activeController = useRef<AbortController | null>(null)
  const pollTimer = useRef<number | null>(null)
  const isBuilding = useRef(false)

  function stopActiveBuild() {
    activeController.current?.abort()
    activeController.current = null
    if (pollTimer.current !== null) {
      globalThis.clearTimeout(pollTimer.current)
      pollTimer.current = null
    }
    isBuilding.current = false
  }

  useEffect(() => {
    return () => stopActiveBuild()
  }, [])

  function reset() {
    stopActiveBuild()
    setState(INITIAL_STATE)
  }

  function finishWithResponse(response: IndexStatusResponse, controller: AbortController) {
    if (activeController.current !== controller) {
      return
    }

    if (response.status === 'completed') {
      activeController.current = null
      isBuilding.current = false
      setState({
        status: 'completed',
        chunkCount: response.chunk_count,
        elapsedMs: response.elapsed_ms,
      })
      return
    }

    if (response.status === 'failed') {
      activeController.current = null
      isBuilding.current = false
      setState({
        status: 'failed',
        errorMessage: response.detail ?? '索引建立失败，请重试。',
      })
      return
    }

    if (response.status === 'idle') {
      activeController.current = null
      isBuilding.current = false
      setState({
        status: 'failed',
        errorMessage: '服务端未找到正在进行的索引任务，请重新建立索引。',
      })
    }
  }

  function finishWithError(error: unknown, controller: AbortController) {
    if (controller.signal.aborted || activeController.current !== controller) {
      return
    }
    activeController.current = null
    isBuilding.current = false
    setState({
      status: 'failed',
      errorMessage: isAppError(error) ? error.message : '索引服务发生未知错误，请重试。',
    })
  }

  function schedulePoll(projectId: string, controller: AbortController) {
    pollTimer.current = globalThis.setTimeout(async () => {
      pollTimer.current = null
      try {
        const response = await indexService.getIndexStatus(projectId, {
          signal: controller.signal,
        })
        if (activeController.current !== controller) {
          return
        }
        if (response.status === 'building') {
          schedulePoll(projectId, controller)
        } else {
          finishWithResponse(response, controller)
        }
      } catch (error) {
        finishWithError(error, controller)
      }
    }, POLL_INTERVAL_MS)
  }

  async function buildIndex(projectId: string) {
    if (!projectId || isBuilding.current) {
      return
    }

    stopActiveBuild()
    const controller = new AbortController()
    activeController.current = controller
    isBuilding.current = true
    options.onBuildStart?.()
    setState({ status: 'building' })

    try {
      const response = await indexService.buildIndex(
        { project_id: projectId },
        { signal: controller.signal },
      )
      if (activeController.current !== controller) {
        return
      }
      if (response.status === 'building') {
        schedulePoll(projectId, controller)
      } else {
        finishWithResponse(response, controller)
      }
    } catch (error) {
      finishWithError(error, controller)
    }
  }

  return {
    buildIndex,
    reset,
    state,
  }
}
