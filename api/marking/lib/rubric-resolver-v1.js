// api/marking/lib/rubric-resolver-v1.js
// Rubric Resolver v1 — version selection + ready data fetch.
// Implements design §2.2 (version selection on base table) and §5.3 (SQL).

// ── Custom error classes ────────────────────────────────────────────────────

export class RubricNotReadyError extends Error {
  constructor(message = 'No ready rubric found for the given scope.') {
    super(message);
    this.name = 'RubricNotReadyError';
    this.statusCode = 409;
    this.code = 'rubric_not_ready';
  }
}

export class RubricContractInvalidError extends Error {
  constructor(message = 'Rubric points missing required contract fields.', details = []) {
    super(message);
    this.name = 'RubricContractInvalidError';
    this.statusCode = 422;
    this.code = 'rubric_contract_invalid';
    this.details = details;
  }
}

// ── Contract validation ─────────────────────────────────────────────────────

const CONTRACT_REQUIRED_FIELDS = ['rubric_id', 'mark_label', 'kind', 'depends_on', 'marks'];

/**
 * Validate that every rubric point has the required contract fields.
 * @param {object[]} points
 * @returns {{ valid: boolean, violations: object[] }}
 */
export function validateContract(points) {
  const violations = [];
  for (const point of points) {
    const missing = CONTRACT_REQUIRED_FIELDS.filter((f) => {
      const val = point[f];
      return val === undefined || val === null;
    });
    if (missing.length > 0) {
      violations.push({
        rubric_id: point.rubric_id ?? 'unknown',
        missing_fields: missing,
      });
    }
  }
  return { valid: violations.length === 0, violations };
}

// ── Version selection (base table rubric_points) ────────────────────────────

/**
 * Pick the latest source_version from base table rubric_points.
 * Two-step approach: fetch version candidates, then pick best in JS.
 *
 * @param {object} supabase
 * @param {string} storageKey
 * @param {number} qNumber
 * @param {string} subpartNorm - already normalised ('' for null/undefined)
 * @returns {Promise<string|null>}
 */
async function selectLatestVersion(supabase, storageKey, qNumber, subpartNorm) {
  // We need: extractor_version, provider, model, prompt_version, updated_at, subpart
  // Filter: status='ready', storage_key, q_number
  // Then filter subpart in JS with COALESCE logic.

  let query = supabase
    .from('rubric_points')
    .select('extractor_version, provider, model, prompt_version, updated_at, subpart')
    .eq('status', 'ready')
    .eq('storage_key', storageKey)
    .eq('q_number', qNumber);

  // Handle subpart filtering: if subpartNorm is '', we want rows where subpart IS NULL or subpart = ''
  if (subpartNorm === '') {
    // Supabase: .or('subpart.is.null,subpart.eq.')  — tricky with empty string
    // Safer to fetch all and filter in JS
  } else {
    query = query.eq('subpart', subpartNorm);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`rubric_points version query failed: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return null;
  }

  // JS-side COALESCE(subpart,'') filter for the empty-string case
  const rows = subpartNorm === ''
    ? data.filter((r) => (r.subpart ?? '') === '')
    : data;

  if (rows.length === 0) {
    return null;
  }

  // Group by source_version, compute max(updated_at) per group
  const groups = new Map();
  for (const row of rows) {
    const sv = [row.extractor_version, row.provider, row.model, row.prompt_version].join(':');
    const ts = new Date(row.updated_at).getTime();
    const existing = groups.get(sv);
    if (!existing || ts > existing) {
      groups.set(sv, ts);
    }
  }

  // Pick: version_updated_at DESC, source_version DESC LIMIT 1
  let bestVersion = null;
  let bestTs = -Infinity;
  for (const [sv, ts] of groups) {
    if (ts > bestTs || (ts === bestTs && sv > (bestVersion ?? ''))) {
      bestVersion = sv;
      bestTs = ts;
    }
  }

  return bestVersion;
}

// ── Fetch ready rubric points for a specific version ────────────────────────

/**
 * Fetch rubric points from rubric_points_ready_v1 for a specific source_version.
 *
 * @param {object} supabase
 * @param {string} storageKey
 * @param {number} qNumber
 * @param {string} subpartNorm
 * @param {string} sourceVersion
 * @returns {Promise<object[]>}
 */
async function fetchReadyPoints(supabase, storageKey, qNumber, subpartNorm, sourceVersion) {
  let query = supabase
    .from('rubric_points_ready_v1')
    .select('*')
    .eq('storage_key', storageKey)
    .eq('q_number', qNumber)
    .eq('source_version', sourceVersion)
    .order('step_index', { ascending: true })
    .order('mark_label', { ascending: true });

  if (subpartNorm === '') {
    // Fetch all and filter — same COALESCE logic
  } else {
    query = query.eq('subpart', subpartNorm);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`rubric_points_ready_v1 query failed: ${error.message}`);
  }

  // JS-side COALESCE(subpart,'') filter for empty-string case
  if (subpartNorm === '') {
    return (data || []).filter((r) => (r.subpart ?? '') === '');
  }

  return data || [];
}

// ── Main resolver entry point ───────────────────────────────────────────────

/**
 * Resolve rubric points for a scoring request.
 *
 * @param {object} params
 * @param {object} params.supabase - Supabase client (service-role)
 * @param {string} params.storage_key
 * @param {number} params.q_number
 * @param {string|null|undefined} params.subpart
 * @param {string|null|undefined} params.rubric_source_version - optional pinned version
 * @returns {Promise<{ rubric_source_version: string, rubric_points: object[], rubric_rows_used: number }>}
 * @throws {RubricNotReadyError} 409 — no ready rubric found
 * @throws {RubricContractInvalidError} 422 — contract fields missing
 */
export async function resolveRubric({ supabase, storage_key, q_number, subpart, rubric_source_version }) {
  const subpartNorm = subpart ?? '';

  let selectedVersion;

  if (rubric_source_version) {
    // Pinned version: use as-is
    selectedVersion = rubric_source_version;
  } else {
    // Auto-select latest version from base table
    selectedVersion = await selectLatestVersion(supabase, storage_key, q_number, subpartNorm);
  }

  if (!selectedVersion) {
    throw new RubricNotReadyError(
      `No ready rubric for storage_key=${storage_key}, q_number=${q_number}, subpart='${subpartNorm}'.`,
    );
  }

  // Fetch ready points for the selected version
  const points = await fetchReadyPoints(supabase, storage_key, q_number, subpartNorm, selectedVersion);

  if (points.length === 0) {
    throw new RubricNotReadyError(
      `No ready rubric points in rubric_points_ready_v1 for version=${selectedVersion}, ` +
      `storage_key=${storage_key}, q_number=${q_number}, subpart='${subpartNorm}'.`,
    );
  }

  // Contract validation
  const { valid, violations } = validateContract(points);
  if (!valid) {
    throw new RubricContractInvalidError(
      `Rubric contract invalid: ${violations.length} point(s) missing required fields.`,
      violations,
    );
  }

  // Audit log
  console.log(JSON.stringify({
    event: 'rubric_resolved',
    storage_key,
    q_number,
    subpart: subpartNorm,
    rubric_source_version: selectedVersion,
    rubric_rows_used: points.length,
    ts: new Date().toISOString(),
  }));

  return {
    rubric_source_version: selectedVersion,
    rubric_points: points,
    rubric_rows_used: points.length,
  };
}
