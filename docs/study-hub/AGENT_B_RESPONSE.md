# Agent B 回复：前端开发对接信息

## 📋 接口与访问方式

### 1. 推荐访问方式：前端直连 Supabase + 自建 API 混合模式

**直连 Supabase（推荐用于）：**
- 用户档案读写（`user_learning_profiles` 表）
- 学习进度查询（`learning_progress` 表）
- 基础数据查询（`enhanced_topics`, `subjects` 等）

**自建 API（必须用于）：**
- AI 辅导聊天：`POST /api/ai/tutor/chat`
- 学习路径生成：`POST /api/ai/learning/path-generator`
- 知识缺陷分析：`POST /api/ai/analysis/knowledge-gaps`

### 2. 核心 AI 接口详情

#### 2.1 AI 辅导聊天接口
```
POST /api/ai/tutor/chat
Content-Type: application/json

请求体：
{
  "message": "我不理解牛顿第二定律",
  "topic_id": "uuid",
  "subject_code": "9702", // 物理
  "session_id": "uuid", // 可选，续接会话
  "difficulty_level": "intermediate",
  "study_mode": true // 启用引导式提问
}

响应：
{
  "session_id": "uuid",
  "response": "让我们一步步理解牛顿第二定律...",
  "guided_questions": [
    "你能告诉我力和加速度之间有什么关系吗？"
  ],
  "knowledge_gaps": [
    "force_acceleration_relationship"
  ],
  "reflection_prompts": [
    "想想看，为什么质量越大的物体需要更大的力来产生相同的加速度？"
  ],
  "topic_context": {
    "current_topic": "牛顿第二定律",
    "related_concepts": ["力", "质量", "加速度"]
  }
}
```

**特性支持：**
- ✅ 支持流式响应（通过 Server-Sent Events）
- ✅ 超时设置：30秒
- ✅ 速率限制：每用户每分钟10次，每天100次
- ✅ Study Mode 引导式提问
- ✅ 上下文保持（基于 session_id）

#### 2.2 学习路径生成接口
```
POST /api/ai/learning/path-generator
Content-Type: application/json

请求体：
{
  "user_id": "uuid",
  "subject_code": "9709", // 数学
  "target_level": "A*",
  "available_time_weeks": 12,
  "weak_areas": ["calculus", "trigonometry"],
  "learning_style": "visual"
}

响应：
{
  "path_id": "uuid",
  "estimated_completion_weeks": 10,
  "difficulty_progression": "gradual",
  "topics_sequence": [
    {
      "topic_id": "uuid",
      "title": "基础微积分",
      "estimated_hours": 8,
      "difficulty_level": 2,
      "prerequisites_met": true
    }
  ],
  "adaptive_rules": {
    "time_adjustment": "based_on_performance",
    "difficulty_scaling": "automatic"
  }
}
```

## 🗄️ 数据库表结构现状

### 已迁移上线的表：

#### 1. `user_learning_profiles` ✅
```sql
CREATE TABLE user_learning_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  subject_code TEXT,
  learning_style JSONB DEFAULT '{}',
  knowledge_level JSONB DEFAULT '{}',
  learning_pace TEXT DEFAULT 'medium',
  preferred_difficulty INTEGER DEFAULT 3,
  study_time_patterns JSONB DEFAULT '{}',
  goals JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 2. `ai_tutoring_sessions` ✅
```sql
CREATE TABLE ai_tutoring_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  topic_id UUID REFERENCES enhanced_topics(id),
  subject_code TEXT,
  conversation_history JSONB DEFAULT '[]',
  topic_specific_context JSONB,
  difficulty_level TEXT,
  question_type TEXT,
  knowledge_gaps_identified JSONB,
  study_mode_enabled BOOLEAN DEFAULT FALSE,
  reflection_quality_score FLOAT,
  guided_questions JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 3. `learning_paths` ✅ (扩展自现有表)
```sql
-- 基于现有表扩展，已添加字段：
ALTER TABLE learning_paths ADD COLUMN subject_code TEXT;
ALTER TABLE learning_paths ADD COLUMN topics_sequence JSONB;
ALTER TABLE learning_paths ADD COLUMN adaptive_rules JSONB;
ALTER TABLE learning_paths ADD COLUMN estimated_completion_time INTEGER;
ALTER TABLE learning_paths ADD COLUMN difficulty_progression TEXT;
```

#### 4. `learning_progress` ✅ (使用现有 study_records 表)
```sql
-- 现有 study_records 表已包含所需字段，并已扩展：
ALTER TABLE study_records ADD COLUMN learning_path_data JSONB;
ALTER TABLE study_records ADD COLUMN ai_recommendations JSONB;
```

#### 5. `enhanced_topics` ✅
```sql
CREATE TABLE enhanced_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_topic_id UUID REFERENCES topics(id),
  subject_code TEXT NOT NULL,
  topic_code TEXT NOT NULL,
  title TEXT NOT NULL,
  learning_objectives JSONB,
  difficulty_level INTEGER DEFAULT 1,
  estimated_study_time INTEGER,
  exam_patterns JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 物化视图状态：

#### `user_learning_summary` ✅ 已创建
```sql
CREATE MATERIALIZED VIEW user_learning_summary AS
SELECT 
  u.id as user_id,
  u.email,
  COUNT(DISTINCT lp.id) as active_paths,
  AVG(lp.current_score) as avg_completion,
  COUNT(DISTINCT ats.id) as tutoring_sessions,
  MAX(ats.created_at) as last_tutoring_session
FROM auth.users u
LEFT JOIN learning_paths lp ON u.id = lp.user_id
LEFT JOIN ai_tutoring_sessions ats ON u.id = ats.user_id
GROUP BY u.id, u.email;
```

## 🔒 RLS/安全策略状态

### 已启用 RLS 的表：✅
- `user_learning_profiles`
- `ai_tutoring_sessions` 
- `learning_paths`
- `study_records`
- `personalized_recommendations`

### RLS 策略示例：
```sql
-- 用户只能访问自己的数据
CREATE POLICY "Users can only access their own learning profiles" 
ON user_learning_profiles FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own tutoring sessions" 
ON ai_tutoring_sessions FOR ALL 
USING (auth.uid() = user_id);
```

## 🔧 RPC 函数

### 已实现的 RPC 函数：

#### 1. 学习路径生成
```sql
CREATE OR REPLACE FUNCTION generate_adaptive_learning_path(
  p_user_id UUID,
  p_subject_code TEXT,
  p_target_level TEXT
) RETURNS JSON AS $$
-- 实现逻辑在 /api/ai/learning/path-generator.js
```

#### 2. 进度聚合
```sql
CREATE OR REPLACE FUNCTION get_user_progress_summary(
  p_user_id UUID
) RETURNS JSON AS $$
-- 聚合用户在所有科目的学习进度
```

#### 3. 刷新物化视图
```sql
CREATE OR REPLACE FUNCTION refresh_user_learning_summary()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW user_learning_summary;
END;
$$ LANGUAGE plpgsql;
```

## 💾 存储配置

### Supabase Storage Buckets：

#### 1. `ai-session-attachments` ✅ 已创建
- 用途：AI 辅导会话中的图片、文档附件
- 策略：用户只能上传和访问自己的文件
- 大小限制：单文件 10MB

#### 2. `learning-resources` ✅ 已创建
- 用途：学习资源文件（PDF、图片等）
- 策略：公开读取，管理员上传

### 存储策略示例：
```sql
-- AI 会话附件存储策略
CREATE POLICY "Users can upload their own session attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'ai-session-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

## 📊 示例数据与契约

### 1. 用户档案示例：
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "user_id": "user-uuid",
  "subject_code": "9702",
  "learning_style": {
    "visual": 0.7,
    "auditory": 0.2,
    "kinesthetic": 0.1
  },
  "knowledge_level": {
    "mechanics": 0.8,
    "thermodynamics": 0.6,
    "waves": 0.4
  },
  "learning_pace": "medium",
  "preferred_difficulty": 3,
  "goals": {
    "target_grade": "A*",
    "exam_date": "2024-06-01",
    "focus_areas": ["waves", "quantum_physics"]
  }
}
```

### 2. AI 辅导会话示例：
```json
{
  "id": "session-uuid",
  "user_id": "user-uuid",
  "topic_id": "topic-uuid",
  "subject_code": "9702",
  "conversation_history": [
    {
      "role": "user",
      "content": "我不理解波的干涉",
      "timestamp": "2024-01-15T10:30:00Z"
    },
    {
      "role": "assistant",
      "content": "让我们从波的基本性质开始...",
      "timestamp": "2024-01-15T10:30:05Z"
    }
  ],
  "knowledge_gaps_identified": [
    "wave_superposition",
    "phase_difference"
  ],
  "guided_questions": [
    "你能描述一下两个波相遇时会发生什么吗？"
  ]
}
```

### 3. 学习路径示例：
```json
{
  "id": "path-uuid",
  "user_id": "user-uuid",
  "subject_code": "9709",
  "title": "微积分掌握路径",
  "topics_sequence": [
    {
      "topic_id": "limits-uuid",
      "title": "极限",
      "order": 1,
      "estimated_hours": 6,
      "difficulty_level": 2,
      "is_completed": true
    },
    {
      "topic_id": "derivatives-uuid",
      "title": "导数",
      "order": 2,
      "estimated_hours": 8,
      "difficulty_level": 3,
      "is_completed": false
    }
  ],
  "adaptive_rules": {
    "time_adjustment": "performance_based",
    "difficulty_scaling": "gradual"
  }
}
```

## ⚡ 限流与配额

### AI 接口限流策略：

#### 1. AI 辅导聊天限制：
- **每用户每分钟**：10 次请求
- **每用户每天**：100 次请求
- **每用户每月**：2000 次请求

#### 2. 学习路径生成限制：
- **每用户每小时**：5 次请求
- **每用户每天**：20 次请求

#### 3. 前端提示语约定：
```javascript
// 限流提示消息
const RATE_LIMIT_MESSAGES = {
  minute: "请求过于频繁，请稍后再试（每分钟限制10次）",
  daily: "今日AI辅导次数已用完，明天再来吧！（每日限制100次）",
  monthly: "本月AI辅导配额已用完，请联系管理员"
};

// HTTP 状态码 429 处理
if (response.status === 429) {
  const retryAfter = response.headers.get('Retry-After');
  showToast(RATE_LIMIT_MESSAGES[response.data.limit_type]);
}
```

## 🚀 现状与差异点总结

### ✅ 已完成（可直接使用）：
1. **数据库表结构**：所有核心表已迁移完成
2. **RLS 安全策略**：已启用并配置
3. **AI 辅导接口**：完整实现，支持流式响应
4. **学习路径生成**：基础功能已实现
5. **存储配置**：Buckets 已创建并配置策略
6. **限流机制**：已在 API 层实现

### ⚠️ 需要注意的差异：
1. **表名映射**：
   - 设计文档中的 `adaptive_learning_paths` → 实际使用 `learning_paths`
   - 设计文档中的 `learning_progress` → 实际使用 `study_records`

2. **字段差异**：
   - `user_learning_profiles.time_spent_tracking` → 实际为 `study_time_patterns`
   - `user_learning_profiles.accuracy_tracking` → 实际为 `knowledge_level`

### 🔄 建议的前端实施顺序：

#### 第1周：基础架构
1. **路由与页面骨架** + **Supabase 模块搭建**
2. **用户档案与进度最小闭环**（直连 Supabase）

#### 第2周：核心功能
3. **AI 辅导界面 MVP**（调用 `/api/ai/tutor/chat`）
4. **学习路径可视化 MVP**（调用 `/api/ai/learning/path-generator`）

#### 第3周：完善体验
5. **错误处理与限流提示**
6. **基础分析占位**

## 📞 技术支持

如有任何问题，请随时联系：
- API 调试：可使用 `http://localhost:3001/api/info` 查看所有可用端点
- 数据库查询：可通过 Supabase Dashboard 直接查看表结构
- 实时日志：API 服务器会输出详细的请求日志

---

**Agent B 确认**：以上信息基于当前实际实现状态，前端可立即开始开发。如遇到任何接口调用问题，我会及时协助解决。