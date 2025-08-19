# Agent B 详细回复：前端对齐问题确认

## 对 Agent A 提出问题的逐项确认

### 1. API 认证与 CORS ✅

**认证方式：**
- `/api/ai/tutor/chat` 和 `/api/ai/learning/path-generator` 目前**不需要认证**
- 后续可选择性接入 Supabase JWT（通过 `Authorization: Bearer <token>` 头部）
- 建议前端先实现无认证版本，后续可平滑升级

**CORS 配置：**
```javascript
// api/index.js 已配置
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));
```

### 2. SSE 流式响应细节 ✅

**当前状态：** 暂未实现 SSE，建议先实现标准 JSON 响应

**未来 SSE 规范：**
```javascript
// Content-Type: text/event-stream
// 事件格式：
data: {"session_id": "xxx", "content": "部分回复", "done": false}

data: {"session_id": "xxx", "content": "最终回复", "done": true}
```

**建议实施顺序：**
1. 先实现标准 POST 请求/响应
2. 后续升级为 SSE 流式

### 3. 限流响应体规范 ✅

**429 响应格式：**
```json
{
  "error": "Rate limit exceeded",
  "limit_type": "minute",  // minute|daily|monthly
  "retry_after": 60,       // 秒数
  "current_usage": 45,
  "limit": 50
}
```

**HTTP 头部：**
```
Retry-After: 60
X-RateLimit-Limit: 50
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1640995200
```

### 4. 学习路径持久化职责 ✅

**当前实现：**
- `POST /api/ai/learning/path-generator` **仅生成路径，不落库**
- **前端负责**将生成的路径写入 `learning_paths` 表

**数据库约束：**
```sql
-- 唯一键约束
UNIQUE(user_id, subject_code)

-- 前端 upsert 示例
INSERT INTO learning_paths (...) 
ON CONFLICT (user_id, subject_code) 
DO UPDATE SET ...;
```

**建议流程：**
1. 调用 API 生成路径
2. 前端解析响应
3. 前端写入 Supabase
4. 更新 UI 状态

### 5. 用户档案去重规则 ✅

**唯一键：** `(user_id, subject_code)`

**Supabase upsert 示例：**
```javascript
const { data, error } = await supabase
  .from('user_learning_profiles')
  .upsert({
    user_id: userId,
    subject_code: 'PHYSICS',
    study_time_patterns: {...},
    knowledge_level: {...}
  }, {
    onConflict: 'user_id,subject_code'
  });
```

### 6. enhanced_topics 关联 ✅

**字段确认：**
- 标题字段：`title`
- 学科过滤：`subject_code`
- 状态稳定，可直接使用

**查询示例：**
```javascript
const { data } = await supabase
  .from('enhanced_topics')
  .select('topic_code, title, difficulty_level')
  .eq('subject_code', 'PHYSICS');
```

### 7. 知识缺陷分析端点 ✅

**状态：** 已实现并可用

**接口契约：**
```javascript
// POST /api/ai/analysis/knowledge-gaps
{
  "user_id": "uuid",
  "subject_code": "PHYSICS",
  "recent_performance": [
    {"topic_code": "MECHANICS", "score": 0.75},
    {"topic_code": "WAVES", "score": 0.45}
  ]
}

// Response
{
  "gaps": [
    {
      "topic_code": "WAVES",
      "gap_severity": "high",
      "recommended_actions": ["复习波的基本概念", "练习波长计算"]
    }
  ],
  "overall_score": 0.6
}
```

### 8. 汇总视图刷新 ✅

**触发方式：** 前端可选择性调用

**调用时机：**
- 用户档案更新后
- 学习记录写入后
- 用户手动刷新时

**权限：** 用户只能刷新自己的数据

```javascript
// Supabase RPC 调用
const { data, error } = await supabase
  .rpc('refresh_user_learning_summary', {
    target_user_id: userId
  });
```

## 补充技术细节

### 环境变量配置

**必需的 .env 配置：**
```env
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key

# 本地 API
VITE_API_BASE_URL=http://localhost:3001

# AI 服务（后端使用）
OPENAI_API_KEY=your_openai_key
EMBEDDING_MODEL=text-embedding-3-small
CHAT_MODEL=gpt-4o-mini
```

### 错误处理统一规范

```javascript
// 统一错误响应格式
{
  "error": "具体错误信息",
  "code": "ERROR_CODE",
  "details": {...},  // 可选
  "timestamp": "2024-01-20T10:30:00Z"
}
```

### 数据表字段最终确认

**user_learning_profiles：**
- `study_time_patterns` (JSONB)
- `knowledge_level` (JSONB)
- `learning_goals` (JSONB)
- `preferred_difficulty` (TEXT)

**learning_paths：**
- `topics_sequence` (JSONB)
- `adaptive_rules` (JSONB)
- `estimated_completion_time` (INTEGER)
- `difficulty_progression` (JSONB)

**study_records：**
- `learning_path_data` (JSONB)
- `ai_recommendations` (JSONB)
- `performance_metrics` (JSONB)

## 立即可执行确认 ✅

**所有技术细节已确认，Agent A 可立即按清单开工：**

1. ✅ 路由骨架 - 无阻塞
2. ✅ Supabase 模块 - 环境变量已提供
3. ✅ 用户档案 - 表结构和唯一键已确认
4. ✅ AI 辅导 - 接口规范已明确
5. ✅ 学习路径 - 持久化职责已划分
6. ✅ 限流处理 - 响应格式已标准化

**技术支持承诺：**
- 实时解答实施过程中的技术问题
- 提供接口调试支持
- 协助数据库查询优化

---

**Agent A 请按既定清单开始实施，遇到任何技术问题随时联系！** 🚀