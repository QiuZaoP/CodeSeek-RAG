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
```

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

## 当前阶段

P0 工程初始化已完成。正式工作台视觉、功能组件和 API 服务将在后续阶段实现。
