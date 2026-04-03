# AO Root Baseline Migration Runbook

这份 runbook 只做一件事：

把当前本地现场从“历史双根结构”安全切换到阶段 1 之后的正式形态。

目标正式形态：

- canonical repo root：`/home/samsen/code/ciecopilot-home`
- root baseline branch：`baseline/origin-main`
- AO 启动入口：repo root
- workflow / hook 命令入口：repo root

当前历史输入：

- root 当前分支：`baseline/origin-main-20260330`
- 历史干净 baseline worktree：`.worktrees/baseline-origin-main-20260402`

## 先说原则

- 不做暴力 reset
- 不把当前脏根目录直接当成“已经安全”
- 不删除历史证据，先分类、再迁移、再决定是否归档
- 迁移前先保留现场，再切 root

## 0. 迁移前确认

先确认你是在 repo root：

```bash
cd /home/samsen/code/ciecopilot-home
pwd
git rev-parse --show-toplevel
```

应看到：

- `/home/samsen/code/ciecopilot-home`

再确认当前现场状态：

```bash
git status --short --branch
git rev-list --left-right --count origin/main...HEAD
git worktree list --porcelain
```

目的：

- 记录 root 当前脏状态
- 确认历史 baseline worktree 是否仍存在
- 确认 `origin/main` 与当前 root 分支的偏移量

## 1. 先保留 root 当前脏状态

如果 root 还有未提交改动或未跟踪文件，不要直接覆盖。

先选一个保留方式：

### 方式 A：临时迁移分支

```bash
git switch -c wip/root-before-phase1-migration-$(date +%Y%m%d)
git add -A
git commit -m "chore: snapshot root before AO phase1 migration"
```

适用：

- 你希望保留完整可追溯快照
- 现场改动已经值得后面人工再筛

### 方式 B：git stash

```bash
git stash push -u -m "root-before-ao-phase1-migration"
```

适用：

- 改动是短期现场残留
- 你只想先把 root 切干净，再决定是否恢复

### 方式 C：外部备份

适合：

- 有大量临时输出
- 你不打算把这些东西继续留在 git 历史里

无论选哪种方式，都要确保下一步前：

```bash
git status --short
```

结果为空，或者你已经明确知道剩余内容是什么。

## 2. 确认或创建稳定 baseline branch

先看本地是否已经存在：

```bash
git branch --list 'baseline/origin-main'
```

如果不存在，推荐从最新 `origin/main` 创建：

```bash
git fetch origin --prune
git switch -c baseline/origin-main --track origin/main
```

如果已经存在，切过去并同步：

```bash
git switch baseline/origin-main
git pull --ff-only
```

目标状态：

- root 当前分支是 `baseline/origin-main`
- `git rev-list --left-right --count origin/main...HEAD` 返回 `0 0`

## 3. 在 root 安装正式 hooks 并验证 workflow 入口

切到稳定 baseline 后，在 repo root 直接执行：

```bash
npm run git:hooks:install
npm run workflow:baseline:sync -- --dry-run
npm run ao:start:clean:dry
```

预期：

- 三个命令都从 repo root 工作
- 输出里不再出现 `.worktrees/baseline-origin-main-20260402`

## 4. 处理历史日期化 baseline 对象

阶段 1 之后，历史日期化 baseline 不再是正式入口，但可以保留为历史证据。

建议策略：

### `baseline/origin-main-20260330`

- 如果只是历史恢复过渡分支，保留一段时间后可转为 archive / retired 命名
- 不再作为默认 root branch

### `baseline/origin-main-20260402`

- 如果还需要用于审计或对照，可保留
- 不再在正式配置、脚本、SOP 里出现

### `.worktrees/baseline-origin-main-20260402`

- 如果还需要对照阶段 1 前后的状态，可暂留
- 如果已无用途，可在确认不再需要后移除：

```bash
git worktree remove /home/samsen/code/ciecopilot-home/.worktrees/baseline-origin-main-20260402
```

注意：

- 先确认没有 session、脚本或人工流程仍引用这个目录
- 先确认需要保留的文档和证据已经在正式路径中可见

## 5. 迁移后验证

至少跑一次下面这组：

```bash
git status --short --branch
git rev-list --left-right --count origin/main...HEAD
npm run workflow:baseline:sync -- --dry-run
npm run ao:start:clean:dry
```

通过标准：

- root 当前分支为 `baseline/origin-main`
- root 与 `origin/main` 分叉为 `0 0`
- workflow / AO 启动输出不再含旧 baseline bridge 路径

## 6. 什么时候不要继续

以下情况先停下，不要继续切 root：

- root 还有你尚未分类的重要脏改动
- `origin/main` 当前状态你还没确认
- 还有活跃 session 明确绑定旧日期化 baseline worktree
- 你准备顺手清理历史 branch / worktree，但还没有分类记录

这类情况先记录，再迁移，不要混做。

## 7. 迁移完成后的日常入口

迁移完成后，日常固定入口只有一个：

```bash
cd /home/samsen/code/ciecopilot-home
```

常用动作：

```bash
npm run git:hooks:install
npm run workflow:baseline:sync
npm run workflow:task:create -- --id <id> --slug <slug>
npm run ao:start:clean
```

不要再默认从 `.worktrees/baseline-*` 启动 AO 或 workflow。
