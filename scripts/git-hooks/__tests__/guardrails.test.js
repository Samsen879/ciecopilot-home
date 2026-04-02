import {
  evaluatePreCommitGuardrail,
  evaluatePrePushGuardrail,
  isProtectedBranchName,
  isProtectedRemoteRef,
  parsePrePushStdin,
} from '../guardrails.js';

describe('git hook guardrails', () => {
  test('treats main, master, and baseline branches as protected', () => {
    expect(isProtectedBranchName('main')).toBe(true);
    expect(isProtectedBranchName('master')).toBe(true);
    expect(isProtectedBranchName('baseline/origin-main-20260402')).toBe(true);
    expect(isProtectedBranchName('task/142-governance-v1')).toBe(false);
  });

  test('treats protected remote refs as protected push targets', () => {
    expect(isProtectedRemoteRef('refs/heads/main')).toBe(true);
    expect(isProtectedRemoteRef('refs/heads/master')).toBe(true);
    expect(isProtectedRemoteRef('refs/heads/baseline/origin-main-20260402')).toBe(true);
    expect(isProtectedRemoteRef('refs/heads/task/142-governance-v1')).toBe(false);
  });

  test('pre-commit blocks direct commits on protected branches', () => {
    const result = evaluatePreCommitGuardrail({
      currentBranch: 'baseline/origin-main-20260402',
    });

    expect(result.ok).toBe(false);
    expect(result.code).toBe('protected_branch_commit_blocked');
  });

  test('pre-commit allows commits on task branches', () => {
    const result = evaluatePreCommitGuardrail({
      currentBranch: 'task/142-governance-v1',
    });

    expect(result.ok).toBe(true);
  });

  test('parses pre-push stdin lines into push updates', () => {
    const updates = parsePrePushStdin([
      'refs/heads/task/142-governance-v1 abc123 refs/heads/main def456',
      'refs/heads/task/142-governance-v1 abc123 refs/heads/task/142-governance-v1 0000000',
    ].join('\n'));

    expect(updates).toEqual([
      {
        localRef: 'refs/heads/task/142-governance-v1',
        localSha: 'abc123',
        remoteRef: 'refs/heads/main',
        remoteSha: 'def456',
      },
      {
        localRef: 'refs/heads/task/142-governance-v1',
        localSha: 'abc123',
        remoteRef: 'refs/heads/task/142-governance-v1',
        remoteSha: '0000000',
      },
    ]);
  });

  test('pre-push blocks pushes to protected branches', () => {
    const result = evaluatePrePushGuardrail({
      currentBranch: 'task/142-governance-v1',
      worktreeDirty: false,
      pushUpdates: [
        {
          localRef: 'refs/heads/task/142-governance-v1',
          localSha: 'abc123',
          remoteRef: 'refs/heads/main',
          remoteSha: 'def456',
        },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.code).toBe('protected_branch_push_blocked');
  });

  test('pre-push blocks dirty task branches', () => {
    const result = evaluatePrePushGuardrail({
      currentBranch: 'task/142-governance-v1',
      worktreeDirty: true,
      pushUpdates: [
        {
          localRef: 'refs/heads/task/142-governance-v1',
          localSha: 'abc123',
          remoteRef: 'refs/heads/task/142-governance-v1',
          remoteSha: 'def456',
        },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.code).toBe('dirty_worktree_push_blocked');
  });

  test('pre-push allows clean task branches to push task refs', () => {
    const result = evaluatePrePushGuardrail({
      currentBranch: 'task/142-governance-v1',
      worktreeDirty: false,
      pushUpdates: [
        {
          localRef: 'refs/heads/task/142-governance-v1',
          localSha: 'abc123',
          remoteRef: 'refs/heads/task/142-governance-v1',
          remoteSha: 'def456',
        },
      ],
    });

    expect(result.ok).toBe(true);
  });
});
