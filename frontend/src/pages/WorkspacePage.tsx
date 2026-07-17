import { useState } from 'react'

import { ChatWorkspace } from '@/features/chat/ChatWorkspace'
import { useIndexWorkflow } from '@/features/index/useIndexWorkflow'
import { ProjectPanel } from '@/features/project/ProjectPanel'
import { useProjectWorkflow } from '@/features/project/useProjectWorkflow'
import '@/pages/workspace-page.css'

export function WorkspacePage() {
  const [questionInput, setQuestionInput] = useState('')
  const [question, setQuestion] = useState<string | undefined>()
  const [answer, setAnswer] = useState<string | undefined>()
  function clearConversation() {
    setQuestionInput('')
    setQuestion(undefined)
    setAnswer(undefined)
  }

  const indexWorkflow = useIndexWorkflow({ onBuildStart: clearConversation })
  const projectWorkflow = useProjectWorkflow({
    onProjectChanging: () => {
      indexWorkflow.reset()
      clearConversation()
    },
  })
  const isChatEnabled = indexWorkflow.state.status === 'completed'

  function handleQuestionSubmit() {
    const normalizedQuestion = questionInput.trim()
    if (!normalizedQuestion) {
      return
    }

    setQuestion(normalizedQuestion)
    setAnswer('问题已记录。检索与大模型服务将在后续阶段接入。')
    setQuestionInput('')
  }

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
        answer={answer}
        question={question}
        questionInput={questionInput}
        isEnabled={isChatEnabled}
        showCitation={false}
        onQuestionInputChange={setQuestionInput}
        onQuestionSubmit={handleQuestionSubmit}
      />
    </div>
  )
}
