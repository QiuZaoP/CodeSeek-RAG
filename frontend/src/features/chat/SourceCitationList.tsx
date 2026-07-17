import { SourceCitation } from '@/features/chat/SourceCitation'
import type { SourceCitation as SourceCitationData } from '@/types/api'

interface SourceCitationListProps {
  sources: SourceCitationData[]
}

export function SourceCitationList({ sources }: SourceCitationListProps) {
  return (
    <section className="source-section" aria-labelledby="source-heading">
      <h2 id="source-heading">引用来源</h2>
      <div className="source-list">
        {sources.map((source, index) => (
          <SourceCitation
            key={`${source.file_path}:${source.start_line}:${source.end_line}`}
            source={source}
            defaultOpen={index === 0}
          />
        ))}
      </div>
    </section>
  )
}
