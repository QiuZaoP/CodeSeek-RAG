import { useContext } from 'react'

import { WorkspaceSessionContext } from '@/features/workspace/workspaceSessionContext'

export function useWorkspaceSession() {
  const session = useContext(WorkspaceSessionContext)
  if (!session) {
    throw new Error('useWorkspaceSession must be used inside WorkspaceSessionProvider')
  }
  return session
}
