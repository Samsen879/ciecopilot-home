# 工程收口清单

PR merge 后，按下面顺序做完再开下一轮任务。

- [ ] 确认 PR 已 merge，必要时记下 PR 号和 merge commit
- [ ] 删除远端任务分支，或确认仓库已自动删除该分支
- [ ] 删除本地任务 worktree
- [ ] 删除本地任务分支
- [ ] 需要长期保留的结论整理进 `docs/reports/`
- [ ] `runs/`、截图、输出文件、`ao-artifacts/`、`ao-task-state.json` 没有混进正式提交
- [ ] baseline worktree 已同步到最新 `origin/main`

常用命令示例：

```bash
cd /home/samsen/code/ciecopilot-home
npm run workflow:task:closeout -- --id <id> --slug <slug>
```

如果这轮任务因为审计或补证必须暂留 worktree，也要先写明原因和后续删除时间，不要默认长期保留。
