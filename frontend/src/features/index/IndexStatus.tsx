import { Button } from '@/components/Button/Button'
import { ErrorNotice } from '@/components/ErrorNotice/ErrorNotice'
import { StatusMessage } from '@/components/StatusMessage/StatusMessage'
import type { IndexWorkflowState } from '@/features/index/useIndexWorkflow'

interface IndexStatusProps {
  hasProject: boolean
  state: IndexWorkflowState
  onBuild: () => void
}

function getCompletedMessage(state: IndexWorkflowState) {
  const details = []
  if (state.chunkCount !== undefined) {
    details.push(`${state.chunkCount} 个文本块`)
  }
  if (state.elapsedMs !== undefined) {
    details.push(`${(state.elapsedMs / 1_000).toFixed(1)} 秒`)
  }
  return details.length > 0 ? `索引已就绪 · ${details.join(' · ')}` : '索引已就绪'
}

export function IndexStatus({ hasProject, onBuild, state }: IndexStatusProps) {
  const isBuilding = state.status === 'building'

  return (
    <div className="index-status">
      {state.status === 'failed' ? (
        <ErrorNotice title="索引建立失败">{state.errorMessage}</ErrorNotice>
      ) : (
        <StatusMessage variant={state.status === 'completed' ? 'success' : 'neutral'}>
          {state.status === 'completed'
            ? getCompletedMessage(state)
            : isBuilding
              ? '正在建立索引并等待处理完成…'
              : hasProject
                ? '项目已就绪，等待建立索引'
                : '请先加载项目'}
        </StatusMessage>
      )}
      <Button
        className="index-status__action"
        type="button"
        variant="secondary"
        disabled={!hasProject}
        isLoading={isBuilding}
        onClick={onBuild}
      >
        {state.status === 'completed' ? '重新建立索引' : isBuilding ? '正在建立索引' : '建立索引'}
      </Button>
    </div>
  )
}
