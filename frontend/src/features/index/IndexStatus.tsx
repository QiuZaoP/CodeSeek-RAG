import { Button } from '@/components/Button/Button'
import { StatusMessage } from '@/components/StatusMessage/StatusMessage'

interface IndexStatusProps {
  isBuilding: boolean
  onRebuild: () => void
}

export function IndexStatus({ isBuilding, onRebuild }: IndexStatusProps) {
  return (
    <div className="index-status">
      <StatusMessage variant={isBuilding ? 'neutral' : 'success'}>
        {isBuilding ? '正在建立索引…' : '索引已就绪'}
      </StatusMessage>
      <Button
        className="index-status__action"
        type="button"
        variant="secondary"
        isLoading={isBuilding}
        onClick={onRebuild}
      >
        重新建立索引
      </Button>
    </div>
  )
}
