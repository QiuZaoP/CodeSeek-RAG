import { NavLink } from 'react-router-dom'

import '@/pages/content-page.css'

const MOCK_SCENARIOS = [
  ['mock://missing-project', '项目路径不存在'],
  ['mock://mock-index-complete', '索引同步完成，适合快速演示'],
  ['mock://mock-index-failure', '索引建立失败'],
  ['模拟无引用回答', '回答没有来源引用'],
  ['模拟问答失败', '问答服务返回错误'],
  ['模拟问答超时', '问答请求超时'],
]

export function GuidePage() {
  return (
    <main className="content-page page-container" id="main-content" tabIndex={-1}>
      <header className="content-page__header">
        <p className="content-page__eyebrow">CodeSeek-RAG 操作指南</p>
        <h1>使用说明</h1>
        <p>前端支持 Mock 独立演示，也可以通过环境变量切换到 FastAPI。操作始终遵循加载项目、建立索引、提问并核对引用三个步骤。</p>
      </header>

      <section className="guide-section" aria-labelledby="workflow-guide-title">
        <h2 id="workflow-guide-title">完整操作流程</h2>
        <ol className="guide-steps">
          <li>
            <span>1</span>
            <div>
              <h3>加载本地项目</h3>
              <p>输入后端能够访问的项目目录。加载完成后确认项目 ID、文件数量和可选文件摘要。</p>
            </div>
          </li>
          <li>
            <span>2</span>
            <div>
              <h3>建立向量索引</h3>
              <p>等待状态变为“索引已就绪”。项目内容变化后可以重新建立，旧问答会被安全清除。</p>
            </div>
          </li>
          <li>
            <span>3</span>
            <div>
              <h3>提问并核对引用</h3>
              <p>发送代码问题，通过来源文件、1-based 行号和代码片段核对回答依据；无来源时页面会明确提示。</p>
            </div>
          </li>
        </ol>
      </section>

      <section className="guide-section" aria-labelledby="run-mode-title">
        <h2 id="run-mode-title">启动与运行模式</h2>
        <div className="guide-card-grid">
          <article className="guide-card">
            <h3>前端启动</h3>
            <pre><code>npm install{`\n`}npm run dev</code></pre>
            <p>在 <code>frontend/</code> 目录执行，默认读取 <code>.env.local</code>。</p>
          </article>
          <article className="guide-card">
            <h3>Mock 模式</h3>
            <pre><code>VITE_USE_MOCK_API=true</code></pre>
            <p>无需后端或 API Key，适合独立开发、验收和演示。</p>
          </article>
          <article className="guide-card">
            <h3>真实后端模式</h3>
            <pre><code>VITE_USE_MOCK_API=false{`\n`}VITE_API_BASE_URL=http://127.0.0.1:8000</code></pre>
            <p>需要先启动 FastAPI，并允许前端开发地址通过 CORS 访问。</p>
          </article>
        </div>
      </section>

      <section className="guide-section" aria-labelledby="mock-scenario-title">
        <h2 id="mock-scenario-title">Mock 演示场景</h2>
        <p>路径类内容填入项目路径，问题类内容在索引完成后填入问题输入框。</p>
        <dl className="scenario-list">
          {MOCK_SCENARIOS.map(([input, result]) => (
            <div key={input}>
              <dt><code>{input}</code></dt>
              <dd>{result}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="guide-section" aria-labelledby="troubleshooting-title">
        <h2 id="troubleshooting-title">常见问题</h2>
        <div className="troubleshooting-list">
          <article>
            <h3>路径无法加载</h3>
            <p>确认路径存在，并且是后端进程能够读取的路径；浏览器本身不会直接扫描本地磁盘。</p>
          </article>
          <article>
            <h3>请求超时或服务不可用</h3>
            <p>保留当前输入后重试；真实模式下检查 FastAPI 地址、进程状态和 CORS 配置。</p>
          </article>
          <article>
            <h3>回答没有引用</h3>
            <p>这表示当前检索上下文不足。请调整问题或重建索引，不要把无来源回答当作已核实结论。</p>
          </article>
        </div>
      </section>

      <NavLink className="button button--primary content-page__action" to="/workspace">
        返回工作台
      </NavLink>
    </main>
  )
}
