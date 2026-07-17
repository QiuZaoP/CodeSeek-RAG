import { useState } from 'react'

import { ChevronDownIcon, FileIcon } from '@/components/Icon/Icon'
import '@/features/chat/source-citation.css'

export function SourceCitation() {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <section className="source-section" aria-labelledby="source-heading">
      <h2 id="source-heading">引用来源</h2>
      <div className={`source-citation ${isOpen ? 'source-citation--open' : ''}`}>
        <button
          className="source-citation__summary"
          type="button"
          aria-expanded={isOpen}
          aria-controls="source-code"
          onClick={() => setIsOpen((current) => !current)}
        >
          <span className="source-citation__path">
            <FileIcon />
            <span>backend/main.py</span>
          </span>
          <span className="source-citation__meta">
            <span>第 1–24 行</span>
            <ChevronDownIcon className="source-citation__chevron" />
          </span>
        </button>

        <div className="source-citation__content" id="source-code" hidden={!isOpen}>
          <pre aria-label="backend/main.py 第 1 到 10 行代码">
            <code>
              <span className="code-line"><span className="code-line__number">1</span><span><b>from</b> fastapi <b>import</b> <em>FastAPI</em></span></span>
              <span className="code-line"><span className="code-line__number">2</span><span><b>from</b> fastapi.middleware.cors <b>import</b> CORSMiddleware</span></span>
              <span className="code-line"><span className="code-line__number">3</span><span> </span></span>
              <span className="code-line"><span className="code-line__number">4</span><span><b>from</b> backend.api <b>import</b> router</span></span>
              <span className="code-line"><span className="code-line__number">5</span><span> </span></span>
              <span className="code-line"><span className="code-line__number">6</span><span>app = <em>FastAPI</em>(</span></span>
              <span className="code-line"><span className="code-line__number">7</span><span>    title=<i>&quot;Demo App&quot;</i>,</span></span>
              <span className="code-line"><span className="code-line__number">8</span><span>    version=<i>&quot;1.0.0&quot;</i>,</span></span>
              <span className="code-line"><span className="code-line__number">9</span><span>)</span></span>
              <span className="code-line"><span className="code-line__number">10</span><span> </span></span>
            </code>
          </pre>
        </div>
      </div>
    </section>
  )
}
