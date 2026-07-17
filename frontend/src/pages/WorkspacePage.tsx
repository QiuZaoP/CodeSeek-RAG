import { useState } from 'react'

import { ChatWorkspace } from '@/features/chat/ChatWorkspace'
import { ProjectPanel } from '@/features/project/ProjectPanel'
import { useProjectWorkflow } from '@/features/project/useProjectWorkflow'
import '@/pages/workspace-page.css'

export function WorkspacePage() {
  const [questionInput, setQuestionInput] = useState('')
  const [question, setQuestion] = useState<string | undefined>()
  const [answer, setAnswer] = useState<string | undefined>()
  const projectWorkflow = useProjectWorkflow({
    onProjectChanging: () => {
      setQuestionInput('')
      setQuestion(undefined)
      setAnswer(undefined)
    },
  })

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
        project={projectWorkflow.project}
        projectPath={projectWorkflow.projectPath}
        status={projectWorkflow.status}
        onPathChange={projectWorkflow.setProjectPath}
        onLoadProject={projectWorkflow.loadProject}
      />
      <ChatWorkspace
        answer={answer}
        question={question}
        questionInput={questionInput}
        isEnabled={false}
        showCitation={false}
        onQuestionInputChange={setQuestionInput}
        onQuestionSubmit={handleQuestionSubmit}
      />
    </div>
  )
}
