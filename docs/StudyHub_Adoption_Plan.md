# Study Hub 统一入口采用方案与实施计划

## 目标
- 为回访/已登录用户提供“开箱即用”的学习入口（默认进入 Study Hub）。
- 为首次访问/未登录用户保留当前首页，承担宣传与转化职责。
- 建立稳定的“学科 → 试卷 → 主题”的层级浏览与内容加载链路（DB 优先，JSON 回退）。

## 范围（本阶段）
- 路由策略：未登录保留首页 `/`，已登录访问 `/` 自动重定向至 `/study-hub`。
- 页面改造：修复 `StudyHub.jsx`、`SubjectPage.jsx` 的字段对齐（使用 `subjects.code`）。
- 体验优化：在导航处提供直达 Study Hub 的入口；保持现有 Topic 与 Paper 页混合加载架构。

## 交付物
- 路由与重定向逻辑（`HomeOrRedirect.jsx`）。
- 字段一致性修复（前端与 DB 对齐为 `subjects.code`）。
- 项目文档（本计划书）。

## 里程碑与时间
- M1（今日）：完成路由重定向与字段修复、联调通过。
- M2（明日）：Study Hub 增加“继续学习（最近进度）”占位模块。
- M3（数据到位后）：去除 JSON 回退，全面启用 DB 内容。

## 实施步骤
1. 新增 `HomeOrRedirect.jsx`：
   - 若用户已登录（`useAuth().user` 存在），`Navigate` 到 `/study-hub`；否则渲染 `Landing`。
2. 更新路由：将 `/` 路由挂载为 `HomeOrRedirect`。其余学习路由保持不变。
3. 字段对齐：
   - `StudyHub.jsx`：`select('id, name, code')`，链接使用 `subject.code`。
   - `SubjectPage.jsx`：按 `eq('code', subjectCode)` 查找学科；链接使用 `subject.code`。
4. 导航入口：Navbar 添加或确认“Explore/Start Learning”指向 `/study-hub`。
5. 验证：
   - 未登录访问 `/` 显示首页；登录后访问 `/` 自动到 `/study-hub`。
   - 从 Study Hub → 学科 → 试卷 → 主题，链路可用；DB 无数据时 JSON 正常回退。

## 风险与应对
- 字段不一致导致查询为空：统一使用 `subjects.code`，保留兼容查询。
- 环境变量不一致：前端用 `VITE_SUPABASE_*`，脚本用 `SUPABASE_*`，分别配置于 `.env.local` 与 `.env`。

## 指标与验证
- 首页→Study Hub 转化率、到达首个 Topic 的时间、次日留存。
- 若数据表现优异，可将 `/` 直接切换为 Study Hub。


