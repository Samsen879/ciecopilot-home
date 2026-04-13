import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  validateP3RubricTemplateFile,
} from '../marking/contracts/p3-rubric-validator.js';
import {
  FALLBACK_REASON_CODES,
  resolveInlineReleasedScoringPosture,
} from './released-scope-core.js';

const PROJECT_ROOT = path.resolve(fileURLToPath(new URL('../../../../', import.meta.url)));

export const DEFAULT_RELEASED_FAMILY_GATE_CONTRACT_PATH = 'data/learning_runtime/release_evidence/released-family-gate-contract.v1.json';
export const DEFAULT_RELEASED_FAMILY_GATE_RECEIPT_PATH = 'data/learning_runtime/release_evidence/released-family-gate-receipt.v1.json';
export const DEFAULT_RELEASED_FAMILY_GATE_REPORT_PATH = 'docs/reports/learning_runtime_released_family_gate_2026-03-25.md';

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeStringArray(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  return [...new Set(values.map((value) => normalizeString(value)).filter(Boolean))];
}

function normalizeNumber(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeRootDir(rootDir) {
  return normalizeString(rootDir) || PROJECT_ROOT;
}

function resolveFromRoot(rootDir, relPath) {
  return path.join(normalizeRootDir(rootDir), relPath);
}

function readJsonArtifact(rootDir, relPath) {
  return JSON.parse(fs.readFileSync(resolveFromRoot(rootDir, relPath), 'utf8'));
}

function readTextArtifact(rootDir, relPath) {
  return fs.readFileSync(resolveFromRoot(rootDir, relPath), 'utf8');
}

function fileExists(rootDir, relPath) {
  return Boolean(normalizeString(relPath)) && fs.existsSync(resolveFromRoot(rootDir, relPath));
}

function uniquePush(collection, value) {
  const normalized = normalizeString(value);
  if (normalized && !collection.includes(normalized)) {
    collection.push(normalized);
  }
}

function average(values) {
  const numbers = values
    .map((value) => normalizeNumber(value))
    .filter((value) => value !== null);

  if (numbers.length === 0) {
    return null;
  }

  return Number((numbers.reduce((sum, value) => sum + value, 0) / numbers.length).toFixed(4));
}

function toGateStatus(blockedReasons) {
  return blockedReasons.length === 0 ? 'pass' : 'fail';
}

function buildSourceStatus(rootDir, sourceRefs = []) {
  const checkedPaths = normalizeStringArray(sourceRefs);
  const missingPaths = checkedPaths.filter((ref) => !fileExists(rootDir, ref));
  const sourceContents = new Map();

  for (const relPath of checkedPaths) {
    if (missingPaths.includes(relPath)) {
      continue;
    }
    sourceContents.set(relPath, readTextArtifact(rootDir, relPath));
  }

  return {
    checked_paths: checkedPaths,
    missing_paths: missingPaths,
    contents: sourceContents,
  };
}

function sourceContentsContain(sourceStatus, pattern) {
  const normalizedPattern = normalizeString(pattern);
  if (!normalizedPattern) {
    return false;
  }

  return [...sourceStatus.contents.values()].some((content) => content.includes(normalizedPattern));
}

function validateGoldSet(rootDir, family) {
  const releasedQuestionTypeIds = normalizeStringArray(family?.released_question_type_ids);
  const goldSet = family?.gold_set || {};
  const samples = Array.isArray(goldSet.samples) ? goldSet.samples : [];
  const minimumSampleCount = Math.max(0, normalizeNumber(goldSet.minimum_sample_count) ?? 0);
  const minimumAverageConfidence = normalizeNumber(goldSet.minimum_average_confidence) ?? 0;
  const questionTypeCoverage = new Map(
    releasedQuestionTypeIds.map((questionTypeId) => [questionTypeId, 0]),
  );
  const sourceStatus = buildSourceStatus(rootDir, goldSet.source_refs);
  const missingSampleEvidence = [];

  for (const sample of samples) {
    const questionTypeId = normalizeString(sample?.question_type_id);
    const storageKey = normalizeString(sample?.storage_key);
    if (questionTypeCoverage.has(questionTypeId)) {
      questionTypeCoverage.set(questionTypeId, questionTypeCoverage.get(questionTypeId) + 1);
    }
    if (storageKey && !sourceContentsContain(sourceStatus, storageKey)) {
      missingSampleEvidence.push(storageKey);
    }
  }

  const coveredQuestionTypeIds = releasedQuestionTypeIds
    .filter((questionTypeId) => (questionTypeCoverage.get(questionTypeId) || 0) > 0);
  const averageConfidence = average(samples.map((sample) => sample?.classification_confidence));
  const blockedReasons = [];

  if (samples.length < minimumSampleCount) {
    uniquePush(blockedReasons, 'insufficient_gold_set_samples');
  }

  if (averageConfidence === null || averageConfidence < minimumAverageConfidence) {
    uniquePush(blockedReasons, 'gold_set_confidence_below_threshold');
  }

  if (coveredQuestionTypeIds.length !== releasedQuestionTypeIds.length) {
    uniquePush(blockedReasons, 'gold_set_question_type_coverage_missing');
  }

  if (sourceStatus.missing_paths.length > 0) {
    uniquePush(blockedReasons, 'gold_set_source_missing');
  }

  if (missingSampleEvidence.length > 0) {
    uniquePush(blockedReasons, 'gold_set_sample_not_found');
  }

  return {
    status: toGateStatus(blockedReasons),
    blocked_reasons: blockedReasons,
    sample_count: samples.length,
    average_confidence: averageConfidence,
    minimum_sample_count: minimumSampleCount,
    minimum_average_confidence: minimumAverageConfidence,
    covered_question_type_ids: coveredQuestionTypeIds,
    source_refs: sourceStatus.checked_paths,
    missing_source_refs: sourceStatus.missing_paths,
    missing_sample_evidence: missingSampleEvidence,
    question_type_results: releasedQuestionTypeIds.map((questionTypeId) => ({
      question_type_id: questionTypeId,
      status: (questionTypeCoverage.get(questionTypeId) || 0) > 0 ? 'pass' : 'fail',
      blocked_reasons: (questionTypeCoverage.get(questionTypeId) || 0) > 0
        ? []
        : ['gold_set_question_type_coverage_missing'],
    })),
  };
}

function validateRubricCoverage(rootDir, family) {
  const releasedQuestionTypeIds = normalizeStringArray(family?.released_question_type_ids);
  const rubricCoverage = family?.rubric_coverage || {};
  const entries = Array.isArray(rubricCoverage.entries) ? rubricCoverage.entries : [];
  const sourceStatus = buildSourceStatus(rootDir, rubricCoverage.source_refs);
  const entryMap = new Map(
    entries.map((entry) => [normalizeString(entry?.question_type_id), entry]),
  );
  const coveredQuestionTypeIds = [];
  const blockedReasons = [];

  const questionTypeResults = releasedQuestionTypeIds.map((questionTypeId) => {
    const entry = entryMap.get(questionTypeId) || null;
    const templatePaths = normalizeStringArray(entry?.rubric_template_paths);
    const templateResults = templatePaths.map((relPath) => {
      if (!fileExists(rootDir, relPath)) {
        return {
          relPath,
          ok: false,
          missing: true,
          errors: ['rubric_template_missing'],
        };
      }

      const validation = validateP3RubricTemplateFile(resolveFromRoot(rootDir, relPath));
      return {
        relPath,
        ok: validation.ok,
        missing: false,
        errors: validation.errors,
        template: validation.template,
      };
    });
    const matchingReleasedTemplates = templateResults.filter((result) =>
      result.ok
      && result.template?.question_type_id === questionTypeId
      && result.template?.release_state === 'released');

    if (matchingReleasedTemplates.length > 0) {
      coveredQuestionTypeIds.push(questionTypeId);
      return {
        question_type_id: questionTypeId,
        status: 'pass',
        blocked_reasons: [],
      };
    }

    const questionTypeBlockedReasons = [];
    if (templatePaths.length === 0) {
      uniquePush(questionTypeBlockedReasons, 'rubric_template_path_missing');
    }
    if (templateResults.some((result) => result.missing)) {
      uniquePush(questionTypeBlockedReasons, 'rubric_template_missing');
    }
    if (templateResults.some((result) => !result.missing && !result.ok)) {
      uniquePush(questionTypeBlockedReasons, 'rubric_template_invalid');
    }
    if (
      templateResults.some((result) =>
        result.ok && result.template?.question_type_id !== questionTypeId)
    ) {
      uniquePush(questionTypeBlockedReasons, 'rubric_template_question_type_mismatch');
    }

    return {
      question_type_id: questionTypeId,
      status: 'fail',
      blocked_reasons: questionTypeBlockedReasons,
    };
  });

  if (coveredQuestionTypeIds.length !== releasedQuestionTypeIds.length) {
    uniquePush(blockedReasons, 'rubric_coverage_missing_question_type');
  }

  if (sourceStatus.missing_paths.length > 0) {
    uniquePush(blockedReasons, 'rubric_coverage_source_missing');
  }

  return {
    status: toGateStatus(blockedReasons),
    blocked_reasons: blockedReasons,
    covered_question_type_ids: coveredQuestionTypeIds,
    source_refs: sourceStatus.checked_paths,
    missing_source_refs: sourceStatus.missing_paths,
    question_type_results: questionTypeResults,
  };
}

function matchesExpectedPosture(actual, expected = {}) {
  const entries = Object.entries(expected);
  if (entries.length === 0) {
    return false;
  }

  return entries.every(([key, value]) => actual?.[key] === value);
}

function validateUncertaintyValidation(rootDir, family) {
  const releasedQuestionTypeIds = normalizeStringArray(family?.released_question_type_ids);
  const uncertaintyValidation = family?.uncertainty_validation || {};
  const cases = Array.isArray(uncertaintyValidation.cases) ? uncertaintyValidation.cases : [];
  const sourceStatus = buildSourceStatus(rootDir, uncertaintyValidation.source_refs);
  const passCoverage = new Set();
  const failClosedCoverage = new Set();
  const mismatchedCases = [];
  const missingCaseEvidence = [];

  for (const validationCase of cases) {
    const actual = resolveInlineReleasedScoringPosture({
      questionTypeId: validationCase?.question_type_id,
      questionTypeReleaseState: validationCase?.question_type_release_state ?? 'released',
      candidateRubricRefs: validationCase?.candidate_rubric_refs ?? [],
      uncertaintyValidated: validationCase?.uncertainty_validated ?? false,
      uncertaintyPosture: validationCase?.uncertainty_posture ?? null,
      classificationConfidence: validationCase?.classification_confidence ?? null,
    });
    const expected = validationCase?.expected || {};
    const questionTypeId = normalizeString(validationCase?.question_type_id);
    const caseId = normalizeString(validationCase?.case_id) || 'unknown_case';

    if (!sourceContentsContain(sourceStatus, questionTypeId)) {
      missingCaseEvidence.push(caseId);
    }

    if (!matchesExpectedPosture(actual, expected)) {
      mismatchedCases.push({
        case_id: caseId,
        question_type_id: questionTypeId || null,
      });
      continue;
    }

    if (expected.authoritative_scoring_allowed === true) {
      passCoverage.add(questionTypeId);
    }

    if (
      expected.authoritative_scoring_allowed === false
      && expected.fallback_reason_code === FALLBACK_REASON_CODES.UNVALIDATED_UNCERTAINTY_POSTURE
    ) {
      failClosedCoverage.add(questionTypeId);
    }
  }

  const blockedReasons = [];
  if (mismatchedCases.length > 0) {
    uniquePush(blockedReasons, 'uncertainty_validation_case_mismatch');
  }

  if (releasedQuestionTypeIds.some((questionTypeId) => !passCoverage.has(questionTypeId))) {
    uniquePush(blockedReasons, 'uncertainty_validation_pass_coverage_missing');
  }

  if (releasedQuestionTypeIds.some((questionTypeId) => !failClosedCoverage.has(questionTypeId))) {
    uniquePush(blockedReasons, 'uncertainty_validation_fail_closed_missing');
  }

  if (sourceStatus.missing_paths.length > 0) {
    uniquePush(blockedReasons, 'uncertainty_validation_source_missing');
  }

  if (missingCaseEvidence.length > 0) {
    uniquePush(blockedReasons, 'uncertainty_validation_evidence_missing');
  }

  return {
    status: toGateStatus(blockedReasons),
    blocked_reasons: blockedReasons,
    case_count: cases.length,
    matched_case_count: cases.length - mismatchedCases.length,
    mismatched_cases: mismatchedCases,
    pass_question_type_ids: [...passCoverage],
    fail_closed_question_type_ids: [...failClosedCoverage],
    source_refs: sourceStatus.checked_paths,
    missing_source_refs: sourceStatus.missing_paths,
    missing_case_evidence: missingCaseEvidence,
    question_type_results: releasedQuestionTypeIds.map((questionTypeId) => {
      const gateBlockedReasons = [];
      if (!passCoverage.has(questionTypeId)) {
        gateBlockedReasons.push('uncertainty_validation_pass_coverage_missing');
      }
      if (!failClosedCoverage.has(questionTypeId)) {
        gateBlockedReasons.push('uncertainty_validation_fail_closed_missing');
      }
      if (missingCaseEvidence.length > 0) {
        gateBlockedReasons.push('uncertainty_validation_evidence_missing');
      }

      return {
        question_type_id: questionTypeId,
        status: gateBlockedReasons.length === 0 ? 'pass' : 'fail',
        blocked_reasons: gateBlockedReasons,
      };
    }),
  };
}

function combineQuestionTypeResults(releasedQuestionTypeIds, gateResults = {}) {
  return releasedQuestionTypeIds.map((questionTypeId) => {
    const blockedReasons = [];
    const gates = {};

    for (const [gateName, result] of Object.entries(gateResults)) {
      const questionTypeResult = Array.isArray(result?.question_type_results)
        ? result.question_type_results.find((entry) => entry.question_type_id === questionTypeId)
        : null;

      gates[gateName] = questionTypeResult?.status ?? 'fail';

      for (const reason of questionTypeResult?.blocked_reasons || []) {
        uniquePush(blockedReasons, reason);
      }
    }

    return {
      question_type_id: questionTypeId,
      status: blockedReasons.length === 0 ? 'pass' : 'fail',
      blocked_reasons: blockedReasons,
      gates,
    };
  });
}

function buildFamilyGateResult(rootDir, family) {
  const releasedQuestionTypeIds = normalizeStringArray(family?.released_question_type_ids);
  const goldSet = validateGoldSet(rootDir, family);
  const rubricCoverage = validateRubricCoverage(rootDir, family);
  const uncertaintyValidation = validateUncertaintyValidation(rootDir, family);
  const blockedReasons = [];

  for (const gateResult of [goldSet, rubricCoverage, uncertaintyValidation]) {
    for (const reason of gateResult.blocked_reasons) {
      uniquePush(blockedReasons, reason);
    }
  }

  return {
    family_id: normalizeString(family?.family_id) || null,
    subject_code: normalizeString(family?.subject_code) || null,
    title: normalizeString(family?.title) || null,
    release_state: normalizeString(family?.release_state) || null,
    released_question_type_ids: releasedQuestionTypeIds,
    status: toGateStatus(blockedReasons),
    blocked_reasons: blockedReasons,
    gates: {
      gold_set: goldSet,
      rubric_coverage: rubricCoverage,
      uncertainty_validation: uncertaintyValidation,
    },
    question_type_results: combineQuestionTypeResults(releasedQuestionTypeIds, {
      gold_set: goldSet,
      rubric_coverage: rubricCoverage,
      uncertainty_validation: uncertaintyValidation,
    }),
  };
}

export function loadReleasedFamilyGateContract({
  rootDir = PROJECT_ROOT,
  contractPath = DEFAULT_RELEASED_FAMILY_GATE_CONTRACT_PATH,
} = {}) {
  return readJsonArtifact(rootDir, contractPath);
}

export function buildReleasedFamilyGateReceipt({
  rootDir = PROJECT_ROOT,
  contractPath = DEFAULT_RELEASED_FAMILY_GATE_CONTRACT_PATH,
  contract = null,
  generatedAt = new Date().toISOString(),
} = {}) {
  const resolvedRoot = normalizeRootDir(rootDir);
  const loadedContract = contract || loadReleasedFamilyGateContract({
    rootDir: resolvedRoot,
    contractPath,
  });
  const families = Array.isArray(loadedContract?.families) ? loadedContract.families : [];
  const familyResults = families.map((family) => buildFamilyGateResult(resolvedRoot, family));
  const questionTypeResults = familyResults.flatMap((family) =>
    (family.question_type_results || []).map((entry) => ({
      family_id: family.family_id,
      question_type_id: entry.question_type_id,
      status: entry.status,
      blocked_reasons: entry.blocked_reasons,
      gates: entry.gates,
    })));

  return {
    schema_version: 'learning_runtime_released_family_gate_receipt_v1',
    generated_at: generatedAt,
    contract_path: contractPath,
    status: familyResults.every((family) => family.status === 'pass') ? 'pass' : 'fail',
    release_ready: familyResults.every((family) => family.status === 'pass'),
    family_results: familyResults,
    question_type_results: questionTypeResults,
  };
}

export function loadReleasedFamilyGateReceipt({
  rootDir = PROJECT_ROOT,
  receiptPath = DEFAULT_RELEASED_FAMILY_GATE_RECEIPT_PATH,
} = {}) {
  return readJsonArtifact(rootDir, receiptPath);
}

export function evaluateReleasedFamilyEvidenceGate(questionTypeId, {
  receipt = null,
  rootDir = PROJECT_ROOT,
  receiptPath = DEFAULT_RELEASED_FAMILY_GATE_RECEIPT_PATH,
} = {}) {
  const normalizedQuestionTypeId = normalizeString(questionTypeId);
  if (!normalizedQuestionTypeId) {
    return {
      ok: false,
      blocked_reasons: [FALLBACK_REASON_CODES.MISSING_RELEASED_FAMILY_EVIDENCE],
      question_type_result: null,
    };
  }

  let resolvedReceipt = receipt;
  if (!resolvedReceipt) {
    try {
      resolvedReceipt = loadReleasedFamilyGateReceipt({
        rootDir,
        receiptPath,
      });
    } catch {
      return {
        ok: false,
        blocked_reasons: [FALLBACK_REASON_CODES.MISSING_RELEASED_FAMILY_EVIDENCE],
        question_type_result: null,
      };
    }
  }

  const questionTypeResult = Array.isArray(resolvedReceipt?.question_type_results)
    ? resolvedReceipt.question_type_results.find((entry) => entry.question_type_id === normalizedQuestionTypeId)
    : null;

  if (!questionTypeResult || questionTypeResult.status !== 'pass') {
    return {
      ok: false,
      blocked_reasons: [
        FALLBACK_REASON_CODES.MISSING_RELEASED_FAMILY_EVIDENCE,
        ...normalizeStringArray(questionTypeResult?.blocked_reasons),
      ],
      question_type_result: questionTypeResult || null,
    };
  }

  return {
    ok: true,
    blocked_reasons: [],
    question_type_result: questionTypeResult,
  };
}

export function renderReleasedFamilyGateReport(receipt = {}) {
  const lines = [
    '# Learning Runtime Released Family Gate',
    '',
    `- status: \`${receipt.status || 'unknown'}\``,
    `- release_ready: \`${Boolean(receipt.release_ready)}\``,
    `- generated_at: \`${receipt.generated_at || 'unknown'}\``,
    `- contract_path: \`${receipt.contract_path || DEFAULT_RELEASED_FAMILY_GATE_CONTRACT_PATH}\``,
    '',
  ];

  for (const family of receipt.family_results || []) {
    lines.push(`## ${family.family_id || 'unknown_family'}`, '');
    lines.push(`- status: \`${family.status}\``);
    lines.push(`- released_question_type_ids: \`${JSON.stringify(family.released_question_type_ids || [])}\``);
    lines.push(`- blocked_reasons: \`${JSON.stringify(family.blocked_reasons || [])}\``);
    lines.push(`- gold_set: \`${family.gates?.gold_set?.status || 'unknown'}\``);
    lines.push(`- rubric_coverage: \`${family.gates?.rubric_coverage?.status || 'unknown'}\``);
    lines.push(`- uncertainty_validation: \`${family.gates?.uncertainty_validation?.status || 'unknown'}\``);
    lines.push(`- gold_set_sample_count: \`${family.gates?.gold_set?.sample_count ?? 0}\``);
    lines.push(`- gold_set_average_confidence: \`${family.gates?.gold_set?.average_confidence ?? 'n/a'}\``);
    lines.push(`- uncertainty_case_count: \`${family.gates?.uncertainty_validation?.case_count ?? 0}\``);
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}

export function writeReleasedFamilyGateOutputs({
  rootDir = PROJECT_ROOT,
  contractPath = DEFAULT_RELEASED_FAMILY_GATE_CONTRACT_PATH,
  outJsonPath = DEFAULT_RELEASED_FAMILY_GATE_RECEIPT_PATH,
  outMdPath = DEFAULT_RELEASED_FAMILY_GATE_REPORT_PATH,
  generatedAt = new Date().toISOString(),
} = {}) {
  const resolvedRoot = normalizeRootDir(rootDir);
  const receipt = buildReleasedFamilyGateReceipt({
    rootDir: resolvedRoot,
    contractPath,
    generatedAt,
  });
  const outJsonAbsPath = resolveFromRoot(resolvedRoot, outJsonPath);
  const outMdAbsPath = resolveFromRoot(resolvedRoot, outMdPath);

  fs.mkdirSync(path.dirname(outJsonAbsPath), { recursive: true });
  fs.mkdirSync(path.dirname(outMdAbsPath), { recursive: true });
  fs.writeFileSync(outJsonAbsPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
  fs.writeFileSync(outMdAbsPath, renderReleasedFamilyGateReport(receipt), 'utf8');

  return {
    receipt,
    out_json_path: outJsonPath,
    out_md_path: outMdPath,
  };
}
