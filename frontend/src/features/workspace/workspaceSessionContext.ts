import { createContext } from 'react'

import type { useChatWorkflow } from '@/features/chat/useChatWorkflow'
import type { useIndexWorkflow } from '@/features/index/useIndexWorkflow'
import type { useProjectWorkflow } from '@/features/project/useProjectWorkflow'

export interface WorkspaceSession {
  chatWorkflow: ReturnType<typeof useChatWorkflow>
  indexWorkflow: ReturnType<typeof useIndexWorkflow>
  projectWorkflow: ReturnType<typeof useProjectWorkflow>
}

export const WorkspaceSessionContext = createContext<WorkspaceSession | null>(null)
