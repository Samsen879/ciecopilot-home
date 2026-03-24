import {
  createPrScope,
  createProjectScope,
} from './reconciliation-contracts.js';
import { loadAoProjectObservation } from './ao-observation-source.js';
import { loadGitHubObservationSet } from './github-observation-source.js';
import { reconcileObservations } from './reconciliation-engine.js';

export const DEFAULT_PROJECT_ID = 'ciecopilot-home';

export function buildProjectScopeFromAoObservation(aoObservation) {
  const prNumbers = [...new Set((aoObservation?.workers ?? [])
    .map((worker) => worker.pr_number)
    .filter((value) => Number.isInteger(value)))]
    .sort((left, right) => left - right);
  const branchNames = [...new Set((aoObservation?.workers ?? [])
    .map((worker) => worker.branch_name)
    .filter((value) => typeof value === 'string' && value.trim() !== ''))]
    .sort((left, right) => left.localeCompare(right));
  const selectionBasis = [];

  if (prNumbers.length) selectionBasis.push('ao_session_pr_reference');
  if (branchNames.length) selectionBasis.push('ao_session_branch_match');

  return createProjectScope({
    prNumbers,
    selectionBasis,
    notes: branchNames.map((branchName) => `branch:${branchName}`),
  });
}

export async function runReconciliation({
  projectId = DEFAULT_PROJECT_ID,
  prNumber = null,
} = {}) {
  const aoObservation = await loadAoProjectObservation({
    projectId,
  });
  const scope = prNumber != null
    ? createPrScope(prNumber)
    : buildProjectScopeFromAoObservation(aoObservation);
  const githubObservation = await loadGitHubObservationSet({ scope });
  const report = reconcileObservations({
    scope,
    aoObservation,
    githubObservation,
  });

  return {
    scope,
    aoObservation,
    githubObservation,
    report,
  };
}
