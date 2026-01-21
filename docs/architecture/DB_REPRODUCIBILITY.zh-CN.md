# 数据库可复现性保证

## 目的

本文档定义了确保数据库正确性可证明、可复现的架构级不变量。这些保证是基础性的——而非可选的——因为系统的搜索和推荐逻辑依赖于无法仅在运行时验证的模式级约束。

## 定义

**数据库可复现性**意味着：从干净状态运行 `supabase db reset` 后，生成的模式能够通过所有验证检查，无需人工干预。

这是本地开发和 CI 验证的唯一真实来源。

## 模式不变量

任何迁移序列执行后，以下不变量必须成立：

| 不变量 | 验证方式 |
|--------|----------|
| `ltree` 扩展已启用 | `pg_extension` |
| `vector` 扩展已启用 | `pg_extension` |
| `curriculum_nodes.topic_path` 类型为 `ltree` | `information_schema.columns` |
| `chunks.embedding` 类型为 `vector(1536)` | `pg_attribute` + `format_type` |
| `idx_curriculum_nodes_topic_path_gist` 索引存在 | `pg_indexes` |
| `idx_curriculum_nodes_syllabus_code` 索引存在 | `pg_indexes` |
| `chk_topic_path_canonical` 约束存在 | `pg_constraint` |
| `chk_topic_path_not_unmapped` 约束存在 | `pg_constraint` |

验证脚本：`scripts/db/verify_schema.sql`

## 只读护栏

`curriculum_nodes` 是只读参考表。应用以下强制措施：

- 对 `anon` 和 `authenticated` 角色启用 RLS，仅允许 SELECT 策略
- 从 `anon` 和 `authenticated` 撤销 `INSERT`、`UPDATE`、`DELETE` 权限
- 如果存在写入策略，则显式删除

这可防止应用代码意外修改大纲结构。

迁移文件：`supabase/migrations/20260120073556_curriculum_nodes_read_only.sql`

## 搜索边界强制

`hybrid_search_v2` 通过 `p_topic_path ltree` 参数强制执行大纲范围搜索。

### 负面用例（必须报错）

| 输入 | 预期结果 |
|------|----------|
| `p_topic_path = NULL` | 错误：`current_topic_path required` |
| `p_topic_path = ''` | 错误：`unknown current_topic_path` |

### 正面用例

| 输入 | 预期结果 |
|------|----------|
| 有效的 `p_topic_path` | `leakage_count = 0`（无大纲边界外的结果） |

验证脚本：`scripts/db/verify_search_guardrail.sql`

## 非目标

本文档不涵盖：

- 应用层业务逻辑
- 前端状态管理
- API 端点设计
- 正确性之外的性能调优或索引策略
- 部署或 CI/CD 流水线配置

## 结论

数据库可复现性是基础性保证，而非便利功能。没有它，模式漂移将无法检测，搜索正确性将无法证明，本地/CI 环境将悄然分歧。

所有迁移必须保持这些不变量。所有验证必须在合并前通过。
