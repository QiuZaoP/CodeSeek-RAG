import type {
  ChatResponse,
  IndexStatus,
  IndexStatusResponse,
  LoadProjectResponse,
  ProjectFileSummary,
  SourceCitation,
} from '@/types/api'
import { AppError } from '@/types/errors'

type JsonRecord = Record<string, unknown>

const INDEX_STATUSES = new Set<IndexStatus>(['idle', 'building', 'completed', 'failed'])

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 1
}

function isOptionalNonNegativeInteger(value: unknown) {
  return value === undefined || isNonNegativeInteger(value)
}

function isOptionalString(value: unknown) {
  return value === undefined || typeof value === 'string'
}

function invalidResponse(domain: '项目' | '索引' | '问答', code: string): never {
  throw new AppError(`${domain}服务返回的数据格式不符合接口约定。`, {
    code,
    retryable: true,
  })
}

function isProjectFile(value: unknown): value is ProjectFileSummary {
  return (
    isRecord(value) &&
    isNonEmptyString(value.file_path) &&
    typeof value.file_type === 'string' &&
    isNonNegativeInteger(value.size)
  )
}

function isSourceCitation(value: unknown): value is SourceCitation {
  return (
    isRecord(value) &&
    isNonEmptyString(value.file_path) &&
    isPositiveInteger(value.start_line) &&
    isPositiveInteger(value.end_line) &&
    value.end_line >= value.start_line &&
    typeof value.content === 'string'
  )
}

export function validateLoadProjectResponse(payload: unknown): LoadProjectResponse {
  if (
    !isRecord(payload) ||
    !isNonEmptyString(payload.project_id) ||
    !isNonEmptyString(payload.project_path) ||
    !isNonNegativeInteger(payload.file_count) ||
    !Array.isArray(payload.files) ||
    !payload.files.every(isProjectFile)
  ) {
    return invalidResponse('项目', 'INVALID_PROJECT_RESPONSE')
  }

  return payload as unknown as LoadProjectResponse
}

export function validateIndexStatusResponse(payload: unknown): IndexStatusResponse {
  if (
    !isRecord(payload) ||
    !isNonEmptyString(payload.project_id) ||
    typeof payload.status !== 'string' ||
    !INDEX_STATUSES.has(payload.status as IndexStatus) ||
    !isOptionalNonNegativeInteger(payload.chunk_count) ||
    !isOptionalNonNegativeInteger(payload.elapsed_ms) ||
    !isOptionalString(payload.detail)
  ) {
    return invalidResponse('索引', 'INVALID_INDEX_RESPONSE')
  }

  return payload as unknown as IndexStatusResponse
}

export function validateChatResponse(payload: unknown): ChatResponse {
  if (
    !isRecord(payload) ||
    typeof payload.answer !== 'string' ||
    !Array.isArray(payload.sources) ||
    !payload.sources.every(isSourceCitation)
  ) {
    return invalidResponse('问答', 'INVALID_CHAT_RESPONSE')
  }

  return payload as unknown as ChatResponse
}
