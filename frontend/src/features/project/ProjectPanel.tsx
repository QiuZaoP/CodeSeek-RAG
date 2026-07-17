import type { FormEvent } from 'react'

import { Button } from '@/components/Button/Button'
import { CheckIcon, FolderIcon } from '@/components/Icon/Icon'
import { TextField } from '@/components/TextField/TextField'
import { IndexStatus } from '@/features/index/IndexStatus'
import '@/features/project/project-panel.css'

interface ProjectPanelProps {
  projectPath: string
  projectName: string
  fileCount: number
  isBuilding: boolean
  onPathChange: (value: string) => void
  onLoadProject: () => void
  onRebuildIndex: () => void
}

export function ProjectPanel({
  fileCount,
  isBuilding,
  onLoadProject,
  onPathChange,
  onRebuildIndex,
  projectName,
  projectPath,
}: ProjectPanelProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onLoadProject()
  }

  return (
    <aside className="project-panel" aria-label="项目工作流">
      <ol className="workflow-steps">
        <li className="workflow-step workflow-step--complete">
          <div className="workflow-step__marker" aria-hidden="true">
            1
          </div>
          <div className="workflow-step__body">
            <h2>加载项目</h2>
            <form className="project-form" onSubmit={handleSubmit}>
              <TextField
                label="本地项目路径"
                name="projectPath"
                value={projectPath}
                onChange={(event) => onPathChange(event.target.value)}
              />
              <Button type="submit" disabled={!projectPath.trim()}>
                加载项目
              </Button>
            </form>

            <section className="project-summary" aria-label="当前项目">
              <FolderIcon className="project-summary__icon" />
              <div>
                <h3>{projectName}</h3>
                <p>{fileCount} 个文件</p>
              </div>
            </section>
          </div>
        </li>

        <li className="workflow-step workflow-step--complete">
          <div className="workflow-step__marker workflow-step__marker--check" aria-label="已完成">
            <CheckIcon />
          </div>
          <div className="workflow-step__body">
            <h2>建立索引</h2>
            <IndexStatus isBuilding={isBuilding} onRebuild={onRebuildIndex} />
          </div>
        </li>

        <li className="workflow-step workflow-step--current" aria-current="step">
          <div className="workflow-step__marker" aria-hidden="true">
            3
          </div>
          <div className="workflow-step__body">
            <h2>开始问答</h2>
          </div>
        </li>
      </ol>
    </aside>
  )
}
