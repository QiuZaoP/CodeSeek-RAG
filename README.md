<<<<<<< HEAD
@'
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
=======
# CodeSeek-RAG
>>>>>>> 99a08916743003e6fb8bfc97bca8a6543f691db5
