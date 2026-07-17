import { Button } from '@/components/Button/Button'
import { StatusMessage } from '@/components/StatusMessage/StatusMessage'

interface IndexStatusProps {
  hasProject: boolean
}

export function IndexStatus({ hasProject }: IndexStatusProps) {
  return (
    <div className="index-status">
      <StatusMessage>{hasProject ? '项目已就绪，等待建立索引' : '请先加载项目'}</StatusMessage>
      <Button
        className="index-status__action"
        type="button"
        variant="secondary"
        disabled
      >
        建立索引
      </Button>
    </div>
  )
}
