#!/usr/bin/env bash
set -euo pipefail

CURRENT_WORKTREE_ROOT="$(git rev-parse --show-toplevel)"
GIT_COMMON_DIR="$(git rev-parse --path-format=absolute --git-common-dir)"
SOURCE_HOOKS_DIR="$CURRENT_WORKTREE_ROOT/.githooks"
TARGET_HOOKS_DIR="$GIT_COMMON_DIR/ao-hooks"

if [[ ! -f "$SOURCE_HOOKS_DIR/pre-commit" || ! -f "$SOURCE_HOOKS_DIR/pre-push" ]]; then
  echo "Missing hook source files in current worktree: $SOURCE_HOOKS_DIR" >&2
  exit 1
fi

mkdir -p "$TARGET_HOOKS_DIR"
install -m 0755 "$SOURCE_HOOKS_DIR/pre-commit" "$TARGET_HOOKS_DIR/pre-commit"
install -m 0755 "$SOURCE_HOOKS_DIR/pre-push" "$TARGET_HOOKS_DIR/pre-push"
chmod +x "$CURRENT_WORKTREE_ROOT/scripts/git-hooks/install.sh"
git config core.hooksPath "$TARGET_HOOKS_DIR"

echo "Installed repo git hooks."
echo "hook source: $SOURCE_HOOKS_DIR"
echo "hook target: $TARGET_HOOKS_DIR"
echo "core.hooksPath=$(git config --get core.hooksPath)"
