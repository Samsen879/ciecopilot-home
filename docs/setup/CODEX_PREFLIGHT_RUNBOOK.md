# Codex Preflight Runbook

这份 runbook 说明 `workflow:codex-preflight` 的边界、输出和日常使用方式。

## Scope

`workflow:codex-preflight` 是 Codex 每轮编辑前的本地卫生检查。

它只诊断，不修复：

- 不 stash
- 不 checkout
- 不 fetch / pull
- 不改 AO 状态
- 不创建或删除 worktree

它的目标是让 Codex 在动手前明确三件事：

- 当前分支是否适合编辑和提交
- 当前 worktree 是否已经有需要分类的变更
- 是否存在 upstream、AO/workflow entrypoint 或基础 git 可观测性风险

## Command Forms

Human-readable output:

```bash
cd /home/samsen/code/ciecopilot-home
npm run workflow:codex-preflight
```

JSON output:

```bash
cd /home/samsen/code/ciecopilot-home
npm run workflow:codex-preflight -- --json
```

Strict mode for automation:

```bash
cd /home/samsen/code/ciecopilot-home
npm run workflow:codex-preflight -- --json --strict
```

Non-strict mode exits `0` for observable `healthy`, `warning`, and `blocked`
reports so the caller can inspect JSON and decide next steps. It exits `1` only
when the source state cannot be observed.

Strict mode uses stable exit codes:

- `0`: `healthy`
- `20`: `warning`
- `30`: `blocked`
- `40`: `source_failure`

## Report Shape

The JSON schema is `codex_preflight_v1`.

Top-level fields:

- `top_status`: highest-severity status from all checks
- `repo`: branch, upstream, protected-branch, git-common-dir, and worktree facts
- `worktree`: dirty state, counts, and file buckets
- `checks`: individual check results
- `guidance`: one decision, summary, and suggested commands

Checks currently include:

- `source_observation`: git and `package.json` metadata can be read
- `branch_safety`: detached, protected, task/codex, or ambiguous branch posture
- `worktree_cleanliness`: clean, dirty, or conflicted worktree
- `upstream_sync`: missing upstream, ahead/behind, or synced state
- `workflow_entrypoints`: required workflow/AO scripts are present

## Decision Meanings

`safe_to_edit`

- Clean worktree
- Synced upstream
- Branch is `task/*` or `codex/*`

`classify_or_isolate_changes`

- Existing staged, unstaged, or untracked files are present
- Codex must classify them as related or unrelated before editing

`create_task_branch_before_commit`

- Current branch is `main`, `master`, or `baseline/*`
- Small inspection may continue, but commits need a `task/*` or `codex/*` branch

`sync_or_rebase_before_editing`

- Branch is behind upstream
- Prefer `git pull --ff-only` or a fresh task branch before new work

`stop_and_fix_branch`

- Detached HEAD
- Branch ownership is ambiguous; do not edit

`resolve_conflicts_before_editing`

- Merge conflicts exist
- Resolve before Codex edits the workspace

`inspect_source_failures`

- Git or package metadata could not be read
- Inspect the source errors before proceeding

## Relationship To AO

Preflight does not replace AO gates.

Use it before local Codex edits to understand workspace posture. For PR truth,
ownership continuity, or release posture, keep using:

```bash
npm run ao:reconcile:strict:pr -- <pr号>
npm run ao:doctor:strict:pr -- <pr号>
npm run ao:lifecycle:strict:pr -- <pr号> --trigger approved_and_green
```

If preflight reports `classify_or_isolate_changes`, `stop_and_fix_branch`, or
`inspect_source_failures`, do not treat AO output as enough to proceed. Fix the
local workspace posture first.
