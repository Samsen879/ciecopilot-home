function cloneJson(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function normalizeItems(payload = {}, preferredKey = 'items') {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (Array.isArray(payload?.[preferredKey])) {
    return payload[preferredKey];
  }
  if (Array.isArray(payload?.items)) {
    return payload.items;
  }
  if (Array.isArray(payload?.results)) {
    return payload.results;
  }
  if (Array.isArray(payload?.bundles)) {
    return payload.bundles;
  }
  return [];
}

function normalizeBoolean(value) {
  return typeof value === 'boolean' ? value : null;
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function indexByStorageKey(items = []) {
  return new Map(
    items
      .map((item) => [normalizeString(item?.storage_key), item])
      .filter(([storageKey]) => storageKey),
  );
}

function triagePayload(entry = {}) {
  return entry.triage ?? entry.surface_triage ?? entry;
}

function countChanged(left, right) {
  return (Array.isArray(left) ? left.length : 0) !== (Array.isArray(right) ? right.length : 0);
}

function canonicalText(value) {
  return normalizeString(value).replace(/\s+/g, ' ');
}

export function applySurfaceTriageToManifest({
  manifest = {},
  triageResults = {},
  preserveDiagramPresent = true,
} = {}) {
  const items = normalizeItems(manifest);
  const triageByStorageKey = indexByStorageKey(normalizeItems(triageResults, 'results'));
  const summary = {
    total: items.length,
    updated: 0,
    missing_triage: 0,
    qwen_diagram_disagreements: 0,
    missing_effective_surface_flags: 0,
  };

  const nextItems = items.map((item) => {
    const storageKey = normalizeString(item?.storage_key);
    const triageEntry = triageByStorageKey.get(storageKey);
    if (!triageEntry) {
      summary.missing_triage += 1;
      return cloneJson(item);
    }

    const qwen = triagePayload(triageEntry);
    const qwenDiagramPresent = normalizeBoolean(qwen.diagram_present);
    const manifestDiagramPresent = normalizeBoolean(item.diagram_present);
    const effectiveDiagramPresent = preserveDiagramPresent && manifestDiagramPresent !== null
      ? manifestDiagramPresent
      : qwenDiagramPresent;
    const effectiveFormulaDense = normalizeBoolean(qwen.formula_dense);
    const effectiveTableHeavy = normalizeBoolean(qwen.table_heavy);
    const disagreement = manifestDiagramPresent !== null
      && qwenDiagramPresent !== null
      && manifestDiagramPresent !== qwenDiagramPresent;

    const missingEffective = [
      effectiveDiagramPresent,
      effectiveFormulaDense,
      effectiveTableHeavy,
    ].some((value) => value === null);

    summary.updated += 1;
    if (disagreement) {
      summary.qwen_diagram_disagreements += 1;
    }
    if (missingEffective) {
      summary.missing_effective_surface_flags += 1;
    }

    return {
      ...cloneJson(item),
      route_hint: effectiveDiagramPresent === true ? 'diagram_lane' : 'ocr_lane',
      diagram_present: effectiveDiagramPresent,
      formula_dense: effectiveFormulaDense,
      table_heavy: effectiveTableHeavy,
      surface_evidence_status: 'surface_triage_v1',
      surface_triage: {
        schema_version: 'surface_triage_v1',
        source: normalizeString(triageEntry.model) || 'qwen3.6-plus',
        input_asset_hash: triageEntry.input_asset_hash ?? null,
        surface_confidence: typeof qwen.surface_confidence === 'number'
          ? qwen.surface_confidence
          : null,
        surface_reasons: Array.isArray(qwen.surface_reasons)
          ? cloneJson(qwen.surface_reasons)
          : [],
        qwen_diagram_present: qwenDiagramPresent,
        qwen_diagram_disagrees_with_manifest: disagreement,
        formula_dense: effectiveFormulaDense,
        table_heavy: effectiveTableHeavy,
      },
    };
  });

  return {
    manifest: {
      ...cloneJson(manifest),
      items: nextItems,
      surface_triage_summary: summary,
    },
    summary,
  };
}

export function compareQuestionEvidenceBundles({ baseline = {}, candidate = {} } = {}) {
  const baselineByStorageKey = indexByStorageKey(normalizeItems(baseline, 'bundles'));
  const candidateItems = normalizeItems(candidate, 'bundles');
  const summary = {
    total: candidateItems.length,
    missing_baseline: 0,
    route_changed: 0,
    diagram_present_changed: 0,
    ocr_text_changed: 0,
    formula_count_changed: 0,
    subquestion_count_changed: 0,
    diagram_elements_changed: 0,
    spatial_evidence_changed: 0,
    high_risk_changed: 0,
  };

  const items = candidateItems.map((candidateBundle) => {
    const storageKey = normalizeString(candidateBundle?.storage_key);
    const baselineBundle = baselineByStorageKey.get(storageKey);
    if (!baselineBundle) {
      summary.missing_baseline += 1;
      return {
        storage_key: storageKey,
        baseline_route: null,
        candidate_route: candidateBundle?.route?.route ?? null,
        risk_level: 'high',
        recommended_action: 'manual_review',
      };
    }

    const baselineEvidence = baselineBundle.evidence ?? {};
    const candidateEvidence = candidateBundle.evidence ?? {};
    const routeChanged = baselineBundle?.route?.route !== candidateBundle?.route?.route;
    const diagramPresentChanged = baselineEvidence.diagram_present !== candidateEvidence.diagram_present;
    const ocrTextChanged = canonicalText(baselineEvidence.ocr_text) !== canonicalText(candidateEvidence.ocr_text);
    const formulaCountChanged = countChanged(
      baselineEvidence.formula_latex_list,
      candidateEvidence.formula_latex_list,
    );
    const subquestionCountChanged = countChanged(
      baselineEvidence.subquestion_blocks,
      candidateEvidence.subquestion_blocks,
    );
    const diagramElementsChanged = countChanged(
      baselineEvidence.diagram_elements,
      candidateEvidence.diagram_elements,
    );
    const spatialEvidenceChanged = countChanged(
      baselineEvidence.spatial_evidence,
      candidateEvidence.spatial_evidence,
    );
    const highRisk = routeChanged
      || diagramPresentChanged
      || diagramElementsChanged
      || spatialEvidenceChanged;

    if (routeChanged) summary.route_changed += 1;
    if (diagramPresentChanged) summary.diagram_present_changed += 1;
    if (ocrTextChanged) summary.ocr_text_changed += 1;
    if (formulaCountChanged) summary.formula_count_changed += 1;
    if (subquestionCountChanged) summary.subquestion_count_changed += 1;
    if (diagramElementsChanged) summary.diagram_elements_changed += 1;
    if (spatialEvidenceChanged) summary.spatial_evidence_changed += 1;
    if (highRisk) summary.high_risk_changed += 1;

    return {
      storage_key: storageKey,
      baseline_route: baselineBundle?.route?.route ?? null,
      candidate_route: candidateBundle?.route?.route ?? null,
      diagram_present: {
        baseline: normalizeBoolean(baselineEvidence.diagram_present),
        candidate: normalizeBoolean(candidateEvidence.diagram_present),
      },
      ocr_text_changed: ocrTextChanged,
      formula_count_delta:
        (candidateEvidence.formula_latex_list?.length ?? 0)
        - (baselineEvidence.formula_latex_list?.length ?? 0),
      subquestion_count_delta:
        (candidateEvidence.subquestion_blocks?.length ?? 0)
        - (baselineEvidence.subquestion_blocks?.length ?? 0),
      diagram_elements_delta:
        (candidateEvidence.diagram_elements?.length ?? 0)
        - (baselineEvidence.diagram_elements?.length ?? 0),
      spatial_evidence_delta:
        (candidateEvidence.spatial_evidence?.length ?? 0)
        - (baselineEvidence.spatial_evidence?.length ?? 0),
      risk_level: highRisk ? 'high' : (ocrTextChanged || formulaCountChanged || subquestionCountChanged ? 'medium' : 'low'),
      recommended_action: highRisk ? 'manual_review' : 'safe_accept',
    };
  });

  return {
    schema_version: '9709_evidence_bundle_diff_v1',
    summary,
    items,
  };
}
