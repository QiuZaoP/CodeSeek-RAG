import type { ReactNode } from 'react'

import { useChatWorkflow } from '@/features/chat/useChatWorkflow'
import { useIndexWorkflow } from '@/features/index/useIndexWorkflow'
import { useProjectWorkflow } from '@/features/project/useProjectWorkflow'
import { WorkspaceSessionContext } from '@/features/workspace/workspaceSessionContext'

function useWorkspaceSessionState() {
  const chatWorkflow = useChatWorkflow()
  const indexWorkflow = useIndexWorkflow({ onBuildStart: chatWorkflow.reset })
  const projectWorkflow = useProjectWorkflow({
    onProjectChanging: () => {
      indexWorkflow.reset()
      chatWorkflow.reset()
    },
  })

  return {
    chatWorkflow,
    indexWorkflow,
    projectWorkflow,
  }
}

export function WorkspaceSessionProvider({ children }: { children: ReactNode }) {
  const session = useWorkspaceSessionState()

  return (
    <WorkspaceSessionContext.Provider value={session}>
      {children}
    </WorkspaceSessionContext.Provider>
  )
}
