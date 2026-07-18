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

真实模式还需要在项目根目录启动后端：

```bash
pip install -r requirements.txt
uvicorn backend.main:app --reload
```

后端需允许当前前端开发地址通过 CORS 访问。

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

真实模式依赖以下接口：

```text
POST /api/projects/load
POST /api/index/build
GET  /api/index/status?project_id=<project_id>
POST /api/chat
```

项目、索引和问答响应会在服务层执行运行时契约校验。字段缺失、状态值非法或引用行号
无效时，页面会显示“数据格式不符合接口约定”，避免未经校验的数据进入组件。后端应
允许实际前端地址通过 CORS，并允许 `Content-Type` 请求头与 `GET`、`POST`、
`OPTIONS` 方法。

## 操作流程

1. 输入项目路径并加载，确认项目 ID 与文件数量。
2. 建立索引，等待状态变为“索引已就绪”。
3. 输入问题，查看回答并核对来源文件、1-based 行号和代码片段。

Mock 模式可使用以下内容验证异常状态：

- 项目路径：`mock://missing-project`、`mock://mock-index-failure`、`mock://mock-index-complete`
- 问题：`模拟无引用回答`、`模拟问答失败`、`模拟问答超时`

浏览器中的 `/guide` 页面包含完整启动方式、运行模式和常见问题说明。

## 当前阶段

P0–P6 已完成：工程、应用外壳、类型化 API/Mock、项目加载、索引构建、问答引用、
使用说明和响应式质量基线均已落地。真实 FastAPI 字段与 CORS 仍需在联调阶段确认。
