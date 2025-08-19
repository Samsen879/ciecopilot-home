# CIE Copilot 网站重构对齐文档

## 6A工作流 - Align阶段

**创建时间**: 2025-01-19  
**任务名称**: 网站重构对齐  
**阶段**: Align (对齐阶段)  

---

## 1. 项目上下文分析

### 1.1 现有项目结构

**技术栈**:
- 前端: React 18.2.0 + Vite 5.0.12
- 路由: React Router DOM 6.30.1
- 样式: TailwindCSS 3.4.1 + Framer Motion 12.18.1
- 状态管理: React Query 5.84.2
- 后端: Supabase + Express.js
- AI集成: OpenAI 5.12.0
- 数据库: PostgreSQL (Supabase)

**架构模式**:
- 单页应用 (SPA) 架构
- 组件化开发模式
- RESTful API + RAG系统
- 模块化路由设计

### 1.2 数据库现状

**已有数据**:
- **科目表 (subjects)**: 3条记录 (9231, 9702, 9709)
- **试卷表 (papers)**: 21条记录
- **主题表 (topics)**: 76条记录
- **RAG文档表**: 173条记录 (9231: 62个, 9702: 68个, 9709: 43个)
- **RAG文本块表**: 1000条记录
- **RAG嵌入表**: 1000条记录

**缺失数据**:
- 用户表 (users) - 不存在
- 错误记录表 (error_records) - 不存在
- 学习记录表 (study_records) - 0条记录

### 1.3 业务域分析

**核心业务**: CIE (Cambridge International Examinations) 在线学习平台

**目标用户**: CIE考试学生

**核心科目**: 
- Mathematics (9709)
- Further Mathematics (9231) 
- Physics (9702)

---

## 2. 原始需求分析

### 2.1 用户反馈的核心问题

1. **功能不可用问题**
   - Smart Function中的大部分功能无法使用
   - 页面存在但缺乏实际功能实现

2. **内容不符合目标**
   - Smart Function功能需要进一步完善
   - Community内容全部为数学相关，不符合CIE考纲

3. **路由页面不对齐**
   - 导航栏"Start Learning"仍使用旧的paper分类
   - 缺乏实际信息填充
   - StudyHub入口缺失

4. **数据库资源未充分利用**
   - 数据库已有丰富内容但未在前端展示

### 2.2 具体问题详细分析

#### 2.2.1 导航栏路由问题

**当前导航结构**:
```javascript
startLearningItems = [
  {
    subject: "Mathematics (9709)",
    papers: [
      { name: "Paper 1 – Pure Maths 1", path: "/paper/9709/p1" },
      { name: "Paper 3 – Pure Maths 3", path: "/paper/9709/p3" },
      // ...
    ]
  },
  // ...
]
```

**问题**:
- 仍使用旧的paper-based路由结构
- 路径指向 `/paper/subject/paper` 而非新的学习路径
- 缺少StudyHub入口

#### 2.2.2 Smart Function问题

**当前Smart Function配置**:
```javascript
smartFunctionItems = [
  { name: "AI Q&A", path: "/ask-ai" },
  { 
    name: "Learning Paths", 
    submenu: [
      { name: "Mathematics (9709)", path: "/learning-path/9709" },
      { name: "Physics (9702)", path: "/learning-path/9702" },
      // 仅支持数学、进阶数学、物理三门科目
    ]
  },
  // ...
]
```

**问题**:
- 仅包含目标科目：数学(9709)、进阶数学(9231)、物理(9702)
- 部分功能页面存在但功能不完整

#### 2.2.3 Community内容问题

**当前状态**:
- Community内容仅限数学
- 不完全符合CIE考纲结构
- 缺乏Physics相关社区内容

---

## 3. 需求理解确认

### 3.1 核心目标

**主要目标**: 重构网站以实现功能完整性和内容对齐

**具体要求**:
1. 确保仅包含目标科目内容
2. 修复Smart Function功能实现
3. 重新设计导航路由结构
4. 充分利用现有数据库资源
5. 确保Community内容符合CIE考纲
6. 添加StudyHub入口

### 3.2 功能范围确认

**包含科目**:
- Mathematics (9709) ✅
- Further Mathematics (9231) ✅  
- Physics (9702) ✅

**排除科目**:
- 仅支持：数学(9709)、进阶数学(9231)、物理(9702)
- 其他生化相关内容 ❌

**核心功能模块**:
1. Study Hub (学习中心)
2. Learning Paths (学习路径)
3. Smart Functions (智能功能)
4. Community (社区)
5. Progress Tracking (进度追踪)

---

## 4. 边界确认

### 4.1 任务边界

**包含范围**:
- 导航栏路由重构
- Smart Function功能修复
- Community内容对齐
- StudyHub集成
- 数据库内容展示优化

**不包含范围**:
- 数据库结构重大变更
- 新功能开发 (仅修复现有功能)
- UI/UX重大改版
- 后端API重构

### 4.2 技术约束

**必须保持**:
- 现有技术栈不变
- 现有数据库结构
- 现有组件架构
- 现有API接口

**允许修改**:
- 路由配置
- 组件内容
- 导航结构
- 页面布局

---

## 5. 疑问澄清

### 5.1 已识别的关键问题

1. **StudyHub入口位置**
   - 问题: StudyHub页面已存在但导航栏无入口
   - 建议: 将"Start Learning"主入口指向StudyHub

2. **Learning Path vs Paper Structure**
   - 问题: 当前混用两种结构
   - 建议: 统一使用Learning Path结构

3. **数据库内容展示**
   - 问题: 76个topics未在前端充分展示
   - 建议: 在StudyHub和Learning Path中展示

4. **Smart Function功能状态**
   - 问题: 部分功能页面存在但不可用
   - 需要: 逐一检查并修复

### 5.2 需要确认的决策点

1. **导航栏重构方案**
   - 选项A: 完全移除paper-based导航，使用StudyHub作为主入口
   - 选项B: 保留paper-based导航但修复路径
   - **推荐**: 选项A - 符合现代学习平台设计

2. **Smart Function清理范围**
   - 需要完善的功能: 三门核心科目相关
   - 需要修复的功能: 现有Mathematics, Physics功能

3. **Community内容重构**
   - 当前: 仅数学内容
   - 目标: 添加Physics内容，确保符合CIE考纲

---

## 6. 风险评估

### 6.1 技术风险

**低风险**:
- 路由配置修改
- 导航栏内容调整
- 页面内容更新

**中等风险**:
- Smart Function功能修复
- Community内容重构

**高风险**:
- 数据库查询优化
- 大量组件修改

### 6.2 业务风险

**用户体验风险**:
- 导航结构变更可能影响用户习惯
- 功能修复过程中可能出现临时不可用

**内容风险**:
- 移除生化内容可能影响部分用户
- Community内容重构可能丢失现有数据

---

## 7. 成功标准

### 7.1 功能完整性标准

- [ ] 所有Smart Function功能可正常使用
- [ ] 导航栏路由指向正确页面
- [ ] StudyHub入口可访问且功能完整
- [ ] 数据库内容在前端正确展示

### 7.2 内容对齐标准

- [ ] 确保所有内容仅涉及数学、进阶数学、物理
- [ ] Community内容符合CIE考纲
- [ ] 仅包含目标科目 (Math, Further Math, Physics)
- [ ] 学习路径结构清晰合理

### 7.3 用户体验标准

- [ ] 导航逻辑清晰直观
- [ ] 页面加载正常无错误
- [ ] 功能响应及时
- [ ] 内容组织合理

---

## 8. 下一步行动

### 8.1 立即行动项

1. 详细分析当前路由配置问题
2. 检查Smart Function各功能实现状态
3. 分析Community内容与CIE考纲对齐情况
4. 生成结构化问题清单

### 8.2 待确认事项

1. 导航栏重构的具体方案
2. Smart Function功能修复的优先级
3. Community内容重构的范围
4. StudyHub集成的实现方式

---

**文档状态**: 初稿完成，等待进一步分析和确认
**下一阶段**: 继续Align阶段的详细分析