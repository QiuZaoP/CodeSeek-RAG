import { ChatWorkspace } from '@/features/chat/ChatWorkspace'
import { ProjectPanel } from '@/features/project/ProjectPanel'
import { useWorkspaceSession } from '@/features/workspace/useWorkspaceSession'
import '@/pages/workspace-page.css'

export function WorkspacePage() {
  const { chatWorkflow, indexWorkflow, projectWorkflow } = useWorkspaceSession()
  const isChatEnabled = indexWorkflow.state.status === 'completed'

  return (
    <div className="workspace-page">
      <ProjectPanel
        error={projectWorkflow.error}
        indexState={indexWorkflow.state}
        project={projectWorkflow.project}
        projectPath={projectWorkflow.projectPath}
        status={projectWorkflow.status}
        onPathChange={projectWorkflow.setProjectPath}
        onLoadProject={projectWorkflow.loadProject}
        onBuildIndex={() => {
          if (projectWorkflow.project) {
            void indexWorkflow.buildIndex(projectWorkflow.project.project_id)
          }
        }}
      />
      <ChatWorkspace
        isEnabled={isChatEnabled}
        questionInput={chatWorkflow.questionInput}
        state={chatWorkflow.state}
        onClearConversation={chatWorkflow.reset}
        onQuestionInputChange={chatWorkflow.setQuestionInput}
        onQuestionSubmit={() => {
          if (projectWorkflow.project) {
            void chatWorkflow.askQuestion(projectWorkflow.project.project_id)
          }
        }}
        onRetry={() => {
          if (projectWorkflow.project && chatWorkflow.state.pendingQuestion) {
            void chatWorkflow.askQuestion(
              projectWorkflow.project.project_id,
              chatWorkflow.state.pendingQuestion,
            )
          }
        }}
      />
    </div>
  )
}
