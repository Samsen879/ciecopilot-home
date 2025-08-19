# 真题试卷和标准答案系统化迁移 - 对齐文档

## 项目上下文分析

### 现有项目架构
- **技术栈**: React + Vite + Supabase + RAG向量搜索
- **数据库**: Supabase PostgreSQL
- **RAG系统**: 基于OpenAI embeddings的向量搜索
- **文件结构**: 模块化组件架构，分离数据层和UI层

### 现有RAG系统状态
- **已完成**: 物理9702的43个Markdown笔记文件已录入RAG
- **RAG组件**: `rag_ingest.js` 脚本支持PDF和Markdown处理
- **数据库表**: rag_documents, text_chunks, embeddings表正常运行
- **前端集成**: PhysicsTopicDetail.jsx已集成RAG搜索功能

### 现有数据资源
- **真题试卷**: `data/past-papers/9702Physics/` (Paper 1-5, 2016-2024年)
- **标准答案**: `data/mark-schemes/9702Physics/` (对应年份和试卷)
- **文件命名规范**: `9702_[s/w/m][年份]_[qp/ms]_[试卷号][变体号].pdf`

## 原始需求理解

### 核心需求
1. **PDF内容提取**: 将真题试卷和标准答案PDF转换为可搜索的文本
2. **RAG系统集成**: 将试卷内容纳入现有向量搜索系统
3. **结构化索引**: 建立试卷与答案的关联关系
4. **前端展示**: 在物理主题页面提供试卷搜索和查看功能

### 边界确认
- **范围**: 仅处理物理9702科目的真题和答案
- **文件类型**: PDF格式的past-papers和mark-schemes
- **时间范围**: 2016-2024年的所有可用试卷
- **集成点**: 现有PhysicsTopicDetail.jsx页面

## 技术约束分析

### 现有系统约束
- **RAG脚本**: `rag_ingest.js` 已支持PDF处理
- **数据库结构**: 现有表结构需要扩展以支持试卷元数据
- **前端组件**: 需要扩展现有搜索界面
- **API限制**: OpenAI embedding API调用频率和成本考虑

### 技术依赖
- **PDF处理**: pdf-parse库 (已在rag_ingest.js中使用)
- **向量化**: OpenAI text-embedding-ada-002
- **数据库**: Supabase PostgreSQL
- **前端**: React Query + 现有RAG API

## 关键决策点

### 需要确认的问题
1. **数据库结构扩展**: 是否需要新增表来存储试卷元数据？
2. **文件组织策略**: 如何在RAG系统中区分笔记、试卷、答案？
3. **搜索体验设计**: 用户如何在界面中区分和筛选不同类型的内容？
4. **分块策略**: PDF试卷内容如何合理分块以优化搜索效果？
5. **关联机制**: 试卷和对应答案如何建立关联关系？

### 待澄清的技术细节
1. **PDF质量**: 扫描版PDF的OCR处理需求
2. **数学公式**: 包含数学符号的内容如何处理
3. **图表处理**: 试卷中的图表和图像如何处理
4. **性能考虑**: 大量PDF文件的批量处理策略

## 初步技术方案

### 数据库扩展
```sql
-- 扩展rag_documents表或新增paper_metadata表
ALTER TABLE rag_documents ADD COLUMN paper_type VARCHAR(20); -- 'question_paper' | 'mark_scheme' | 'notes'
ALTER TABLE rag_documents ADD COLUMN paper_code VARCHAR(50); -- '9702_s23_qp_12'
ALTER TABLE rag_documents ADD COLUMN year INTEGER;
ALTER TABLE rag_documents ADD COLUMN session VARCHAR(10); -- 'summer' | 'winter' | 'march'
ALTER TABLE rag_documents ADD COLUMN paper_number INTEGER;
ALTER TABLE rag_documents ADD COLUMN variant INTEGER;
```

### 处理流程
1. **文件扫描**: 遍历past-papers和mark-schemes目录
2. **元数据提取**: 从文件名解析试卷信息
3. **PDF内容提取**: 使用现有rag_ingest.js处理
4. **向量化存储**: 存入现有RAG数据库
5. **前端集成**: 扩展搜索界面和结果展示

## 验收标准

### 功能验收
- [ ] 所有物理9702试卷PDF内容可搜索
- [ ] 试卷和答案正确关联
- [ ] 搜索结果包含试卷类型和年份信息
- [ ] 用户可以筛选搜索结果类型
- [ ] 搜索性能满足用户体验要求

### 技术验收
- [ ] RAG数据库包含所有试卷内容
- [ ] 元数据正确存储和索引
- [ ] 现有系统功能不受影响
- [ ] 代码符合项目规范
- [ ] 包含适当的错误处理

## 风险评估

### 技术风险
- **PDF质量**: 部分扫描版PDF可能文本提取困难
- **API成本**: 大量内容向量化的OpenAI API成本
- **性能影响**: 大量数据对搜索性能的影响

### 缓解策略
- **分批处理**: 避免一次性处理所有文件
- **质量检查**: 实施PDF文本提取质量验证
- **性能监控**: 监控搜索响应时间和准确性

---

**状态**: 等待关键决策点确认
**下一步**: 基于确认结果生成CONSENSUS文档