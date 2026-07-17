import { NavLink } from 'react-router-dom'

import '@/pages/content-page.css'

export function GuidePage() {
  return (
    <main className="content-page page-container">
      <header className="content-page__header">
        <h1>使用说明</h1>
        <p>按照三个步骤完成本地代码库问答。当前阶段展示界面外壳，服务接入后操作顺序保持不变。</p>
      </header>

      <ol className="guide-steps">
        <li>
          <span>1</span>
          <div>
            <h2>加载本地项目</h2>
            <p>输入后端能够访问的项目目录，加载完成后确认项目名称和文件数量。</p>
          </div>
        </li>
        <li>
          <span>2</span>
          <div>
            <h2>建立向量索引</h2>
            <p>等待索引状态变为就绪；项目内容变化后可以重新建立索引。</p>
          </div>
        </li>
        <li>
          <span>3</span>
          <div>
            <h2>提问并核对引用</h2>
            <p>发送代码问题，并通过文件路径、起止行号和代码片段核对回答依据。</p>
          </div>
        </li>
      </ol>

      <NavLink className="button button--primary content-page__action" to="/workspace">
        返回工作台
      </NavLink>
    </main>
  )
}
