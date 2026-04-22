describe('windows host node path resolution', () => {
  let buildWindowsHostNodeModulesCandidates;
  let buildWindowsHostRepoRootCandidates;
  let findWindowsHostRepoRoot;
  let findWindowsHostNodeModulesPath;

  beforeAll(async () => {
    ({
      buildWindowsHostNodeModulesCandidates,
      buildWindowsHostRepoRootCandidates,
      findWindowsHostRepoRoot,
      findWindowsHostNodeModulesPath,
    } = await import('../lib/windows-host-node-path.js'));
  });

  test('prefers the root checkout node_modules for a WSL worktree UNC path when the worktree path is not usable', () => {
    const repoRoot = String.raw`\\wsl$\Ubuntu\home\samsen\.worktrees\ciecopilot-home\cie-208`;

    expect(buildWindowsHostNodeModulesCandidates(repoRoot)).toEqual([
      String.raw`\\wsl$\Ubuntu\home\samsen\.worktrees\ciecopilot-home\cie-208\node_modules`,
      String.raw`\\wsl$\Ubuntu\home\samsen\code\ciecopilot-home\node_modules`,
    ]);
    expect(buildWindowsHostRepoRootCandidates(repoRoot)).toEqual([
      String.raw`\\wsl$\Ubuntu\home\samsen\.worktrees\ciecopilot-home\cie-208`,
      String.raw`\\wsl$\Ubuntu\home\samsen\code\ciecopilot-home`,
    ]);

    const selected = findWindowsHostNodeModulesPath(
      repoRoot,
      (candidate) => candidate === String.raw`\\wsl$\Ubuntu\home\samsen\code\ciecopilot-home\node_modules`,
    );

    expect(selected).toBe(String.raw`\\wsl$\Ubuntu\home\samsen\code\ciecopilot-home\node_modules`);
  });

  test('uses repo-local node_modules first for a non-worktree checkout', () => {
    const repoRoot = String.raw`\\wsl.localhost\Ubuntu\home\samsen\code\ciecopilot-home`;
    const selected = findWindowsHostNodeModulesPath(
      repoRoot,
      (candidate) => candidate === String.raw`\\wsl.localhost\Ubuntu\home\samsen\code\ciecopilot-home\node_modules`,
    );

    expect(selected).toBe(String.raw`\\wsl.localhost\Ubuntu\home\samsen\code\ciecopilot-home\node_modules`);
  });

  test('prefers the root checkout repo for host script execution when the worktree is under .worktrees', () => {
    const repoRoot = String.raw`\\wsl.localhost\Ubuntu\home\samsen\.worktrees\ciecopilot-home\cie-208`;
    const selected = findWindowsHostRepoRoot(
      repoRoot,
      (candidate) => [
        String.raw`\\wsl.localhost\Ubuntu\home\samsen\.worktrees\ciecopilot-home\cie-208\package.json`,
        String.raw`\\wsl.localhost\Ubuntu\home\samsen\code\ciecopilot-home\package.json`,
      ].includes(candidate),
    );

    expect(selected).toBe(String.raw`\\wsl.localhost\Ubuntu\home\samsen\code\ciecopilot-home`);
  });

  test('strips the PowerShell FileSystem provider prefix before deriving fallback candidates', () => {
    const repoRoot = String.raw`Microsoft.PowerShell.Core\FileSystem::\\wsl$\Ubuntu\home\samsen\.worktrees\ciecopilot-home\cie-208`;

    expect(buildWindowsHostRepoRootCandidates(repoRoot)).toEqual([
      String.raw`\\wsl$\Ubuntu\home\samsen\.worktrees\ciecopilot-home\cie-208`,
      String.raw`\\wsl$\Ubuntu\home\samsen\code\ciecopilot-home`,
    ]);
  });
});
