# CodeSeek-RAG 前端

CodeSeek-RAG 的 React 前端工程。当前工程使用 Vite、TypeScript 和 React Router。

## 环境要求

- Node.js `^20.19.0 || >=22.12.0`
- npm 11 或与所用 Node.js 版本匹配的 npm

## 本地启动

```bash
npm install
npm run dev
```

## 环境变量

复制 `.env.example` 为 `.env.local`，按需调整：

```text
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_USE_MOCK_API=true
VITE_REQUEST_TIMEOUT_MS=15000
VITE_MOCK_DELAY_MS=450
```

`VITE_USE_MOCK_API=true` 时使用与真实接口同契约的运行时 Mock；关闭后请求
`VITE_API_BASE_URL` 指向的 FastAPI。`VITE_MOCK_DELAY_MS` 用于保留可观察的加载状态。

模型和 Embedding 密钥只应配置在后端，不得写入前端环境变量。

## 质量命令

```bash
npm run typecheck
npm run lint
npm run build
npm run check
npm run preview
```

`npm run check` 会依次执行类型检查、静态检查和生产构建。

## API 服务边界

页面和功能模块应从 `src/services/serviceFactory.ts` 使用 `projectService`、
`indexService` 和 `chatService`，不得直接调用 `fetch`。服务层统一处理 JSON、超时、
主动取消和后端错误，并通过环境变量在真实 API 与 Mock 间切换。

## 当前阶段

P0 工程初始化、P1 应用外壳和 P2 类型化 API/Mock 服务基线已完成。完整项目加载、
索引构建和问答状态流将在后续阶段接入页面。
