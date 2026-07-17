import '@/components/LoadingIndicator/loading-indicator.css'

interface LoadingIndicatorProps {
  label?: string
}

export function LoadingIndicator({ label = '正在加载…' }: LoadingIndicatorProps) {
  return <span className="loading-indicator" role="status" aria-label={label} />
}
