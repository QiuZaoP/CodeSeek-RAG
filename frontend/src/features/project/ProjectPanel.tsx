import { IndexStatus } from '@/features/index/IndexStatus'
import { ProjectPathForm } from '@/features/project/ProjectPathForm'
import { ProjectSummary } from '@/features/project/ProjectSummary'
import type { ProjectLoadStatus } from '@/features/project/useProjectWorkflow'
import type { LoadProjectResponse } from '@/types/api'
import type { AppError } from '@/types/errors'
import '@/features/project/project-panel.css'

interface ProjectPanelProps {
  error: AppError | null
  project: LoadProjectResponse | null
  projectPath: string
  status: ProjectLoadStatus
  onPathChange: (value: string) => void
  onLoadProject: () => void
}

export function ProjectPanel({
  error,
  onLoadProject,
  onPathChange,
  project,
  projectPath,
  status,
}: ProjectPanelProps) {
  const hasProject = project !== null

  return (
    <aside className="project-panel" aria-label="项目工作流">
      <ol className="workflow-steps">
        <li className={`workflow-step ${hasProject ? 'workflow-step--complete' : 'workflow-step--current'}`}>
          <div className="workflow-step__marker" aria-hidden="true">
            1
          </div>
          <div className="workflow-step__body">
            <h2>加载项目</h2>
            <ProjectPathForm
              error={error}
              status={status}
              value={projectPath}
              onChange={onPathChange}
              onSubmit={onLoadProject}
            />
            {project ? <ProjectSummary project={project} /> : null}
          </div>
        </li>

        <li className={`workflow-step ${hasProject ? 'workflow-step--current' : 'workflow-step--inactive'}`}>
          <div className="workflow-step__marker" aria-hidden="true">
            2
          </div>
          <div className="workflow-step__body">
            <h2>建立索引</h2>
            <IndexStatus hasProject={hasProject} />
          </div>
        </li>

        <li className="workflow-step workflow-step--inactive">
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
