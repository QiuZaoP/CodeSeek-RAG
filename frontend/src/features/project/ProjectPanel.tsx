import { CheckIcon } from '@/components/Icon/Icon'
import { IndexStatus } from '@/features/index/IndexStatus'
import type { IndexWorkflowState } from '@/features/index/useIndexWorkflow'
import { ProjectPathForm } from '@/features/project/ProjectPathForm'
import { ProjectSummary } from '@/features/project/ProjectSummary'
import type { ProjectLoadStatus } from '@/features/project/useProjectWorkflow'
import type { LoadProjectResponse } from '@/types/api'
import type { AppError } from '@/types/errors'
import '@/features/project/project-panel.css'

interface ProjectPanelProps {
  error: AppError | null
  indexState: IndexWorkflowState
  project: LoadProjectResponse | null
  projectPath: string
  status: ProjectLoadStatus
  onPathChange: (value: string) => void
  onLoadProject: () => void
  onBuildIndex: () => void
}

export function ProjectPanel({
  error,
  indexState,
  onBuildIndex,
  onLoadProject,
  onPathChange,
  project,
  projectPath,
  status,
}: ProjectPanelProps) {
  const hasProject = project !== null
  const hasIndex = indexState.status === 'completed'

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

        <li className={`workflow-step ${hasIndex ? 'workflow-step--complete' : hasProject ? 'workflow-step--current' : 'workflow-step--inactive'}`}>
          <div className={`workflow-step__marker ${hasIndex ? 'workflow-step__marker--check' : ''}`} aria-label={hasIndex ? '已完成' : undefined} aria-hidden={hasIndex ? undefined : true}>
            {hasIndex ? <CheckIcon /> : 2}
          </div>
          <div className="workflow-step__body">
            <h2>建立索引</h2>
            <IndexStatus hasProject={hasProject} state={indexState} onBuild={onBuildIndex} />
          </div>
        </li>

        <li className={`workflow-step ${hasIndex ? 'workflow-step--current' : 'workflow-step--inactive'}`} aria-current={hasIndex ? 'step' : undefined}>
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
