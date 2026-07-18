# CodeSeek-RAG 前后端接口与联调指南

## 1. 文档目的

本文档面向后端开发者、前端开发者和分支合并负责人，说明当前前端实际使用的 HTTP
接口、字段约束、状态流、错误处理和联调步骤。

本文档以当前 `feature/frontend` 实现为准。关键源码位置：

- `frontend/src/types/api.ts`：公共请求、响应和领域类型。
- `frontend/src/services/httpClient.ts`：HTTP、JSON、超时、取消和错误转换。
- `frontend/src/services/projectService.ts`：项目加载接口。
- `frontend/src/services/indexService.ts`：索引构建和状态查询接口。
- `frontend/src/services/chatService.ts`：代码问答接口。
- `frontend/src/services/responseValidators.ts`：真实响应的运行时契约校验。
- `frontend/src/services/serviceFactory.ts`：Mock 与真实 API 切换入口。

当前仓库的 `backend/` 仍只有公共目录占位文件。前端已经通过本地 HTTP 契约服务器完成
四个接口、CORS、异步轮询和错误场景验证，但团队真实 FastAPI 合并后仍需重新联调。

## 2. 总体调用流程

```text
输入项目路径
  -> POST /api/projects/load
  -> 获得 project_id
  -> POST /api/index/build
  -> completed：直接进入问答
  -> building：GET /api/index/status 轮询到 completed 或 failed
  -> POST /api/chat
  -> 展示 answer 与 sources
```

前端页面不会直接调用 `fetch`。所有请求都经过领域服务和响应校验器，因此后端字段差异
应优先在 `frontend/src/types/` 与 `frontend/src/services/` 中适配，不应让页面组件判断
不同后端响应格式。

## 3. 运行配置

前端通过 `frontend/.env.local` 选择数据源：

```text
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_USE_MOCK_API=false
VITE_REQUEST_TIMEOUT_MS=15000
VITE_MOCK_DELAY_MS=450
```

配置含义：

| 变量 | 默认值 | 说明 |
|---|---|---|
| `VITE_API_BASE_URL` | `http://127.0.0.1:8000` | FastAPI 基地址，末尾斜杠会被移除 |
| `VITE_USE_MOCK_API` | `true` | `false` 时才请求真实后端 |
| `VITE_REQUEST_TIMEOUT_MS` | `15000` | 每个 HTTP 请求的超时时间，最小为 1 ms |
| `VITE_MOCK_DELAY_MS` | `450` | 只影响运行时 Mock |

前端请求默认包含：

```http
Accept: application/json
Content-Type: application/json
```

只有包含请求体时才会发送 `Content-Type`。当前前端不发送 Cookie、Authorization 或模型
API Key。LLM 和 Embedding 密钥只能保存在后端。

## 4. 接口一：加载项目

### 4.1 请求

```http
POST /api/projects/load
Content-Type: application/json

{
  "project_path": "D:/projects/demo-app"
}
```

字段约束：

| 字段 | 类型 | 必需 | 约束 |
|---|---|---:|---|
| `project_path` | string | 是 | 去除首尾空白后不能是空字符串；应是后端进程可访问的路径 |

浏览器不会直接读取用户磁盘。路径是否存在、是否有权限、是否是允许扫描的目录，都由后端
负责检查。

### 4.2 成功响应

```json
{
  "project_id": "demo-app",
  "project_path": "D:/projects/demo-app",
  "file_count": 18,
  "files": [
    {
      "file_path": "src/main.py",
      "file_type": ".py",
      "size": 2048
    }
  ]
}
```

运行时校验规则：

- `project_id`：非空字符串，后续索引和问答都依赖该值。
- `project_path`：非空字符串；前端会使用响应值更新路径输入框。
- `file_count`：大于等于 0 的安全整数。
- `files`：必须存在且必须是数组，空项目返回 `[]`，不能返回 `null`。
- `file_path`：非空字符串，建议使用项目根目录下的相对路径。
- `file_type`：字符串；未知类型可以返回空字符串。
- `size`：大于等于 0 的安全整数，单位为字节。

前端不要求 `file_count === files.length`。后端可以只返回有限的文件摘要，但
`file_count` 应表示项目的实际可索引文件数量。不要在这里返回文件全文。

### 4.3 生命周期要求

- 同一个已加载项目在当前后端进程中应能通过 `project_id` 找回扫描或解析结果。
- 加载新项目时，前端会取消旧请求并清空旧索引和旧问答。
- `project_id` 应稳定、可安全放入 JSON 和查询参数，不应包含秘密信息或原始绝对路径。

## 5. 接口二：建立索引

### 5.1 请求

```http
POST /api/index/build
Content-Type: application/json

{
  "project_id": "demo-app"
}
```

### 5.2 同步完成响应

```json
{
  "project_id": "demo-app",
  "status": "completed",
  "chunk_count": 42,
  "elapsed_ms": 860
}
```

后端能够在单个请求中完成索引时，可以直接返回 `completed`，前端不会继续轮询。

### 5.3 异步构建响应

```json
{
  "project_id": "demo-app",
  "status": "building"
}
```

返回 `building` 后，前端每 1500 ms 调用状态查询接口。重复点击会被前端锁定；项目切换、
重新建立索引或页面卸载时，前端会取消旧请求和旧轮询。

### 5.4 构建失败响应

索引任务已创建但业务执行失败时，可以返回 HTTP 200 和领域终态：

```json
{
  "project_id": "demo-app",
  "status": "failed",
  "detail": "Embedding 服务不可用，请稍后重新建立索引。"
}
```

请求本身无法受理时，例如项目不存在，应返回合适的 4xx/5xx 和统一错误结构，不要伪装成
`building`。

## 6. 接口三：查询索引状态

### 6.1 请求

```http
GET /api/index/status?project_id=demo-app
Accept: application/json
```

前端使用 `URLSearchParams` 编码 `project_id`。

### 6.2 响应

构建中：

```json
{
  "project_id": "demo-app",
  "status": "building"
}
```

完成：

```json
{
  "project_id": "demo-app",
  "status": "completed",
  "chunk_count": 42,
  "elapsed_ms": 860
}
```

失败：

```json
{
  "project_id": "demo-app",
  "status": "failed",
  "detail": "索引构建失败。"
}
```

状态不存在：

```json
{
  "project_id": "demo-app",
  "status": "idle"
}
```

字段约束：

| 字段 | 类型 | 必需 | 约束 |
|---|---|---:|---|
| `project_id` | string | 是 | 非空，并应与请求项目一致 |
| `status` | string | 是 | 只能为 `idle`、`building`、`completed`、`failed` |
| `chunk_count` | integer | 否 | 大于等于 0；建议在 `completed` 时返回 |
| `elapsed_ms` | integer | 否 | 大于等于 0，单位为毫秒 |
| `detail` | string | 否 | 失败原因或补充说明 |

前端收到 `completed` 或 `failed` 后停止轮询；收到 `idle` 会提示用户重新建立索引。

重要限制：当前前端对每个 HTTP 请求有超时，但对整个索引任务没有总时限。后端必须保证
任务最终进入 `completed` 或 `failed`，不能无限保持 `building`。如果后端任务可能长期
运行，合并时应共同确定总超时、进度字段或任务过期策略。

## 7. 接口四：代码问答

### 7.1 请求

```http
POST /api/chat
Content-Type: application/json

{
  "project_id": "demo-app",
  "question": "这个项目的启动入口在哪里？",
  "top_k": 5
}
```

当前页面固定发送 `top_k: 5`。

### 7.2 带引用响应

```json
{
  "answer": "项目的后端入口位于 backend/main.py。",
  "sources": [
    {
      "file_path": "backend/main.py",
      "start_line": 1,
      "end_line": 9,
      "content": "from fastapi import FastAPI\n\napp = FastAPI()"
    }
  ]
}
```

### 7.3 无可靠引用响应

```json
{
  "answer": "当前检索上下文不足，无法给出可靠引用。",
  "sources": []
}
```

`sources` 必须始终存在。没有来源时返回空数组，不得返回 `null`，也不得制造虚假文件路径
或行号。

引用字段约束：

| 字段 | 类型 | 必需 | 约束 |
|---|---|---:|---|
| `answer` | string | 是 | 建议为非空、可直接展示的回答 |
| `sources` | array | 是 | 无来源时返回 `[]` |
| `file_path` | string | 是 | 非空，推荐项目内相对路径 |
| `start_line` | integer | 是 | 从 1 开始 |
| `end_line` | integer | 是 | 大于等于 `start_line`，按包含结束行理解 |
| `content` | string | 是 | 与行号范围对应的原始代码片段 |

如果 `content` 有 N 行，建议满足：

```text
N = end_line - start_line + 1
```

前端目前不强制校验上述等式，但会按 `start_line` 为代码片段生成显示行号。后端必须保留
扫描、切分、索引和检索过程中的原始行号，不应在生成回答时重新猜测。

## 8. 统一错误响应

后端错误优先使用 FastAPI 常见结构：

```json
{
  "detail": "项目路径不存在。"
}
```

FastAPI 的 422 校验数组也受支持，前端会读取第一条 `msg`：

```json
{
  "detail": [
    {
      "loc": ["body", "project_path"],
      "msg": "Field required",
      "type": "missing"
    }
  ]
}
```

推荐状态码：

| 状态码 | 场景 | 前端默认重试属性 |
|---:|---|---|
| 400 | 请求语义错误、空路径等 | 不可重试 |
| 403 | 路径无读取权限 | 不可重试 |
| 404 | 项目或任务不存在 | 不可重试 |
| 408 | 后端处理超时 | 可重试 |
| 422 | FastAPI 参数校验失败 | 不可重试 |
| 429 | 模型或服务限流 | 可重试 |
| 500–599 | 后端内部错误或依赖不可用 | 可重试 |

传输要求：

- 四个接口的成功和错误响应都必须是合法 JSON。
- 不要对这些接口返回空响应；空响应会被转换为 `EMPTY_RESPONSE`。
- 非 JSON 响应会被转换为 `INVALID_RESPONSE`。
- 浏览器无法连接后端时会显示网络错误。
- 单个请求超过 `VITE_REQUEST_TIMEOUT_MS` 会被前端取消并显示超时。
- 主动切换项目或离开页面造成的取消不会作为业务错误展示。

成功 HTTP 响应还会经过运行时契约校验：

| 错误码 | 含义 |
|---|---|
| `INVALID_PROJECT_RESPONSE` | 项目响应缺少字段或字段类型非法 |
| `INVALID_INDEX_RESPONSE` | 索引状态或计数字段非法 |
| `INVALID_CHAT_RESPONSE` | 问答响应、引用或行号非法 |

这三个错误表示 HTTP 成功但接口契约不一致。联调时应修复后端响应或集中修改前端服务
适配器，不要在页面组件中增加临时兼容分支。

## 9. CORS 要求

当前开发常用地址：

- Vite 开发服务器：`http://127.0.0.1:5173`
- 生产预览验证：`http://127.0.0.1:4173`
- 后端默认地址：`http://127.0.0.1:8000`

FastAPI 示例：

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5173",
        "http://127.0.0.1:4173",
        "http://localhost:5173",
        "http://localhost:4173",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Accept"],
)
```

部署时应把正式前端域名加入允许列表。浏览器联调必须同时验证 `OPTIONS` 预检和实际
`POST` 请求，不能只用 Postman 或命令行请求判断 CORS 正常。

## 10. 后端适配原则

### 10.1 后端可以安全增加的内容

- 响应对象可以增加前端不使用的额外字段。
- 项目响应可以只提供文件摘要，不需要提供文件内容。
- 索引构建可以同步完成，也可以异步返回 `building`。
- `chunk_count`、`elapsed_ms` 和 `detail` 是可选字段。
- 问答可以返回零个、一个或多个来源。

### 10.2 需要共同确认后才能改变的内容

- API 路径或 HTTP 方法。
- `project_id` 的生命周期和唯一性。
- 索引状态枚举值。
- 文件、文本块和引用的行号语义。
- `files` 或 `sources` 从数组改为分页对象或 `null`。
- 问答从普通 JSON 改为 SSE、WebSocket 或其他流式协议。
- 身份认证、Cookie 或 Authorization 方案。

### 10.3 如果后端字段已经不同

按以下顺序处理：

1. 优先让后端遵循公共契约，避免多个消费者各自适配。
2. 确需兼容时，在 `frontend/src/types/api.ts` 更新领域类型。
3. 在 `frontend/src/services/` 增加响应适配和校验。
4. 保持 `features/` 与 `pages/` 不感知原始后端字段。
5. 同步更新本文档、Mock 响应和联调样例。
6. 重新执行 Mock 与真实 API 两套完整流程。

## 11. 推荐联调顺序

### 11.1 启动后端

```bash
pip install -r requirements.txt
uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

### 11.2 配置前端

在 `frontend/.env.local` 写入：

```text
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_USE_MOCK_API=false
VITE_REQUEST_TIMEOUT_MS=15000
```

然后启动：

```bash
cd frontend
npm install
npm run dev -- --host 127.0.0.1
```

修改 `.env.local` 后必须重新启动 Vite。

### 11.3 按顺序验证

1. 打开 `/workspace`，确认页面和控制台无错误。
2. 输入后端可读取的真实项目路径并加载。
3. 核对项目 ID、路径、文件数量和文件摘要。
4. 输入不存在路径，核对 `detail` 是否直接展示。
5. 建立索引，分别验证同步完成或异步轮询路径。
6. 重新建立索引，确认旧问答被清除。
7. 提问并展开引用，核对路径、1-based 行号和代码内容。
8. 验证无来源、后端 500、请求超时和项目切换取消。
9. 在浏览器 Network 中检查四个接口的 URL、请求体、响应和 CORS。
10. 执行前端质量命令并检查生产预览。

## 12. 合并验收清单

### 接口与状态

- [ ] `POST /api/projects/load` 成功、404 和 422 已验证。
- [ ] `POST /api/index/build` 支持实际采用的同步或异步行为。
- [ ] `GET /api/index/status` 能进入 `completed` 或 `failed` 终态。
- [ ] `POST /api/chat` 返回回答和真实来源。
- [ ] `sources=[]` 时页面不制造虚假引用。
- [ ] 所有错误响应为 JSON，并包含可读 `detail`。

### 数据语义

- [ ] `project_id` 在加载、索引和问答之间保持一致。
- [ ] 文件路径和引用路径采用统一的项目内相对路径规则。
- [ ] 引用行号从 1 开始，结束行包含在范围内。
- [ ] 引用代码内容与路径和行号实际对应。
- [ ] 项目切换和重建不会复用旧索引或旧回答。

### 浏览器与部署

- [ ] 开发地址和部署地址的 CORS 均已配置。
- [ ] `OPTIONS` 预检和实际跨域请求均通过。
- [ ] 浏览器控制台无未解释错误或警告。
- [ ] 前端环境变量中没有模型密钥或后端秘密。
- [ ] `npm run check` 通过。
- [ ] 生产预览完整流程通过。

## 13. 当前验证基线与遗留项

前端当前已验证：

- Mock 生产流程、失败状态、Guide、404、键盘和响应式检查通过。
- 本地 HTTP 契约服务器的四个端点、CORS、404、畸形响应和完整问答流程通过。
- 项目、索引和问答运行时响应校验已覆盖合法与非法样例。

仍需团队后端完成：

- 提供 `backend.main:app` 和四个真实接口。
- 明确项目状态保存方式与 `project_id` 生命周期。
- 明确索引任务是同步还是异步，以及任务过期和总超时策略。
- 确认文件扫描、切分、索引和检索全链路的行号保持一致。
- 配置开发与部署环境 CORS。
- 使用真实示例代码库复跑本文档第 12 节清单。

## 14. 文档发布说明

根目录 `docs/` 是正式可交付文档目录，当前只包含本文档，应随前端代码提交并供后端成员
和合并负责人阅读。开发过程文档、任务记录和设计资料位于 `mydocs/`，由 `.gitignore`
整体忽略，不得进入提交。

提交前执行：

```bash
git check-ignore -v mydocs/AI_RULES.md
git status --short --ignored
git diff --cached --name-only
```

应确认 `docs/FRONTEND_BACKEND_INTEGRATION.md` 可以被 Git 跟踪，而 `mydocs/` 仍显示为
忽略状态。不要使用会绕过忽略规则的方式暂存整个 `mydocs/`。

在发布前应再次对照真实后端修改接口示例和遗留项，避免把本地契约样例描述成真实后端
验收结果。
