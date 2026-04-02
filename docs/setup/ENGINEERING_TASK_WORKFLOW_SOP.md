# 工程任务 SOP

这份 SOP 只回答一件事：一个新任务从哪里开始，怎么走到 merge，再怎么收口。

## 1. 从干净 baseline 起步

当前默认基线：

- worktree：`/home/samsen/code/ciecopilot-home/.worktrees/baseline-origin-main-20260402`
- branch：`baseline/origin-main-20260402`

先确认 baseline 是干净的，再开新任务。

仓库第一次启用本地防呆时，先在根目录执行一次：

```bash
cd /home/samsen/code/ciecopilot-home/.worktrees/baseline-origin-main-20260402
npm run git:hooks:install
```

日常同步 baseline，优先使用：

```bash
cd /home/samsen/code/ciecopilot-home/.worktrees/baseline-origin-main-20260402
npm run workflow:baseline:sync
```

## 2. 为任务新建 branch + worktree

默认命名：

- branch：`task/<id>-<slug>`
- worktree：`.worktrees/task-<id>--<slug>`

示例：

```bash
cd /home/samsen/code/ciecopilot-home/.worktrees/baseline-origin-main-20260402
npm run workflow:task:create -- --id 142 --slug governance-v1
```

没有 issue 编号时，可以先用日期或短主题代替 `<id>`。

## 3. 写 very short brief

最低写三行就够：

- 目标：这次要解决什么
- 完成标准：什么算完成
- 非目标：这次明确不做什么

小任务可以直接写在 issue、PR 描述或任务记录里，不强制单独开长文档。

## 4. 在 task worktree 中开发和验证

执行原则：

- 只在当前 task worktree 里改动
- 临时证据放 `runs/`
- 结论性文档放 `docs/reports/`
- 截图和大文件默认不进 git

## 5. 提 PR 前跑最低门禁

至少做两类检查：

- 本轮相关测试或构建
- AO 门禁

推荐命令：

```bash
npm test -- --runInBand
npm run ao:reconcile:strict:pr -- <pr号>
npm run ao:doctor:strict:pr -- <pr号>
npm run ao:lifecycle:strict:pr -- <pr号> --trigger approved_and_green
```

使用说明：

- `ao:reconcile` 是固定门禁
- `ao:doctor` 在目录脏、分支不清、连续性可疑时补跑
- `ao:lifecycle` 用来判断现在该继续自动推进，还是该交给人

## 6. PR 通过后，由人决定 merge

规则只有两条：

- AI 可以把 PR 推到“可审状态”
- 最终 merge 由人执行

## 7. merge 后立即收口

直接执行：

- [ENGINEERING_CLOSEOUT_CHECKLIST.md](/home/samsen/code/ciecopilot-home/.worktrees/baseline-origin-main-20260402/docs/setup/ENGINEERING_CLOSEOUT_CHECKLIST.md)
- [ENGINEERING_WORKFLOW_AUTOMATION_V1_2.md](/home/samsen/code/ciecopilot-home/.worktrees/baseline-origin-main-20260402/docs/setup/ENGINEERING_WORKFLOW_AUTOMATION_V1_2.md)

不要把 merge 当作任务结束。收口做完，下一轮任务才真正有干净起点。
