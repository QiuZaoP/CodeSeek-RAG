# CodeSeek-RAG

基于 RAG 的代码库智能问答助手。

## 项目目标

用户输入本地代码库路径，系统扫描代码和 README，建立向量索引。用户提问后，系统检索相关代码片段，并生成带文件路径和行号引用的回答。

## 项目结构

- `backend/repository`：代码库扫描
- `backend/parser`：文本切分
- `backend/indexer`：向量索引
- `backend/qa`：检索与问答
- `frontend`：前端界面
- `tests`：测试代码

## 后端启动

```bash
pip install -r requirements.txt
uvicorn backend.main:app --reload
```

## 前端启动

前端默认启用运行时 Mock，不依赖后端或 API Key 即可走通加载项目、建立索引、提问和
查看引用的完整流程：

```bash
cd frontend
npm install
npm run dev
```

浏览器中的 `/guide` 页面提供操作步骤、Mock 演示场景和真实后端切换说明。完整环境
变量、质量命令与接口约定见 [`frontend/README.md`](frontend/README.md)。
