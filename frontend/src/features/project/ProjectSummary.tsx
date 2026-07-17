import { FolderIcon } from '@/components/Icon/Icon'
import type { LoadProjectResponse } from '@/types/api'

interface ProjectSummaryProps {
  project: LoadProjectResponse
}

const VISIBLE_FILE_LIMIT = 5

export function ProjectSummary({ project }: ProjectSummaryProps) {
  const visibleFiles = project.files.slice(0, VISIBLE_FILE_LIMIT)

  return (
    <section className="project-summary" aria-label="当前项目">
      <FolderIcon className="project-summary__icon" />
      <div className="project-summary__body">
        <h3>{project.project_id}</h3>
        <p>{project.file_count} 个文件</p>
        {visibleFiles.length > 0 ? (
          <details className="project-summary__files">
            <summary>查看文件摘要</summary>
            <ul>
              {visibleFiles.map((file) => (
                <li key={file.file_path}>
                  <span>{file.file_path}</span>
                  <small>{file.file_type}</small>
                </li>
              ))}
            </ul>
            {project.files.length > VISIBLE_FILE_LIMIT ? (
              <p>另有 {project.files.length - VISIBLE_FILE_LIMIT} 个文件未展开</p>
            ) : null}
          </details>
        ) : null}
      </div>
    </section>
  )
}
