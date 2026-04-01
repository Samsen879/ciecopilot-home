# AO Policy Governance Runbook

This runbook defines the operator-facing governance surface for AO policy v2 in `ciecopilot-home`.

## Purpose

Governance v2 unifies four policy inputs into one inspectable AO contract:

- tool allowlist
- MCP allowlist
- repo-knowledge risk and command surfaces
- credential provenance records

The intent is not host-project business logic. This surface exists only to explain AO runtime and repo-automation policy decisions.

## Primary Commands

Inspect the unified governance report:

```bash
node scripts/ao-policy.js
```

Inspect the machine-readable governance contract:

```bash
node scripts/ao-policy.js --json
```

Inspect the repo-knowledge slice that feeds governance:

```bash
node scripts/ao-knowledge.js
node scripts/ao-knowledge.js --json
```

Inspect the broader AO state summary, including governance counts:

```bash
node scripts/ao-state.js
node scripts/ao-state.js --json
```

## What The Governance Report Shows

- allowlisted tools and their stable governance refs
- allowlisted MCP servers and their stable governance refs
- current credential provenance records and whether they are trusted
- repo-knowledge command refs and risky-surface refs
- operator findings for:
  - unknown tools
  - unknown MCP servers
  - credential provenance gaps or mismatches
  - repo-knowledge drift
  - mixed-version policy state
  - missing governance refs on persisted policy decisions

## Stable Governance Refs

Typical refs emitted by policy decisions and reports:

- `policy.tool.gh@ao.policy.v2`
- `policy.mcp.github@ao.policy.v2`
- `policy.credential_source.github_token@ao.policy.v2`
- `credential_provenance.cred-gh-cli`
- `repo_knowledge.ciecopilot-home@1`
- `repo_knowledge.ciecopilot-home.command.verify.test_run_in_band@1`
- `repo_knowledge.ciecopilot-home.risky_surface.workflow.github_workflows@1`

Policy decisions store these refs so operators can see which governance object allowed, denied, or downgraded an action.

## Status Meanings

- `current`: governance inputs are version-aligned and no operator findings are open
- `attention`: governance is current, but prior policy decisions recorded unknown tools, unknown MCP servers, provenance gaps, or repo drift
- `stale`: repo-knowledge state is older than the current contract version
- `mixed_version`: persisted governance or repo-knowledge state spans incompatible versions
- `fail_closed`: required governance inputs are missing or persisted decisions are missing governance refs

## Operator Response

If governance reports `stale`, `mixed_version`, or `fail_closed`:

1. Refresh repo knowledge with `node scripts/ao-policy.js` or `node scripts/ao-knowledge.js`.
2. Inspect `--json` output to find the missing ref or mismatched version.
3. Resolve repo-knowledge drift or provenance gaps before trusting autonomous execution.

## Verification

Run:

```bash
node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand --runTestsByPath tests/ao/policy-engine.test.js tests/ao/repo-knowledge.test.js tests/ao/repo-knowledge-lint.test.js tests/ao/runtime-preflight.test.js tests/ao/ao-state-cli.test.js
```
