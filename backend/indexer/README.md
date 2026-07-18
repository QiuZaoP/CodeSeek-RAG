# 向量索引模块

模块三使用 Chroma 为每个 `project_id` 建立独立的本地持久化索引。重复构建会先完成输入校验、向量生成和 staging 集合写入，再通过 backup 集合切换，因此不会累积重复文本块；写入失败时旧索引仍可用。

## Python 接口

```python
from backend.indexer.api import build, close, delete, search, status
from backend.indexer import ChromaIndexer

result = build(project_id, chunks)
matches = search(project_id, "数据库连接在哪里？", top_k=5)
current = status(project_id)
deleted = delete(project_id)
close()

# 短生命周期任务可显式释放 Chroma 的 SQLite 文件句柄
with ChromaIndexer("data/chroma", embedding_provider) as indexer:
    indexer.build(project_id, chunks)
```

`chunks` 可以是字典或数据类对象，但必须包含规划文档约定的 `chunk_id`、`project_id`、`file_path`、`start_line`、`end_line` 和 `content` 字段。文件路径必须是相对路径，行号从 1 开始。

模块四可将 `QA_RETRIEVER_SEARCH` 配置为 `backend.indexer.api:search`。返回对象包含模块四要求的 `file_path`、起止行号和文本内容。

## 配置

- `CHROMA_PERSIST_DIRECTORY`：Chroma 数据目录，默认 `data/chroma`。
- `EMBEDDING_MODEL`：本地 SentenceTransformer 模型，默认 `sentence-transformers/all-MiniLM-L6-v2`。

模型只在首次真实向量化时加载。自动化测试注入 Mock embedding，不下载模型、不调用外部 API。

Chunk 写入会按照 Chroma 客户端报告的最大批大小自动分批，超过 5461 个 Chunk 的项目也可以构建。`ChromaIndexer.close()` 是幂等的，推荐在应用退出钩子中调用；也可以使用上下文管理器自动释放持久化客户端。

HTTP 路由通过 `backend.indexer.http.create_index_router(indexer, chunk_provider)` 注入应用。`chunk_provider(project_id)` 由项目加载/解析流程提供，避免索引模块直接依赖扫描和切分模块。

## 测试

```powershell
python -m pytest tests/test_indexer.py tests/test_indexer_adversarial.py -v
```
