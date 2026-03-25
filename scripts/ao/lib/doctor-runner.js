import {
  createDoctorProjectScope,
  createDoctorPrScope,
} from './doctor-contracts.js';
import {
  DEFAULT_PROJECT_ID,
  runReconciliation,
} from './reconciliation-runner.js';
import { loadDoctorLocalState } from './doctor-local-state-source.js';
import { buildDoctorReport } from './doctor-engine.js';

export { DEFAULT_PROJECT_ID };

export async function runDoctor({
  projectId = DEFAULT_PROJECT_ID,
  prNumber = null,
  cwd = process.cwd(),
} = {}) {
  const scope = prNumber != null
    ? createDoctorPrScope({ projectId, prNumber })
    : createDoctorProjectScope({ projectId });

  const { report: reconciliationReport } = await runReconciliation({
    projectId,
    prNumber,
  });
  const localState = await loadDoctorLocalState({ cwd });
  const report = buildDoctorReport({
    scope,
    reconciliationReport,
    localState,
  });

  return {
    scope,
    reconciliationReport,
    localState,
    report,
  };
}
