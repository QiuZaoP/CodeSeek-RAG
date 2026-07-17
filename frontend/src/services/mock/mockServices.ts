import type { ServiceBundle } from '@/services/contracts'
import type {
  ChatResponse,
  IndexStatusResponse,
  LoadProjectResponse,
  ProjectFileSummary,
} from '@/types/api'
import { AppError } from '@/types/errors'
import { waitForMockDelay } from '@/services/mock/delay'

export type MockProjectScenario = 'success' | 'not-found' | 'forbidden' | 'error'
export type MockIndexScenario = 'building' | 'completed' | 'failed'
export type MockChatScenario = 'with-sources' | 'without-sources' | 'error'

export interface MockServiceOptions {
  delayMs?: number
  projectScenario?: MockProjectScenario
  indexScenario?: MockIndexScenario
  chatScenario?: MockChatScenario
  pollsBeforeIndexCompletion?: number
}

const MOCK_FILES: ProjectFileSummary[] = [
  { file_path: 'README.md', file_type: '.md', size: 601 },
  { file_path: 'requirements.txt', file_type: '.txt', size: 102 },
  { file_path: 'backend/main.py', file_type: '.py', size: 784 },
  { file_path: 'backend/api/project_api.py', file_type: '.py', size: 2_410 },
  { file_path: 'backend/api/index_api.py', file_type: '.py', size: 2_086 },
  { file_path: 'backend/api/chat_api.py', file_type: '.py', size: 2_302 },
  { file_path: 'backend/repository/scanner.py', file_type: '.py', size: 4_212 },
  { file_path: 'backend/parser/chunker.py', file_type: '.py', size: 3_918 },
  { file_path: 'backend/indexer/vector_store.py', file_type: '.py', size: 5_104 },
  { file_path: 'backend/qa/service.py', file_type: '.py', size: 4_908 },
  { file_path: 'backend/config/settings.py', file_type: '.py', size: 1_406 },
  { file_path: 'backend/models/chunk.py', file_type: '.py', size: 1_122 },
  { file_path: 'tests/test_repository.py', file_type: '.py', size: 2_998 },
  { file_path: 'tests/test_parser.py', file_type: '.py', size: 3_126 },
  { file_path: 'tests/test_indexer.py', file_type: '.py', size: 2_744 },
  { file_path: 'tests/test_qa.py', file_type: '.py', size: 3_208 },
  { file_path: '.env.example', file_type: '.example', size: 109 },
  { file_path: '.gitignore', file_type: '.gitignore', size: 204 },
]

const MOCK_CHAT_RESPONSE: ChatResponse = {
  answer: '项目的后端启动入口位于 backend/main.py。该文件创建 FastAPI 应用并注册 API 路由。',
  sources: [
    {
      file_path: 'backend/main.py',
      start_line: 1,
      end_line: 10,
      content:
        'from fastapi import FastAPI\nfrom backend.api import router\n\napp = FastAPI(\n    title="CodeSeek RAG",\n    version="1.0.0",\n)\n\napp.include_router(router)',
    },
  ],
}

function getProjectName(projectPath: string) {
  const segments = projectPath.replaceAll('\\', '/').split('/').filter(Boolean)
  return segments.at(-1) ?? 'demo-app'
}

function getProjectId(projectPath: string) {
  const projectName = getProjectName(projectPath)
  const normalized = projectName
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return normalized || 'demo-app'
}

function createProjectError(scenario: Exclude<MockProjectScenario, 'success'>) {
  if (scenario === 'not-found') {
    return new AppError('项目路径不存在，请检查后重试。', {
      status: 404,
      code: 'PROJECT_NOT_FOUND',
      retryable: false,
    })
  }
  if (scenario === 'forbidden') {
    return new AppError('没有权限读取该项目路径。', {
      status: 403,
      code: 'PROJECT_FORBIDDEN',
      retryable: false,
    })
  }
  return new AppError('项目服务暂时不可用，请稍后重试。', {
    status: 500,
    code: 'PROJECT_SERVICE_ERROR',
    retryable: true,
  })
}

function getProjectScenario(projectPath: string, configuredScenario?: MockProjectScenario) {
  if (configuredScenario) {
    return configuredScenario
  }
  if (projectPath === 'mock://missing-project') {
    return 'not-found'
  }
  if (projectPath === 'mock://forbidden-project') {
    return 'forbidden'
  }
  if (projectPath === 'mock://service-error') {
    return 'error'
  }
  return 'success'
}

function getIndexScenario(projectId: string, configuredScenario?: MockIndexScenario) {
  if (configuredScenario) {
    return configuredScenario
  }
  if (projectId === 'mock-index-complete') {
    return 'completed'
  }
  if (projectId === 'mock-index-failure') {
    return 'failed'
  }
  return 'building'
}

export function createMockServices(options: MockServiceOptions = {}): ServiceBundle {
  const delayMs = options.delayMs ?? 450
  const pollsBeforeCompletion = Math.max(1, options.pollsBeforeIndexCompletion ?? 2)
  const indexPollCounts = new Map<string, number>()
  const terminalIndexStates = new Map<string, IndexStatusResponse>()

  return {
    projectService: {
      async loadProject(request, requestOptions): Promise<LoadProjectResponse> {
        await waitForMockDelay(delayMs, requestOptions?.signal)
        const projectPath = request.project_path.trim()
        if (!projectPath) {
          throw new AppError('请输入本地项目路径。', {
            status: 400,
            code: 'PROJECT_PATH_REQUIRED',
            retryable: false,
          })
        }
        const scenario = getProjectScenario(projectPath, options.projectScenario)
        if (scenario !== 'success') {
          throw createProjectError(scenario)
        }

        return {
          project_id: getProjectId(projectPath),
          project_path: projectPath,
          file_count: MOCK_FILES.length,
          files: MOCK_FILES.map((file) => ({ ...file })),
        }
      },
    },
    indexService: {
      async buildIndex(request, requestOptions): Promise<IndexStatusResponse> {
        await waitForMockDelay(delayMs, requestOptions?.signal)
        const scenario = getIndexScenario(request.project_id, options.indexScenario)
        if (scenario === 'failed') {
          const response: IndexStatusResponse = {
            project_id: request.project_id,
            status: 'failed',
            detail: 'Mock 索引构建失败，请重新建立索引。',
          }
          terminalIndexStates.set(request.project_id, response)
          return response
        }
        if (scenario === 'completed') {
          const response: IndexStatusResponse = {
            project_id: request.project_id,
            status: 'completed',
            chunk_count: 42,
            elapsed_ms: 860,
          }
          terminalIndexStates.set(request.project_id, response)
          return response
        }

        terminalIndexStates.delete(request.project_id)
        indexPollCounts.set(request.project_id, 0)
        return {
          project_id: request.project_id,
          status: 'building',
        }
      },
      async getIndexStatus(projectId, requestOptions): Promise<IndexStatusResponse> {
        await waitForMockDelay(delayMs, requestOptions?.signal)
        const terminalState = terminalIndexStates.get(projectId)
        if (terminalState) {
          return { ...terminalState }
        }

        const currentPollCount = indexPollCounts.get(projectId)
        if (currentPollCount === undefined) {
          return {
            project_id: projectId,
            status: 'idle',
          }
        }

        const nextPollCount = currentPollCount + 1
        indexPollCounts.set(projectId, nextPollCount)
        if (nextPollCount < pollsBeforeCompletion) {
          return {
            project_id: projectId,
            status: 'building',
          }
        }

        const response: IndexStatusResponse = {
          project_id: projectId,
          status: 'completed',
          chunk_count: 42,
          elapsed_ms: 860,
        }
        indexPollCounts.delete(projectId)
        terminalIndexStates.set(projectId, response)
        return response
      },
    },
    chatService: {
      async askQuestion(_request, requestOptions): Promise<ChatResponse> {
        await waitForMockDelay(delayMs, requestOptions?.signal)
        const scenario = options.chatScenario ?? 'with-sources'
        if (scenario === 'error') {
          throw new AppError('问答服务暂时不可用，请稍后重试。', {
            status: 500,
            code: 'CHAT_SERVICE_ERROR',
            retryable: true,
          })
        }
        if (scenario === 'without-sources') {
          return {
            answer: '未在当前代码库中找到足够依据，无法可靠回答这个问题。',
            sources: [],
          }
        }

        return {
          answer: MOCK_CHAT_RESPONSE.answer,
          sources: MOCK_CHAT_RESPONSE.sources.map((source) => ({ ...source })),
        }
      },
    },
  }
}
