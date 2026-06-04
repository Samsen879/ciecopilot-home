import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DEFAULT_SCHEMA_FILE = path.join(
  ROOT,
  'docs',
  'schemas',
  'rag_s2_augmentation_eval_summary.schema.json',
);

const STATUS_BLOCKING_FALLBACK_CODES = [
  'S2_EMPTY_EVIDENCE',
  'S2_TIMEOUT',
];

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function toPath(parent, child) {
  if (parent === '') return String(child);
  if (typeof child === 'number') return `${parent}[${child}]`;
  return `${parent}.${child}`;
}

function buildError(code, atPath, message, details = {}) {
  return {
    code,
    path: atPath || '$',
    message,
    ...details,
  };
}

function readSchema(schemaFile = DEFAULT_SCHEMA_FILE) {
  return JSON.parse(fs.readFileSync(schemaFile, 'utf8'));
}

function resolveRef(schema, ref) {
  if (typeof ref !== 'string' || !ref.startsWith('#/')) {
    throw new Error(`Unsupported schema ref: ${ref}`);
  }
  return ref
    .slice(2)
    .split('/')
    .reduce((current, segment) => current?.[segment], schema);
}

function matchesType(value, typeName) {
  if (typeName === 'null') return value === null;
  if (typeName === 'array') return Array.isArray(value);
  if (typeName === 'object') return isPlainObject(value);
  if (typeName === 'integer') return Number.isInteger(value);
  if (typeName === 'number') return typeof value === 'number' && Number.isFinite(value);
  if (typeName === 'string') return typeof value === 'string';
  if (typeName === 'boolean') return typeof value === 'boolean';
  return true;
}

function valuesDeepEqual(left, right) {
  return JSON.stringify(left || {}) === JSON.stringify(right || {});
}

function sortedObject(value) {
  return Object.fromEntries(Object.entries(value || {}).sort(([left], [right]) => left.localeCompare(right)));
}

function validateNode({ schema, nodeSchema, value, atPath, errors }) {
  if (!nodeSchema || typeof nodeSchema !== 'object') return;

  const effectiveSchema = nodeSchema.$ref ? resolveRef(schema, nodeSchema.$ref) : nodeSchema;
  if (!effectiveSchema) {
    errors.push(buildError('schema_ref_unresolved', atPath, `schema ref unresolved at ${atPath}`));
    return;
  }

  if (Object.hasOwn(effectiveSchema, 'const') && value !== effectiveSchema.const) {
    errors.push(
      buildError(
        'schema_const_mismatch',
        atPath,
        `${atPath || '$'} must equal ${JSON.stringify(effectiveSchema.const)}`,
        { expected: effectiveSchema.const, actual: value },
      ),
    );
  }

  if (Array.isArray(effectiveSchema.enum) && !effectiveSchema.enum.includes(value)) {
    errors.push(
      buildError(
        'schema_enum_mismatch',
        atPath,
        `${atPath || '$'} must be one of ${effectiveSchema.enum.map((item) => JSON.stringify(item)).join(', ')}`,
        { allowed: effectiveSchema.enum, actual: value },
      ),
    );
  }

  if (effectiveSchema.type !== undefined) {
    const types = Array.isArray(effectiveSchema.type) ? effectiveSchema.type : [effectiveSchema.type];
    if (!types.some((typeName) => matchesType(value, typeName))) {
      errors.push(
        buildError(
          'schema_type_mismatch',
          atPath,
          `${atPath || '$'} must be type ${types.join('|')}`,
          { expected: types, actual_type: Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value },
        ),
      );
      return;
    }
  }

  if (typeof value === 'string') {
    if (Number.isFinite(effectiveSchema.minLength) && value.length < effectiveSchema.minLength) {
      errors.push(
        buildError(
          'schema_min_length',
          atPath,
          `${atPath || '$'} must have length >= ${effectiveSchema.minLength}`,
        ),
      );
    }
    if (effectiveSchema.format === 'date-time' && Number.isNaN(Date.parse(value))) {
      errors.push(buildError('schema_format_date_time', atPath, `${atPath || '$'} must be date-time`));
    }
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    if (Number.isFinite(effectiveSchema.minimum) && value < effectiveSchema.minimum) {
      errors.push(
        buildError(
          'schema_minimum',
          atPath,
          `${atPath || '$'} must be >= ${effectiveSchema.minimum}`,
          { minimum: effectiveSchema.minimum, actual: value },
        ),
      );
    }
    if (Number.isFinite(effectiveSchema.maximum) && value > effectiveSchema.maximum) {
      errors.push(
        buildError(
          'schema_maximum',
          atPath,
          `${atPath || '$'} must be <= ${effectiveSchema.maximum}`,
          { maximum: effectiveSchema.maximum, actual: value },
        ),
      );
    }
  }

  if (isPlainObject(value)) {
    for (const field of effectiveSchema.required || []) {
      if (!Object.hasOwn(value, field) || value[field] === undefined) {
        errors.push(
          buildError(
            'schema_required_field_missing',
            toPath(atPath, field),
            `${toPath(atPath, field)} is required`,
          ),
        );
      }
    }

    const properties = effectiveSchema.properties || {};
    for (const [field, childSchema] of Object.entries(properties)) {
      if (Object.hasOwn(value, field) && value[field] !== undefined) {
        validateNode({
          schema,
          nodeSchema: childSchema,
          value: value[field],
          atPath: toPath(atPath, field),
          errors,
        });
      }
    }

    if (effectiveSchema.additionalProperties === false) {
      for (const field of Object.keys(value)) {
        if (!Object.hasOwn(properties, field)) {
          errors.push(
            buildError(
              'schema_additional_property',
              toPath(atPath, field),
              `${toPath(atPath, field)} is not allowed`,
            ),
          );
        }
      }
    } else if (isPlainObject(effectiveSchema.additionalProperties)) {
      for (const [field, childValue] of Object.entries(value)) {
        if (!Object.hasOwn(properties, field)) {
          validateNode({
            schema,
            nodeSchema: effectiveSchema.additionalProperties,
            value: childValue,
            atPath: toPath(atPath, field),
            errors,
          });
        }
      }
    }
  }

  if (Array.isArray(value) && effectiveSchema.items) {
    value.forEach((item, index) => {
      validateNode({
        schema,
        nodeSchema: effectiveSchema.items,
        value: item,
        atPath: toPath(atPath, index),
        errors,
      });
    });
  }
}

function pushSemanticError(errors, code, atPath, message, details = {}) {
  errors.push(buildError(code, atPath, message, details));
}

function countFor(summary, code) {
  return Number(summary?.fallback_reason_counts?.[code] || 0);
}

function sumFallbackCounts(summary) {
  return Object.values(summary?.fallback_reason_counts || {}).reduce((sum, value) => sum + Number(value || 0), 0);
}

function addSemanticChecks(summary, errors) {
  const s2Mode = summary?.mode_summaries?.s2_enabled || {};
  const s2Routed = Number(s2Mode.s2_routed_request_count || 0);
  const s2Fallback = Number(s2Mode.s2_fallback_count || 0);

  if (s2Routed > 0) {
    const expectedFallbackRate = Number((s2Fallback / s2Routed).toFixed(6));
    const actualFallbackRate = Number(summary?.fallback_rate);
    if (Math.abs(actualFallbackRate - expectedFallbackRate) > 0.000001) {
      pushSemanticError(
        errors,
        'semantic_fallback_rate_mismatch',
        'fallback_rate',
        `fallback_rate must equal s2_fallback_count / s2_routed_request_count (${expectedFallbackRate})`,
        {
          expected: expectedFallbackRate,
          actual: actualFallbackRate,
          s2_fallback_count: s2Fallback,
          s2_routed_request_count: s2Routed,
        },
      );
    }
  }

  if (!valuesDeepEqual(sortedObject(summary?.route_counts), sortedObject(summary?.retrieval_route_counts))) {
    pushSemanticError(
      errors,
      'semantic_route_counts_mismatch',
      'retrieval_route_counts',
      'retrieval_route_counts must equal route_counts',
      {
        route_counts: summary?.route_counts || {},
        retrieval_route_counts: summary?.retrieval_route_counts || {},
      },
    );
  }

  const status = summary?.status;
  const fallbackRate = Number(summary?.fallback_rate || 0);
  const topicLeakageRate = Number(summary?.topic_leakage_rate || 0);
  const evidenceTraceabilityRate = Number(summary?.evidence_traceability_rate ?? 0);
  const qualityDelta = Number(summary?.target_slice_quality_vs_s1 ?? 0);
  const statusMustNotPassReasons = [];
  if (countFor(summary, 'S2_EMPTY_EVIDENCE') > 0) statusMustNotPassReasons.push('S2_EMPTY_EVIDENCE');
  if (countFor(summary, 'S2_TIMEOUT') > 0) statusMustNotPassReasons.push('S2_TIMEOUT');
  if (fallbackRate > 0.2) statusMustNotPassReasons.push('fallback_rate_above_threshold');
  if (topicLeakageRate !== 0) statusMustNotPassReasons.push('topic_leakage_rate_not_zero');
  if (evidenceTraceabilityRate < 0.95) statusMustNotPassReasons.push('evidence_traceability_below_threshold');
  if (qualityDelta <= 0) statusMustNotPassReasons.push('target_slice_quality_non_positive');

  if (status === 'pass' && statusMustNotPassReasons.length > 0) {
    pushSemanticError(
      errors,
      'semantic_status_must_not_pass',
      'status',
      `status must not be pass when release-blocking S2 evidence exists: ${statusMustNotPassReasons.join(', ')}`,
      { reasons: statusMustNotPassReasons },
    );
  }

  const fallbackCounts = sumFallbackCounts(summary);
  if (fallbackCounts > 0 && (!Array.isArray(summary?.top_failing_cases) || summary.top_failing_cases.length === 0)) {
    pushSemanticError(
      errors,
      'semantic_top_failing_cases_missing',
      'top_failing_cases',
      'top_failing_cases must include concrete case IDs when fallback counts are nonzero',
      { fallback_reason_counts: summary?.fallback_reason_counts || {} },
    );
  }

  const concreteFallbackReasons = new Set(
    (summary?.top_failing_cases || [])
      .filter((row) => row?.s2_fallback_triggered && row?.s2_fallback_reason && row.s2_fallback_reason !== 'UNKNOWN')
      .map((row) => row.s2_fallback_reason),
  );
  for (const reason of concreteFallbackReasons) {
    if (Number(summary?.fallback_reason_counts?.[reason] || 0) <= 0) {
      pushSemanticError(
        errors,
        'semantic_fallback_reason_count_missing',
        `fallback_reason_counts.${reason}`,
        `fallback_reason_counts must preserve concrete fallback reason ${reason}`,
      );
    }
  }

  const hasOnlyUnknownFallbacks =
    fallbackCounts > 0 &&
    Number(summary?.fallback_reason_counts?.UNKNOWN || 0) === fallbackCounts;
  if (hasOnlyUnknownFallbacks) {
    pushSemanticError(
      errors,
      'semantic_fallback_reason_collapsed',
      'fallback_reason_counts.UNKNOWN',
      'fallback_reason_counts must not collapse S2 fallback reasons to UNKNOWN',
    );
  }

  for (const code of STATUS_BLOCKING_FALLBACK_CODES) {
    const casesForCode = (summary?.top_failing_cases || []).filter(
      (row) => row?.s2_fallback_triggered && row?.s2_fallback_reason === code,
    );
    if (countFor(summary, code) > 0 && casesForCode.length === 0) {
      pushSemanticError(
        errors,
        'semantic_top_failing_case_family_missing',
        'top_failing_cases',
        `top_failing_cases must include case IDs for ${code}`,
      );
    }
  }
}

export function validateS2EvalSummary(summary, { schema = readSchema() } = {}) {
  const errors = [];
  validateNode({
    schema,
    nodeSchema: schema,
    value: summary,
    atPath: '',
    errors,
  });

  if (isPlainObject(summary)) addSemanticChecks(summary, errors);

  return {
    status: errors.length === 0 ? 'pass' : 'fail',
    schema_valid: errors.filter((error) => error.code.startsWith('schema_')).length === 0,
    semantic_valid: errors.filter((error) => error.code.startsWith('semantic_')).length === 0,
    errors,
  };
}

export function buildS2EvalSummarySchemaCheck({
  evalSummary = null,
  schema = readSchema(),
  inputs = {},
} = {}) {
  const hasEvalSummary = isPlainObject(evalSummary);
  const validation = hasEvalSummary
    ? validateS2EvalSummary(evalSummary, { schema })
    : {
        status: 'fail',
        schema_valid: false,
        semantic_valid: false,
        errors: [
          buildError(
            'release_eval_summary_missing',
            'summary',
            'S2 augmentation eval summary is missing',
          ),
        ],
      };
  const blockedReasons = validation.errors.map((error) => error.code);

  return {
    generated_at: new Date().toISOString(),
    stage: 'rag_s2_eval_summary_schema_check',
    run_config: {
      script: 'scripts/rag/run_s2_eval_summary_schema_check.js',
      schema: inputs.schema || 'docs/schemas/rag_s2_augmentation_eval_summary.schema.json',
    },
    inputs: {
      summary: inputs.summary || 'runs/backend/rag_s2_augmentation_eval_summary.json',
      schema: inputs.schema || 'docs/schemas/rag_s2_augmentation_eval_summary.schema.json',
    },
    status: validation.status,
    eval_summary_present: hasEvalSummary,
    schema_valid: validation.schema_valid,
    semantic_valid: validation.semantic_valid,
    errors: validation.errors,
    blocked_reasons: blockedReasons,
  };
}
