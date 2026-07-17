export interface RequestOptions {
  signal?: AbortSignal
}

export interface ProjectFileSummary {
  file_path: string
  file_type: string
  size: number
}

export interface LoadProjectRequest {
  project_path: string
}

export interface LoadProjectResponse {
  project_id: string
  project_path: string
  file_count: number
  files: ProjectFileSummary[]
}

export type IndexStatus = 'idle' | 'building' | 'completed' | 'failed'

export interface BuildIndexRequest {
  project_id: string
}

export interface IndexStatusResponse {
  project_id: string
  status: IndexStatus
  chunk_count?: number
  elapsed_ms?: number
  detail?: string
}

export interface AskQuestionRequest {
  project_id: string
  question: string
  top_k?: number
}

export interface SourceCitation {
  file_path: string
  start_line: number
  end_line: number
  content: string
}

export interface ChatResponse {
  answer: string
  sources: SourceCitation[]
}
