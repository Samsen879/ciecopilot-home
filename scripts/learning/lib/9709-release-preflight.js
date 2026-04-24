function cloneJson(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeNullableString(value) {
  const normalized = normalizeString(value);
  return normalized || null;
}

function normalizeBoolean(value) {
  return typeof value === 'boolean' ? value : null;
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
  if (Array.isArray(payload?.bundles)) {
    return payload.bundles;
  }
  return [];
}

function pushFinding(target, {
  severity,
  reason_code: reasonCode,
  storage_key: storageKey = null,
  message,
  details = {},
}) {
  target.push({
    severity,
    reason_code: reasonCode,
    storage_key: storageKey,
    message,
    details: cloneJson(details) ?? {},
  });
}

function indexByStorageKey(items = [], label = 'items') {
  const map = new Map();
  const duplicates = [];

  for (const item of items) {
    const storageKey = normalizeString(item?.storage_key);
    if (!storageKey) {
      continue;
    }
    if (map.has(storageKey)) {
      duplicates.push(storageKey);
      continue;
    }
    map.set(storageKey, item);
  }

  return { map, duplicates, label };
}

function normalizeSeedNode(node = {}, defaults = {}) {
  return {
    syllabus_code: normalizeString(node.syllabus_code) || defaults.syllabusCode,
    version_tag: normalizeString(node.version_tag) || defaults.versionTag,
    topic_path: normalizeString(node.topic_path),
  };
}

function buildSeedTopicSet(curriculumSeed = {}) {
  const defaultSyllabusCode = normalizeString(curriculumSeed.syllabus_code);
  const defaultVersionTag = normalizeString(curriculumSeed.version_tag);
  const nodes = Array.isArray(curriculumSeed.nodes) ? curriculumSeed.nodes : [];
  return new Set(nodes.map((node) => normalizeSeedNode(node, {
    syllabusCode: defaultSyllabusCode,
    versionTag: defaultVersionTag,
  })).filter((node) => (
    node.syllabus_code === '9709'
    && node.version_tag
    && node.topic_path
  )).map((node) => node.topic_path));
}

function sidecarPack(entry = {}) {
  return entry?.authority_input_pack ?? entry ?? {};
}

function isLegacyP1VectorPack(manifestItem = {}, pack = {}) {
  return manifestItem.paper === 1
    && (
      pack.historical_topic_label === 'legacy_p1_vectors'
      || pack.syllabus_version === 'pre-2020'
      || manifestItem.historical_topic_label === 'legacy_p1_vectors'
      || manifestItem.syllabus_version === 'pre-2020'
    );
}

function normalizeReasonList(...values) {
  return values.flatMap((value) => {
    if (Array.isArray(value)) {
      return value;
    }
    if (typeof value === 'string') {
      return [value];
    }
    return [];
  }).map((value) => normalizeString(value)).filter(Boolean);
}

function hasExplicitOcrEmptyStatus({ manifestItem = {}, bundle = {} } = {}) {
  const surfaceStatus = normalizeString(
    bundle?.surface_posture?.surface_evidence_status
    ?? manifestItem.surface_evidence_status,
  );
  const reviewReasons = normalizeReasonList(
    manifestItem.review_reasons,
    bundle?.review_posture?.review_reasons,
  );
  const disposition = normalizeString(bundle?.review_posture?.disposition);

  return disposition === 'excluded'
    || surfaceStatus.startsWith('excluded')
    || surfaceStatus.includes('asset_failed')
    || surfaceStatus.includes('manual_review')
    || reviewReasons.some((reason) => (
      reason.includes('out_of_scope')
      || reason.includes('asset_failed')
      || reason.includes('requires_manual_review')
      || reason.includes('ocr_empty_accepted')
    ));
}

function hasImageFallbackOrReason({ manifestItem = {}, bundle = {} } = {}) {
  const reviewReasons = normalizeReasonList(
    manifestItem.review_reasons,
    bundle?.review_posture?.review_reasons,
    bundle?.lazy_attach_reasons,
  );
  const surfaceStatus = normalizeString(
    bundle?.surface_posture?.surface_evidence_status
    ?? manifestItem.surface_evidence_status,
  );

  return surfaceStatus.startsWith('excluded')
    || reviewReasons.some((reason) => (
      reason.includes('wm')
      || reason.includes('fallback')
      || reason.includes('out_of_scope')
      || reason.includes('asset_failed')
      || reason.includes('requires_manual_review')
      || reason.includes('image_path_accepted')
    ));
}

function routeFailureReason(bundle = {}) {
  return normalizeString(
    bundle?.route?.failure_reason
    ?? bundle?.selected_route?.failure_reason
    ?? bundle?.failure_reason,
  );
}

function hasExtractionSignal(bundle = {}) {
  const evidence = bundle.evidence ?? {};
  return routeFailureReason(bundle)
    || (Array.isArray(bundle.model_provenance) && bundle.model_provenance.length > 0)
    || normalizeString(bundle?.route?.input_asset_hash)
    || typeof bundle?.route?.confidence === 'number'
    || normalizeString(evidence.ocr_text)
    || (Array.isArray(evidence.formula_latex_list) && evidence.formula_latex_list.length > 0)
    || (Array.isArray(evidence.subquestion_blocks) && evidence.subquestion_blocks.length > 0)
    || (Array.isArray(evidence.layout_hints) && evidence.layout_hints.length > 0)
    || (Array.isArray(evidence.diagram_elements) && evidence.diagram_elements.length > 0)
    || (Array.isArray(evidence.spatial_evidence) && evidence.spatial_evidence.length > 0);
}

function diagramPresentConsistencyDetails({ manifestItem = {}, bundle = {} } = {}) {
  const details = {
    manifest_diagram_present: normalizeBoolean(manifestItem.diagram_present),
    evidence_diagram_present: normalizeBoolean(bundle?.evidence?.diagram_present),
    surface_posture_diagram_present: normalizeBoolean(bundle?.surface_posture?.diagram_present),
  };
  const values = Object.values(details);
  const hasMissingValue = values.some((value) => value === null);
  const uniqueValues = new Set(values.filter((value) => typeof value === 'boolean'));

  if (hasMissingValue || uniqueValues.size > 1) {
    return details;
  }
  return null;
}

function buildCounts({
  manifestItems,
  sidecarItems,
  sidecarTopicSet,
  blockers,
  warnings,
} = {}) {
  const diagramPresent = {
    true: 0,
    false: 0,
    invalid: 0,
  };

  for (const item of manifestItems) {
    if (item?.diagram_present === true) {
      diagramPresent.true += 1;
    } else if (item?.diagram_present === false) {
      diagramPresent.false += 1;
    } else {
      diagramPresent.invalid += 1;
    }
  }

  const sidecarCanonicalMissing = sidecarItems.filter((item) => (
    !normalizeNullableString(sidecarPack(item).canonical_primary_topic_path)
  )).length;

  return {
    manifest_items: manifestItems.length,
    sidecar_items: sidecarItems.length,
    diagram_present: diagramPresent,
    sidecar_canonical_missing: sidecarCanonicalMissing,
    sidecar_distinct_topics: sidecarTopicSet.size,
    blockers: blockers.length,
    warnings: warnings.length,
  };
}

export function validate9709ReleasePreflight({
  manifest = {},
  authoritySidecar = {},
  curriculumSeed = {},
  evidenceBundles = null,
  readyManifest = null,
  expectedManifestCount = 300,
} = {}) {
  const blockers = [];
  const warnings = [];
  const manifestItems = normalizeItems(manifest);
  const sidecarItems = normalizeItems(authoritySidecar);
  const bundleItems = evidenceBundles === null ? [] : normalizeItems(evidenceBundles, 'bundles');
  const readyItems = readyManifest === null ? [] : normalizeItems(readyManifest);
  const seedTopics = buildSeedTopicSet(curriculumSeed);
  const { map: sidecarByStorageKey, duplicates: sidecarDuplicates } = indexByStorageKey(sidecarItems, 'sidecar');
  const { map: bundleByStorageKey } = indexByStorageKey(bundleItems, 'bundles');
  const sidecarTopicSet = new Set();

  if (manifestItems.length !== expectedManifestCount) {
    pushFinding(blockers, {
      severity: 'blocker',
      reason_code: 'manifest_item_count_mismatch',
      message: `Manifest item count ${manifestItems.length} did not match expected ${expectedManifestCount}.`,
      details: { actual: manifestItems.length, expected: expectedManifestCount },
    });
  }

  for (const duplicate of sidecarDuplicates) {
    pushFinding(blockers, {
      severity: 'blocker',
      reason_code: 'duplicate_authority_sidecar_entry',
      storage_key: duplicate,
      message: 'Authority sidecar contains duplicate storage_key entries.',
    });
  }

  for (const item of manifestItems) {
    const storageKey = normalizeString(item?.storage_key);
    const sidecarEntry = sidecarByStorageKey.get(storageKey);
    const pack = sidecarPack(sidecarEntry);
    const canonicalTopicPath = normalizeNullableString(pack.canonical_primary_topic_path);
    const bundle = bundleByStorageKey.get(storageKey);

    if (item?.diagram_present !== true && item?.diagram_present !== false) {
      pushFinding(blockers, {
        severity: 'blocker',
        reason_code: 'diagram_present_not_boolean',
        storage_key: storageKey,
        message: 'Manifest item diagram_present must be true or false.',
        details: { value: item?.diagram_present ?? null },
      });
    }

    if (!sidecarEntry) {
      pushFinding(blockers, {
        severity: 'blocker',
        reason_code: 'missing_authority_sidecar_entry',
        storage_key: storageKey,
        message: 'Manifest item has no matching authority sidecar entry.',
      });
      continue;
    }

    if (!canonicalTopicPath) {
      pushFinding(blockers, {
        severity: 'blocker',
        reason_code: 'missing_canonical_primary_topic_path',
        storage_key: storageKey,
        message: 'Authority sidecar entry is missing canonical_primary_topic_path.',
      });
    } else {
      sidecarTopicSet.add(canonicalTopicPath);
      if (!seedTopics.has(canonicalTopicPath)) {
        pushFinding(blockers, {
          severity: 'blocker',
          reason_code: 'canonical_topic_not_seeded',
          storage_key: storageKey,
          message: 'Canonical authority topic is not present in the 9709 curriculum seed.',
          details: { canonical_primary_topic_path: canonicalTopicPath },
        });
      }
    }

    if (isLegacyP1VectorPack(item, pack) && canonicalTopicPath !== '9709.p3.vectors') {
      pushFinding(blockers, {
        severity: 'blocker',
        reason_code: 'legacy_p1_vector_not_canonical_p3_vectors',
        storage_key: storageKey,
        message: 'Legacy paper-1 vector item must canonicalize to 9709.p3.vectors.',
        details: { canonical_primary_topic_path: canonicalTopicPath },
      });
    }

    if (!normalizeNullableString(item.primary_topic_path) && canonicalTopicPath) {
      pushFinding(warnings, {
        severity: 'warning',
        reason_code: 'manifest_primary_topic_missing_sidecar_canonical_present',
        storage_key: storageKey,
        message: 'Manifest primary_topic_path is missing, but sidecar canonical authority is present.',
        details: { canonical_primary_topic_path: canonicalTopicPath },
      });
    }

    if ([5, 6].includes(Number(item.paper)) && canonicalTopicPath) {
      pushFinding(warnings, {
        severity: 'warning',
        reason_code: 'paper_5_or_6_in_authority_ready_batch',
        storage_key: storageKey,
        message: 'Paper 5 or Paper 6 item is present in the 9709 batch with explicit authority resolution.',
        details: { paper: item.paper, canonical_primary_topic_path: canonicalTopicPath },
      });
    }

    if (bundle) {
      const evidence = bundle.evidence ?? {};
      const ocrText = normalizeString(evidence.ocr_text);
      const diagramConsistencyDetails = diagramPresentConsistencyDetails({ manifestItem: item, bundle });
      const evidenceDiagramPresent = evidence.diagram_present === true || item.diagram_present === true;

      if (diagramConsistencyDetails) {
        pushFinding(blockers, {
          severity: 'blocker',
          reason_code: 'diagram_present_mismatch_between_manifest_and_evidence_bundle',
          storage_key: storageKey,
          message: 'Manifest, evidence, and surface_posture diagram_present must match when evidence bundles are supplied.',
          details: diagramConsistencyDetails,
        });
      }

      if (hasExtractionSignal(bundle) && !ocrText && !hasExplicitOcrEmptyStatus({ manifestItem: item, bundle })) {
        pushFinding(blockers, {
          severity: 'blocker',
          reason_code: 'ocr_empty_without_explicit_status',
          storage_key: storageKey,
          message: 'Evidence bundle has empty OCR without an explicit acceptable status.',
        });
      }

      const failureReason = routeFailureReason(bundle);
      if (
        failureReason
        && failureReason.includes('image')
        && failureReason.includes('not')
        && !hasImageFallbackOrReason({ manifestItem: item, bundle })
      ) {
        pushFinding(blockers, {
          severity: 'blocker',
          reason_code: 'image_unresolved_without_fallback_or_reason',
          storage_key: storageKey,
          message: 'Image was unresolved without a WM fallback or explicit review reason.',
          details: { failure_reason: failureReason },
        });
      }

      if (evidenceDiagramPresent && !Array.isArray(evidence.diagram_elements)) {
        pushFinding(warnings, {
          severity: 'warning',
          reason_code: 'diagram_present_but_elements_empty',
          storage_key: storageKey,
          message: 'Diagram-present item has no diagram_elements array.',
        });
      } else if (evidenceDiagramPresent && evidence.diagram_elements.length === 0) {
        pushFinding(warnings, {
          severity: 'warning',
          reason_code: 'diagram_present_but_elements_empty',
          storage_key: storageKey,
          message: 'Diagram-present item has empty diagram_elements.',
        });
      }

      if (evidenceDiagramPresent && !Array.isArray(evidence.spatial_evidence)) {
        pushFinding(warnings, {
          severity: 'warning',
          reason_code: 'diagram_present_but_spatial_evidence_empty',
          storage_key: storageKey,
          message: 'Diagram-present item has no spatial_evidence array.',
        });
      } else if (evidenceDiagramPresent && evidence.spatial_evidence.length === 0) {
        pushFinding(warnings, {
          severity: 'warning',
          reason_code: 'diagram_present_but_spatial_evidence_empty',
          storage_key: storageKey,
          message: 'Diagram-present item has empty spatial_evidence.',
        });
      }
    }
  }

  for (const item of readyItems) {
    if (item?.overall_alignment_verdict && item.overall_alignment_verdict !== 'ready') {
      pushFinding(blockers, {
        severity: 'blocker',
        reason_code: 'ready_artifact_contains_non_ready_item',
        storage_key: normalizeString(item.storage_key),
        message: 'Ready-to-write artifact contains an item whose overall alignment verdict is not ready.',
        details: { overall_alignment_verdict: item.overall_alignment_verdict },
      });
    }
  }

  const counts = buildCounts({
    manifestItems,
    sidecarItems,
    sidecarTopicSet,
    blockers,
    warnings,
  });

  return {
    schema_version: '9709_release_preflight_v1',
    status: blockers.length > 0 ? 'fail' : 'pass',
    counts,
    blockers,
    warnings,
  };
}

function renderFindingList(title, findings) {
  if (findings.length === 0) {
    return [`## ${title}`, '', 'None.', ''];
  }

  return [
    `## ${title}`,
    '',
    '| Severity | Reason | Storage Key | Message |',
    '|---|---|---|---|',
    ...findings.map((finding) => (
      `| ${finding.severity} | \`${finding.reason_code}\` | ${finding.storage_key ?? ''} | ${finding.message} |`
    )),
    '',
  ];
}

export function render9709ReleasePreflightMarkdown(result = {}) {
  const counts = result.counts ?? {};
  const diagramCounts = counts.diagram_present ?? {};

  return [
    '# 9709 Release Preflight',
    '',
    `status: \`${result.status ?? 'unknown'}\``,
    '',
    '## Counts',
    '',
    '| Metric | Value |',
    '|---|---:|',
    `| manifest_items | ${counts.manifest_items ?? 0} |`,
    `| sidecar_items | ${counts.sidecar_items ?? 0} |`,
    `| diagram_present.true | ${diagramCounts.true ?? 0} |`,
    `| diagram_present.false | ${diagramCounts.false ?? 0} |`,
    `| diagram_present.invalid | ${diagramCounts.invalid ?? 0} |`,
    `| sidecar_canonical_missing | ${counts.sidecar_canonical_missing ?? 0} |`,
    `| sidecar_distinct_topics | ${counts.sidecar_distinct_topics ?? 0} |`,
    `| blockers | ${counts.blockers ?? 0} |`,
    `| warnings | ${counts.warnings ?? 0} |`,
    '',
    ...renderFindingList('Blockers', result.blockers ?? []),
    ...renderFindingList('Warnings', result.warnings ?? []),
  ].join('\n');
}
