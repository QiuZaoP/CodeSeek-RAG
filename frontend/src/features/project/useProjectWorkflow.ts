import { useEffect, useRef, useState } from 'react'

import { projectService } from '@/services/serviceFactory'
import type { LoadProjectResponse } from '@/types/api'
import { AppError, isAppError } from '@/types/errors'

export type ProjectLoadStatus = 'idle' | 'loading' | 'success' | 'error'

interface UseProjectWorkflowOptions {
  onProjectChanging?: () => void
}

const INITIAL_PATH = 'D:/projects/demo-app'

export function useProjectWorkflow(options: UseProjectWorkflowOptions = {}) {
  const [projectPath, setProjectPath] = useState(INITIAL_PATH)
  const [project, setProject] = useState<LoadProjectResponse | null>(null)
  const [status, setStatus] = useState<ProjectLoadStatus>('idle')
  const [error, setError] = useState<AppError | null>(null)
  const requestController = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => requestController.current?.abort()
  }, [])

  function changeProjectPath(value: string) {
    setProjectPath(value)
    if (error?.code === 'PROJECT_PATH_REQUIRED') {
      setError(null)
      setStatus(project ? 'success' : 'idle')
    }
  }

  async function loadProject() {
    if (status === 'loading') {
      return
    }

    const normalizedPath = projectPath.trim()
    if (!normalizedPath) {
      setError(
        new AppError('请输入本地项目路径。', {
          code: 'PROJECT_PATH_REQUIRED',
          retryable: false,
        }),
      )
      setStatus('error')
      return
    }

    requestController.current?.abort()
    const controller = new AbortController()
    requestController.current = controller
    options.onProjectChanging?.()
    setProject(null)
    setError(null)
    setStatus('loading')

    try {
      const loadedProject = await projectService.loadProject(
        { project_path: normalizedPath },
        { signal: controller.signal },
      )
      if (requestController.current !== controller) {
        return
      }
      setProject(loadedProject)
      setProjectPath(loadedProject.project_path)
      setStatus('success')
    } catch (caughtError) {
      if (controller.signal.aborted || requestController.current !== controller) {
        return
      }
      setError(
        isAppError(caughtError)
          ? caughtError
          : new AppError('加载项目时发生未知错误，请重试。', {
              code: 'UNKNOWN_PROJECT_ERROR',
              retryable: true,
              cause: caughtError,
            }),
      )
      setStatus('error')
    } finally {
      if (requestController.current === controller) {
        requestController.current = null
      }
    }
  }

  return {
    error,
    loadProject,
    project,
    projectPath,
    setProjectPath: changeProjectPath,
    status,
  }
}
