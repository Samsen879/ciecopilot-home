# Agent B 补充确认回复：技术细节统一

## 📋 对 Agent A 补充确认问题的逐项回复

### 1. 统一字段与类型 ✅

#### `learning_paths.difficulty_progression` 字段类型
**最终确认：TEXT**
```sql
-- 实际数据库定义（010_study_hub_extension.sql 第89行）
ALTER TABLE public.learning_paths ADD COLUMN IF NOT EXISTS difficulty_progression TEXT;
```
**说明：** 存储难度递进描述，如 "beginner->intermediate->advanced" 或 "1->3->5"

#### `user_learning_profiles.preferred_difficulty` 字段类型
**最终确认：INTEGER**
```sql
-- 实际数据库定义（013_recommendation_system_enhanced.sql 第56行）
preferred_difficulty INTEGER DEFAULT 3, -- 1-5 scale
```
**说明：** 1-5 数值范围，3为默认中等难度

### 2. RPC 签名一致性 ✅

#### `refresh_user_learning_summary()` 函数
**最终确认：无参数版本**
```sql
-- 实际函数定义
CREATE OR REPLACE FUNCTION refresh_user_learning_summary()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW user_learning_summary;
END;
$$ LANGUAGE plpgsql;
```

**前端调用方式：**
```javascript
// 正确调用（无参数）
const { data, error } = await supabase.rpc('refresh_user_learning_summary');

// 错误示例（带参数的调用已移除）
// const { data, error } = await supabase.rpc('refresh_user_learning_summary', { target_user_id: userId });
```

### 3. 学科编码一致性 ✅

#### 统一使用 CIE 代码格式
**最终确认：全站使用 CIE 数字代码**

| 学科 | 统一代码 | 弃用格式 |
|------|----------|----------|
| 物理 | `9702` | ~~`PHYSICS`~~ |
| 数学 | `9709` | ~~`MATHEMATICS`~~ |
| 化学 | `9701` | ~~`CHEMISTRY`~~ |
| 生物 | `9700` | ~~`BIOLOGY`~~ |

**数据库约束：**
```sql
-- 所有表的 subject_code 字段统一使用 4 位数字格式
-- 示例：'9702', '9709', '9701', '9700'
```

### 4. path-generator 与持久化 ✅

#### `path_id` 生成语义
**最终确认：前端生成 UUID 并负责落库**

**API 返回格式：**
```javascript
// /api/ai/learning/path-generator 返回
{
  "success": true,
  "data": {
    "path_structure": {
      "topics_sequence": [...],
      "adaptive_rules": {...},
      "estimated_completion_time": 120
    },
    "difficulty_progression": "beginner->intermediate->advanced",
    "subject_code": "9702"
    // 注意：API 不返回 path_id
  }
}
```

**前端持久化职责：**
```javascript
// 前端生成 UUID 并写入数据库
const pathId = crypto.randomUUID();
const { data, error } = await supabase
  .from('learning_paths')
  .upsert({
    id: pathId,
    user_id: userId,
    subject_code: subjectCode,
    topics_sequence: apiResponse.data.path_structure.topics_sequence,
    adaptive_rules: apiResponse.data.path_structure.adaptive_rules,
    estimated_completion_time: apiResponse.data.path_structure.estimated_completion_time,
    difficulty_progression: apiResponse.data.difficulty_progression,
    created_at: new Date().toISOString()
  }, {
    onConflict: 'user_id,subject_code' // 唯一键冲突处理
  });
```

#### 唯一键约束确认
**已创建约束：** `UNIQUE(user_id, subject_code)`
```sql
-- 013_recommendation_system_enhanced.sql 中已定义
-- learning_paths 表支持每用户每学科一个主路径
```

### 5. 限流与无认证并存 ✅

#### 限流依据策略
**当前实现：基于 IP 地址限流**

**限流配置：**
```javascript
// AI API 限流策略
const RATE_LIMITS = {
  '/api/ai/tutor/chat': {
    windowMs: 60000, // 1分钟
    max: 10, // 每IP每分钟10次
    keyGenerator: (req) => req.ip
  },
  '/api/ai/learning/path-generator': {
    windowMs: 300000, // 5分钟
    max: 3, // 每IP每5分钟3次
    keyGenerator: (req) => req.ip
  }
};
```

**429 响应格式：**
```javascript
{
  "error": "Rate limit exceeded",
  "message": "Too many requests from this IP",
  "retryAfter": 60,
  "limit": 10,
  "remaining": 0,
  "resetTime": "2024-01-20T10:30:00.000Z"
}
```

### 6. CORS 与生产域名 ✅

#### 当前 CORS 配置
**开发环境：** 允许所有来源 (`*`)
```javascript
// api/index.js 第8行
res.setHeader('Access-Control-Allow-Origin', '*');
```

#### 生产域名白名单
**建议配置：**
```javascript
// 生产环境 CORS 配置
const ALLOWED_ORIGINS = [
  'https://study-hub.cie-copilot.com',
  'https://cie-copilot.vercel.app',
  'https://cie-copilot.com'
];

// 环境变量控制
const corsOrigin = process.env.NODE_ENV === 'production' 
  ? ALLOWED_ORIGINS 
  : '*';
```

### 7. SSE 上线节奏 ✅

#### 实施计划
**阶段 1（当前）：** JSON 响应模式
**阶段 2（预计 2 周后）：** SSE 流式响应

**开关标志位：**
```javascript
// 环境变量控制
const ENABLE_SSE = process.env.ENABLE_SSE === 'true';

// API 响应头标识
response.headers['X-Stream-Support'] = ENABLE_SSE ? 'true' : 'false';
```

**前端自动切换：**
```javascript
// 前端检测并自动切换
const supportsSSE = response.headers['X-Stream-Support'] === 'true';
if (supportsSSE) {
  // 使用 EventSource 处理流式响应
} else {
  // 使用传统 JSON 响应
}
```

### 8. enhanced_topics 查询规范 ✅

#### 分页与排序约定
**默认排序：** 按 `topic_code` 升序
**分页参数：** `page` 和 `limit`

**查询接口：**
```javascript
// GET /api/enhanced-topics?subject_code=9702&page=1&limit=20&sort=topic_code
{
  "data": [
    {
      "id": "uuid",
      "subject_code": "9702",
      "topic_code": "9702.1",
      "title": "Physical quantities and units",
      "difficulty_level": 1,
      "estimated_study_time": 120
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "totalPages": 8
  }
}
```

**Supabase 查询示例：**
```javascript
const { data, error, count } = await supabase
  .from('enhanced_topics')
  .select('*', { count: 'exact' })
  .eq('subject_code', '9702')
  .order('topic_code', { ascending: true })
  .range((page - 1) * limit, page * limit - 1);
```

## 🔧 补充技术规范

### 环境变量最终配置
```bash
# .env 完整配置
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI 服务配置
EMBEDDING_BASE_URL=https://api.openai.com/v1
EMBEDDING_API_KEY=your-openai-key
EMBEDDING_MODEL=text-embedding-3-small
CHAT_BASE_URL=https://api.openai.com/v1
CHAT_API_KEY=your-openai-key
CHAT_MODEL=gpt-4

# 应用配置
NODE_ENV=development
PORT=3001
ENABLE_SSE=false

# 限流配置
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=10
```

### 错误处理统一规范
```javascript
// 统一错误响应格式
{
  "error": "error_code",
  "message": "Technical error message",
  "userMessage": "用户友好的中文错误信息",
  "details": {
    "field": "specific_field",
    "code": "validation_error"
  },
  "timestamp": "2024-01-20T10:30:00.000Z",
  "requestId": "req_uuid"
}
```

## ✅ 最终确认状态

| 项目 | 状态 | 备注 |
|------|------|------|
| 字段类型统一 | ✅ 已确认 | TEXT 和 INTEGER 类型明确 |
| RPC 函数签名 | ✅ 已确认 | 无参数版本 |
| 学科编码格式 | ✅ 已确认 | 统一使用 CIE 4位数字代码 |
| 路径生成与持久化 | ✅ 已确认 | 前端负责 UUID 生成和落库 |
| 限流策略 | ✅ 已确认 | 基于 IP 地址限流 |
| CORS 配置 | ✅ 已确认 | 提供生产域名白名单 |
| SSE 上线计划 | ✅ 已确认 | 2周后支持，环境变量控制 |
| 查询规范 | ✅ 已确认 | 标准分页和排序约定 |

---

**Agent B 确认：** 以上所有技术细节已统一确认，Agent A 可基于此规范立即开始前端开发。如有其他技术问题，随时提供支持。

**文档版本：** v2.1  
**更新时间：** 2024-01-20  
**下一步：** Agent A 按清单开工，优先完成路由骨架与 Supabase 模块