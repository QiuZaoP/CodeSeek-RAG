import { useEffect, useRef, useState } from 'react'

import { ChatWorkspace } from '@/features/chat/ChatWorkspace'
import { ProjectPanel } from '@/features/project/ProjectPanel'
import '@/pages/workspace-page.css'

const INITIAL_PATH = 'D:/projects/demo-app'
const INITIAL_QUESTION = '这个项目的启动入口在哪里？'
const INITIAL_ANSWER =
  '项目的后端启动入口位于 backend/main.py。该文件创建 FastAPI 应用并注册 API 路由。'

function getProjectName(path: string) {
  const segments = path.replaceAll('\\', '/').split('/').filter(Boolean)
  return segments.at(-1) ?? 'demo-app'
}

export function WorkspacePage() {
  const [projectPath, setProjectPath] = useState(INITIAL_PATH)
  const [loadedProjectPath, setLoadedProjectPath] = useState(INITIAL_PATH)
  const [isBuilding, setIsBuilding] = useState(false)
  const [questionInput, setQuestionInput] = useState('')
  const [question, setQuestion] = useState(INITIAL_QUESTION)
  const [answer, setAnswer] = useState(INITIAL_ANSWER)
  const [showCitation, setShowCitation] = useState(true)
  const rebuildTimer = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (rebuildTimer.current !== null) {
        window.clearTimeout(rebuildTimer.current)
      }
    }
  }, [])

  function handleLoadProject() {
    const normalizedPath = projectPath.trim()
    if (normalizedPath) {
      setLoadedProjectPath(normalizedPath)
    }
  }

  function handleRebuildIndex() {
    if (isBuilding) {
      return
    }

    setIsBuilding(true)
    rebuildTimer.current = window.setTimeout(() => {
      setIsBuilding(false)
      rebuildTimer.current = null
    }, 900)
  }

  function handleQuestionSubmit() {
    const normalizedQuestion = questionInput.trim()
    if (!normalizedQuestion) {
      return
    }

    setQuestion(normalizedQuestion)
    setAnswer('问题已记录。检索与大模型服务将在后续阶段接入。')
    setShowCitation(false)
    setQuestionInput('')
  }

  return (
    <div className="workspace-page">
      <ProjectPanel
        projectPath={projectPath}
        projectName={getProjectName(loadedProjectPath)}
        fileCount={18}
        isBuilding={isBuilding}
        onPathChange={setProjectPath}
        onLoadProject={handleLoadProject}
        onRebuildIndex={handleRebuildIndex}
      />
      <ChatWorkspace
        answer={answer}
        question={question}
        questionInput={questionInput}
        showCitation={showCitation}
        onQuestionInputChange={setQuestionInput}
        onQuestionSubmit={handleQuestionSubmit}
      />
    </div>
  )
}
