# API 接口约定文档

**创建时间**: 2025年1月18日  
**版本**: v1.0  
**维护者**: Agent A (后端) + Agent B (前端)

## 🔌 接口规范总则

### 基础约定
- **基础URL**: `/api`
- **响应格式**: JSON
- **错误处理**: 统一错误响应格式
- **认证方式**: Supabase JWT Token

### 统一响应格式
```javascript
// 成功响应
{
  "success": true,
  "data": {}, // 实际数据
  "message": "操作成功"
}

// 错误响应
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述",
    "details": {} // 详细错误信息
  }
}
```

## 🎯 AI辅导相关接口

### 1. AI辅导对话接口
**Agent A 负责实现**
```javascript
// POST /api/ai/tutor/chat
{
  "message": "用户问题",
  "context": {
    "subject_code": "9709", // 科目代码
    "topic_id": "topic_123", // 主题ID (可选)
    "difficulty_level": "intermediate", // 难度级别
    "learning_style": "visual" // 学习风格偏好
  },
  "conversation_id": "conv_123" // 对话ID (可选，用于多轮对话)
}

// 响应
{
  "success": true,
  "data": {
    "response": "AI回答内容",
    "conversation_id": "conv_123",
    "suggestions": [
      {
        "type": "practice",
        "title": "建议练习",
        "content": "相关练习题推荐"
      }
    ],
    "knowledge_gaps": [
      {
        "topic_id": "topic_456",
        "topic_name": "二次函数",
        "confidence_score": 0.3
      }
    ]
  }
}
```

### 2. 知识点缺陷分析接口
**Agent A 负责实现**
```javascript
// POST /api/ai/analyze/knowledge-gaps
{
  "user_id": "user_123",
  "subject_code": "9709",
  "recent_interactions": 10 // 分析最近N次交互
}

// 响应
{
  "success": true,
  "data": {
    "gaps": [
      {
        "topic_id": "topic_123",
        "topic_name": "微积分基础",
        "confidence_score": 0.4,
        "priority": "high",
        "recommended_actions": [
          "复习基础概念",
          "完成练习题"
        ]
      }
    ],
    "overall_score": 0.75,
    "improvement_trend": "improving"
  }
}
```

## 📚 学习路径相关接口

### 3. 生成学习路径接口
**Agent A 负责实现**
```javascript
// POST /api/learning/path/generate
{
  "user_id": "user_123",
  "subject_code": "9709",
  "target_exam_date": "2025-06-01",
  "current_level": "intermediate",
  "time_available": {
    "daily_hours": 2,
    "weekly_days": 5
  },
  "preferences": {
    "learning_style": "visual",
    "difficulty_progression": "gradual"
  }
}

// 响应
{
  "success": true,
  "data": {
    "path_id": "path_123",
    "total_duration_weeks": 16,
    "milestones": [
      {
        "week": 1,
        "topics": ["topic_123", "topic_124"],
        "estimated_hours": 10,
        "objectives": ["掌握基础概念"]
      }
    ],
    "daily_schedule": [
      {
        "day": "monday",
        "activities": [
          {
            "type": "study",
            "topic_id": "topic_123",
            "duration_minutes": 60
          }
        ]
      }
    ]
  }
}
```

### 4. 获取学习路径进度接口
**Agent A 负责实现**
```javascript
// GET /api/learning/path/{path_id}/progress
// 响应
{
  "success": true,
  "data": {
    "path_id": "path_123",
    "completion_percentage": 45.5,
    "current_milestone": {
      "week": 3,
      "status": "in_progress",
      "completion_percentage": 70
    },
    "upcoming_activities": [
      {
        "date": "2025-01-19",
        "type": "practice",
        "topic_id": "topic_125",
        "estimated_duration": 45
      }
    ],
    "performance_metrics": {
      "average_accuracy": 0.82,
      "time_efficiency": 0.91,
      "consistency_score": 0.75
    }
  }
}
```

## 🎨 前端组件接口需求

### 5. AI辅导聊天组件 (Agent B 负责)
**组件名**: `AITutorChat`
**Props接口**:
```javascript
{
  subjectCode: string, // 科目代码
  topicId?: string, // 当前主题ID
  userPreferences: {
    learningStyle: 'visual' | 'auditory' | 'kinesthetic',
    difficultyLevel: 'beginner' | 'intermediate' | 'advanced'
  },
  onKnowledgeGapDetected: (gaps: KnowledgeGap[]) => void,
  onSuggestionClick: (suggestion: Suggestion) => void
}
```

### 6. 学习路径可视化组件 (Agent B 负责)
**组件名**: `LearningPathVisualizer`
**Props接口**:
```javascript
{
  pathData: LearningPath,
  currentProgress: number,
  onMilestoneClick: (milestone: Milestone) => void,
  onActivityStart: (activity: Activity) => void,
  viewMode: 'timeline' | 'calendar' | 'tree'
}
```

## 📊 数据类型定义

### TypeScript 接口
```typescript
interface KnowledgeGap {
  topic_id: string;
  topic_name: string;
  confidence_score: number; // 0-1
  priority: 'low' | 'medium' | 'high';
  recommended_actions: string[];
}

interface Suggestion {
  type: 'practice' | 'review' | 'concept' | 'example';
  title: string;
  content: string;
  action_url?: string;
}

interface LearningPath {
  path_id: string;
  total_duration_weeks: number;
  milestones: Milestone[];
  daily_schedule: DailySchedule[];
}

interface Milestone {
  week: number;
  topics: string[];
  estimated_hours: number;
  objectives: string[];
  status?: 'pending' | 'in_progress' | 'completed';
}

interface Activity {
  type: 'study' | 'practice' | 'review' | 'assessment';
  topic_id: string;
  duration_minutes: number;
  difficulty_level?: string;
}
```

## 🔄 开发协作流程

### 接口开发流程
1. **Agent A**: 实现后端API接口
2. **Agent A**: 更新此文档中的接口状态
3. **Agent B**: 根据接口文档开发前端组件
4. **联合测试**: 集成测试接口和组件

### 接口状态跟踪
| 接口名称 | Agent A状态 | Agent B状态 | 测试状态 |
|----------|-------------|-------------|----------|
| AI辅导对话 | ⏳ 待开发 | ⏳ 待开发 | ⏳ 待测试 |
| 知识点分析 | ⏳ 待开发 | ⏳ 待开发 | ⏳ 待测试 |
| 学习路径生成 | ⏳ 待开发 | ⏳ 待开发 | ⏳ 待测试 |
| 路径进度查询 | ⏳ 待开发 | ⏳ 待开发 | ⏳ 待测试 |

## 🚨 注意事项

### 性能考虑
- AI接口响应时间目标: < 3秒
- 学习路径生成: < 5秒
- 前端组件渲染: < 500ms

### 错误处理
- 网络超时: 15秒
- AI服务不可用时的降级策略
- 用户友好的错误提示

### 安全考虑
- 所有接口需要用户认证
- 敏感数据加密传输
- 输入参数验证和清理

---

**最后更新**: 2025年1月18日  
**更新人**: Agent A  
**下次更新**: 接口实现完成后