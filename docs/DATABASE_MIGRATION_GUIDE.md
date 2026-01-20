> LEGACY / not authoritative; kept for reference only.

# CIE Copilot 数据库迁移指南

## 🎯 目标
完成CIE Copilot项目的数据库迁移工作，将现有的JSON数据迁移到Supabase数据库中。

## 📋 已完成工作

### ✅ 数据库结构设计
- **001_initial_schema.sql**: 基础表结构 (用户、学科、试卷、主题、学习记录等)
- **002_knowledge_graph.sql**: 知识图谱扩展表 (知识关系、真题索引、学习路径等)
- **003_insert_subjects.sql**: 基础科目和试卷数据插入
- **004_add_filepath_to_papers.sql**: 为 `papers` 表增加 `file_path`
- **004_rag_embeddings.sql**: RAG 文档/分片/向量三表与索引、RLS
- **005_rag_search_functions.sql**: RAG 相似度检索 SQL 函数

### ✅ 数据文件分析
- **9709 Mathematics**: 4个paper，约200+主题
- **9231 Further Mathematics**: 4个模块，约150+主题
- **9702 Physics**: AS/A2级别，约100+主题

## 🚀 迁移步骤

### 第1步：环境配置
确保 `.env` 文件已正确配置：
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 第2步：数据库表创建
在Supabase SQL编辑器中按顺序运行：

1. **运行 001_initial_schema.sql**
2. **运行 002_knowledge_graph.sql**
3. **运行 003_insert_subjects.sql**
4. 可选：**运行 004_add_filepath_to_papers.sql**
5. **运行 004_rag_embeddings.sql**
6. **运行 005_rag_search_functions.sql**
7. 可选但推荐：**运行 006_rag_fulltext.sql**（启用全文检索与混合检索）

### 第3步：数据迁移执行 / RAG 导入
```bash
# 现有 JSON → 结构化表
node scripts/migrate-data.js

# RAG 导入（笔记与 PDF 向量化）
# Dry run
node scripts/rag_ingest.js --subject=9702 --notes --pdf --limit=5 --dry
# 执行
OPENAI_API_KEY=sk-xxx node scripts/rag_ingest.js --subject=9702 --notes --pdf --limit=5

# 向量/全文/混合检索演示
OPENAI_API_KEY=sk-xxx node scripts/rag_search_demo.js 9702 AS  "electric field potential difference"
> 如果未配置向量服务，`/api/rag/search` 将自动回退为全文检索（websearch_to_tsquery），若已运行 `006_rag_fulltext.sql` 则默认使用混合检索（embedding + fulltext）。
```

## 📊 数据概览

| 科目代码 | 科目名称 | 试卷数量 | 主题数量 |
|----------|----------|----------|----------|
| 9709 | Mathematics | 4 | ~200+ |
| 9231 | Further Mathematics | 4 | ~150+ |
| 9702 | Physics | 5 | ~100+ |

## 🔧 知识图谱功能

### 新增表结构
- **knowledge_relationships**: 知识点关联关系
- **knowledge_tags**: 知识点标签系统
- **past_papers**: 真题索引
- **paper_questions**: 题目详情
- **question_knowledge_points**: 题目-知识点关联
- **learning_paths**: 个性化学习路径

## 🎯 下一步计划

1. **完成Supabase配置**
2. **执行实际数据迁移**
3. **建立知识图谱关系**
4. **集成真题索引系统**
5. **开发AI推荐引擎**

## 📁 文件结构
```
database/
├── migrations/
│   ├── 001_initial_schema.sql ✅
│   ├── 002_knowledge_graph.sql ✅
│   └── 003_insert_subjects.sql ✅
scripts/
├── migrate-data.js (完整迁移)
├── migrate-data-demo.js (演示版本)
└── migrate-data.js.backup (备份)
```

## 🎉 状态总结
- ✅ 数据库架构设计完成
- ✅ 迁移脚本准备就绪
- ✅ 数据结构分析完成
- ⏳ 等待Supabase环境配置
- ⏳ 等待实际数据迁移执行