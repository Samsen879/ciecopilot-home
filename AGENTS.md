## Agent Orchestrator (ao) Session

You are running inside an Agent Orchestrator managed workspace.
Session metadata is updated automatically via shell wrappers.

If automatic updates fail, you can manually update metadata:
```bash
~/.ao/bin/ao-metadata-helper.sh  # sourced automatically
# Then call: update_ao_metadata <key> <value>
```

## GitHub Workflow

For GitHub operations such as checking pull requests, creating pull requests,
reviewing mergeability, and merging pull requests, prefer GitHub MCP tools over
the local `gh` CLI when the MCP tools can handle the task.

Do not ask the user to repeat this preference in new conversations.

Use the local `gh` CLI only when MCP is unavailable, lacks the required
operation, or the user explicitly asks to use `gh`.

## Workflow Mode Selection

Default workflow mode is `formal`.

Use `light-direct-minimal` only when all touched files stay inside
`docs/reports/**` and the change is only a report, retrospective, status note,
or other conclusion doc that does not alter governance, runbooks, automation,
or default behavior.

If anything is unclear, or if any touched file falls outside `docs/reports/**`,
upgrade to `formal`.

For `formal`, start from the clean baseline worktree, create a task worktree,
and use a PR.

For `light-direct-minimal`, start from the clean baseline worktree, run
`npm run workflow:baseline:sync`, keep changes inside `docs/reports/**`, and do
not bypass git hooks if they block the direct path.

When running under AO-managed worker flow, stay on `formal` by default and do
not treat `light-direct-minimal` as autonomous direct-main authority.
