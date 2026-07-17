import type { FormEvent } from 'react'

import { Button } from '@/components/Button/Button'
import { ErrorNotice } from '@/components/ErrorNotice/ErrorNotice'
import { TextField } from '@/components/TextField/TextField'
import type { ProjectLoadStatus } from '@/features/project/useProjectWorkflow'
import type { AppError } from '@/types/errors'

interface ProjectPathFormProps {
  error: AppError | null
  status: ProjectLoadStatus
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
}

export function ProjectPathForm({
  error,
  onChange,
  onSubmit,
  status,
  value,
}: ProjectPathFormProps) {
  const isLoading = status === 'loading'

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit()
  }

  return (
    <div className="project-form-stack">
      <form className="project-form" onSubmit={handleSubmit} aria-busy={isLoading}>
        <TextField
          label="本地项目路径"
          name="projectPath"
          value={value}
          error={error?.code === 'PROJECT_PATH_REQUIRED' ? error.message : undefined}
          disabled={isLoading}
          onChange={(event) => onChange(event.target.value)}
        />
        <Button type="submit" disabled={!value.trim()} isLoading={isLoading}>
          {isLoading ? '正在加载' : '加载项目'}
        </Button>
      </form>

      {error && error.code !== 'PROJECT_PATH_REQUIRED' ? (
        <ErrorNotice
          title="项目加载失败"
          action={
            <Button type="button" variant="secondary" onClick={onSubmit}>
              重试加载
            </Button>
          }
        >
          {error.message}
        </ErrorNotice>
      ) : null}
    </div>
  )
}
