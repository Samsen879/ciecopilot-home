#!/usr/bin/env bash

set -euo pipefail

project="ciecopilot-home"
orchestrator_session="${AO_ORCHESTRATOR_SESSION:-cie-orchestrator}"
dry_run=0
dashboard_flag="--no-dashboard"

usage() {
  cat <<'EOF'
Usage: bash scripts/ao/start-clean.sh [options]

Options:
  --project <project>         AO project id. Default: ciecopilot-home
  --orchestrator <session>    Orchestrator session name. Default: cie-orchestrator
  --with-dashboard            Start AO with dashboard enabled
  --dry-run                   Print commands without executing them
  -h, --help                  Show this help message
EOF
}

run_cmd() {
  printf '+'
  for arg in "$@"; do
    printf ' %q' "$arg"
  done
  printf '\n'

  if [[ "$dry_run" -eq 0 ]]; then
    "$@"
  fi
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project)
      shift
      project="${1:?missing value for --project}"
      ;;
    --orchestrator)
      shift
      orchestrator_session="${1:?missing value for --orchestrator}"
      ;;
    --with-dashboard)
      dashboard_flag=""
      ;;
    --dry-run)
      dry_run=1
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
  shift
done

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

printf '+ ao stop %q --purge-session || true\n' "$project"
if [[ "$dry_run" -eq 0 ]]; then
  ao stop "$project" --purge-session || true
fi

if [[ "$dry_run" -eq 0 ]]; then
  echo "+ ao doctor --fix"
  if ! ao doctor --fix; then
    echo "+ ao update"
    ao update
    echo "+ ao doctor"
    ao doctor
  fi
else
  echo "+ ao doctor --fix"
  echo "+ ao update    # fallback if doctor --fix fails"
  echo "+ ao doctor    # re-check after update"
fi

if [[ -n "$dashboard_flag" ]]; then
  run_cmd ao start "$project" "$dashboard_flag"
else
  run_cmd ao start "$project"
fi

run_cmd ao send "$orchestrator_session" --no-wait \
  "Reconcile live GitHub PR, CI, and review state for this project and continue the execution chain without waiting for human input."
run_cmd ao status -p "$project"
