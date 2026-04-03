# 工程本地防呆 v1.1

这份文档只解决一个问题：在本地先拦住最容易犯、代价也最高的两类误操作。

## v1.1 要拦什么

### 1. 禁止在受保护分支直接 commit

受保护分支包括：

- `main`
- `master`
- `baseline/*`

这条规则在 `pre-commit` 生效。

目的很简单：

- `main` 不再承载本地直接开发
- baseline 只作为干净起点，不作为日常提交分支

### 2. 禁止把内容直接 push 到受保护分支

这条规则在 `pre-push` 生效。

无论你当前在哪个本地分支，只要目标是：

- `refs/heads/main`
- `refs/heads/master`
- `refs/heads/baseline/*`

就直接拦住。

### 3. 任务分支在 worktree 还脏的时候，不允许 push

这条规则也在 `pre-push` 生效。

所谓“脏”，v1.1 按最简单的口径判断：

- 有 staged 变更
- 有 unstaged 变更
- 有未跟踪文件

目的不是追求完美，而是先防住“本地还有一堆没收干净的东西，却已经往远端继续推”的情况。

## 为什么只做到这一步

v1.1 不是要把本地开发变成重流程，而是先把最危险的误操作前置拦截。

这次没有把以下内容一起做重：

- 没有把所有分支策略都写进 hook
- 没有把测试、lint、doctor 全塞进本地 hook
- 没有在 `commit` 阶段就拦普通任务分支的脏工作区

原因很直接：

- 当前最需要防的是“错分支开发”和“脏工作区继续往前推”
- 再往上加，会明显抬高日常操作成本

## 安装方式

在仓库根目录执行：

```bash
cd /home/samsen/code/ciecopilot-home
npm run git:hooks:install
```

这个命令会做两件事：

- 把仓库的 `core.hooksPath` 指到 git common dir 下的共享绝对路径 `ao-hooks`
- 从当前 repo root 同步 `pre-commit` / `pre-push` 到这个共享 hook 目录

## 生效范围

这套 hook 是 **repo 级生效**，不是单 worktree 生效。

也就是说，一旦安装：

- 新 baseline worktree 会生效
- 旧根工作区也会生效
- 后续新建的 task worktree 也会生效

这是 v1.1 的预期行为，因为这套防呆本来就是为了给整个仓库立底线，而不是只保护某一个目录。

## 例外处理

极少数紧急情况可以临时跳过 hook，但不能当日常流程：

```bash
git commit --no-verify
git push --no-verify
```

只有在以下情况才建议这样做：

- hook 本身异常
- 紧急修复必须先救火
- 你明确知道自己在跳过什么

如果用了 `--no-verify`，最低要求是：

- 在 PR 描述或任务记录里写明原因
- 事后尽快回到正常流程

## 当前文件结构

- `.githooks/pre-commit`
- `.githooks/pre-push`
- `scripts/git-hooks/guardrails.js`
- `scripts/git-hooks/install.sh`

这套结构的目的，是把规则集中到仓库里，避免每台机器各自写一套本地脚本。
