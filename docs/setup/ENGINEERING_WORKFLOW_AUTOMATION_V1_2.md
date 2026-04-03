# 工程流程自动化 v1.2

v1.2 的目标很简单：

- 少手敲重复 git 命令
- 少因为目录和分支名写错而返工
- 把 task 创建和 merge 后收口做成统一入口

这次不做新的流程体系，只把 v1 和 v1.1 已经定下来的做法，补成可执行命令。

## 新增命令

### 1. 同步 baseline

```bash
cd /home/samsen/code/ciecopilot-home
npm run workflow:baseline:sync
```

作用：

- 检查本地 hook 是否已安装
- `git fetch origin --prune`
- 对 repo root 当前 baseline 分支执行 `pull --ff-only`

只想预览不执行：

```bash
cd /home/samsen/code/ciecopilot-home
npm run workflow:baseline:sync -- --dry-run
```

### 2. 创建任务 branch + worktree

```bash
cd /home/samsen/code/ciecopilot-home
npm run workflow:task:create -- --id 142 --slug governance-v1
```

默认行为：

- 先检查 hook 是否已安装
- 默认从 `baseline/origin-main` 新建 `task/142-governance-v1`
- 创建 `.worktrees/task-142--governance-v1`

可选参数：

- `--base <ref>`：改用别的基线 ref
- `--dry-run`：只看计划，不实际创建

### 3. 执行任务 closeout

```bash
cd /home/samsen/code/ciecopilot-home
npm run workflow:task:closeout -- --id 142 --slug governance-v1
```

或者：

```bash
cd /home/samsen/code/ciecopilot-home
npm run workflow:task:closeout -- --branch task/142-governance-v1
```

默认行为：

- 先检查 hook 是否已安装
- 打印 closeout plan
- 等待明确确认
- 删除本地 task worktree
- 删除本地 task branch
- 最后同步 baseline

### 4. closeout 的确认方式

默认会要求输入：

```text
closeout
```

只有完全输入这段文字，才会真正执行删除。

只想预览计划：

```bash
cd /home/samsen/code/ciecopilot-home
npm run workflow:task:closeout -- --id 142 --slug governance-v1 --dry-run
```

如果是自动化或非交互场景，可以显式传：

```bash
cd /home/samsen/code/ciecopilot-home
npm run workflow:task:closeout -- --id 142 --slug governance-v1 --confirm closeout
```

## 当前入口说明

阶段 1 收敛后：

- `git:hooks:install` 和 `workflow:*` 命令统一在 repo root 执行
- `npm run ao:start:clean` 也从 repo root 启动，不再依赖 baseline bridge
- 日期化 baseline worktree 只保留为迁移输入或历史证据，不再是正式默认入口

## 这次没有自动化的部分

v1.2 先不做这些：

- 不自动删除远端分支
- 不自动 merge PR
- 不把 AO 门禁包装成一键总控命令
- 不自动清理 `runs/`、截图或历史 artifact

原因：

- 这些动作要么风险更高，要么已经和 AO / GitHub 控制面边界接近
- v1.2 先把“本地开工”和“本地收口”做稳

## 推荐使用顺序

一个任务的推荐节奏现在是：

1. `npm run workflow:baseline:sync`
2. `npm run workflow:task:create -- --id <id> --slug <slug>`
3. 在 task worktree 里开发、验证、提 PR
4. merge 后执行 `npm run workflow:task:closeout -- --id <id> --slug <slug>`

这样能把“基线同步、任务创建、任务收口”三个最容易做乱的动作收成同一套入口。
