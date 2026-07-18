import { ChatWorkspace } from '@/features/chat/ChatWorkspace'
import { useChatWorkflow } from '@/features/chat/useChatWorkflow'
import { useIndexWorkflow } from '@/features/index/useIndexWorkflow'
import { ProjectPanel } from '@/features/project/ProjectPanel'
import { useProjectWorkflow } from '@/features/project/useProjectWorkflow'
import '@/pages/workspace-page.css'

export function WorkspacePage() {
  const chatWorkflow = useChatWorkflow()
  const indexWorkflow = useIndexWorkflow({ onBuildStart: chatWorkflow.reset })
  const projectWorkflow = useProjectWorkflow({
    onProjectChanging: () => {
      indexWorkflow.reset()
      chatWorkflow.reset()
    },
  })
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
        onQuestionInputChange={chatWorkflow.setQuestionInput}
        onQuestionSubmit={() => {
          if (projectWorkflow.project) {
            void chatWorkflow.askQuestion(projectWorkflow.project.project_id)
          }
        }}
        onRetry={() => {
          if (projectWorkflow.project && chatWorkflow.state.question) {
            void chatWorkflow.askQuestion(
              projectWorkflow.project.project_id,
              chatWorkflow.state.question,
            )
          }
        }}
      />
    </div>
  )
}
