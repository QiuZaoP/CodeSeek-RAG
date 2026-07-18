import type {
  AskQuestionRequest,
  BuildIndexRequest,
  ChatResponse,
  IndexStatusResponse,
  LoadProjectRequest,
  LoadProjectResponse,
  RequestOptions,
} from '@/types/api'

export interface ProjectService {
  loadProject(
    request: LoadProjectRequest,
    options?: RequestOptions,
  ): Promise<LoadProjectResponse>
}

export interface IndexService {
  buildIndex(
    request: BuildIndexRequest,
    options?: RequestOptions,
  ): Promise<IndexStatusResponse>
  getIndexStatus(projectId: string, options?: RequestOptions): Promise<IndexStatusResponse>
}

export interface ChatService {
  askQuestion(request: AskQuestionRequest, options?: RequestOptions): Promise<ChatResponse>
}

export interface ServiceBundle {
  projectService: ProjectService
  indexService: IndexService
  chatService: ChatService
}
