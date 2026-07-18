import { useId, useState } from 'react'

import { ChevronDownIcon, FileIcon } from '@/components/Icon/Icon'
import type { SourceCitation as SourceCitationData } from '@/types/api'
import '@/features/chat/source-citation.css'

interface SourceCitationProps {
  source: SourceCitationData
  defaultOpen?: boolean
}

export function SourceCitation({ defaultOpen = false, source }: SourceCitationProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const contentId = useId()
  const lines = source.content.split('\n')

  return (
    <div className={`source-citation ${isOpen ? 'source-citation--open' : ''}`}>
      <button
        className="source-citation__summary"
        type="button"
        aria-expanded={isOpen}
        aria-controls={contentId}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span className="source-citation__path">
          <FileIcon />
          <span>{source.file_path}</span>
        </span>
        <span className="source-citation__meta">
          <span>第 {source.start_line}–{source.end_line} 行</span>
          <ChevronDownIcon className="source-citation__chevron" />
        </span>
      </button>

      <div className="source-citation__content" id={contentId} hidden={!isOpen}>
        <pre aria-label={`${source.file_path} 第 ${source.start_line} 到 ${source.end_line} 行代码`}>
          <code>
            {lines.map((line, index) => (
              <span className="code-line" key={`${source.start_line + index}:${line}`}>
                <span className="code-line__number">{source.start_line + index}</span>
                <span>{line || ' '}</span>
              </span>
            ))}
          </code>
        </pre>
      </div>
    </div>
  )
}
