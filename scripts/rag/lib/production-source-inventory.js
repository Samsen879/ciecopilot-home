import fs from 'node:fs';
import path from 'node:path';

const SUBJECT_SOURCE_ROOTS = Object.freeze({
  '9709': {
    label: '9709 Mathematics',
    sources: {
      past_paper_pdf: 'data/past-papers/9709Mathematics',
      mark_scheme_pdf: 'data/mark-schemes/9709Mathematics',
    },
  },
  '9702': {
    label: '9702 Physics',
    sources: {
      past_paper_pdf: 'data/past-papers/9702Physics',
      mark_scheme_pdf: 'data/mark-schemes/9702Physics',
    },
  },
  '9231': {
    label: '9231 Further Mathematics',
    sources: {
      past_paper_pdf: 'data/past-papers/9231Further-Mathematics',
      mark_scheme_pdf: 'data/mark-schemes/9231Further-Mathematics',
    },
  },
});

const RESEARCH_ONLY_ROOTS = Object.freeze([
  {
    source_type: 'note_md',
    root: 'src/data/data-notes',
    posture: 'research_only',
    reason: 'data-notes is not allowed in restricted-official or user-facing production coverage.',
  },
]);

const STANDARD_FILE_PATTERNS = Object.freeze({
  past_paper_pdf: /^\d{4}_[msw]\d{2}_qp_\d{2}\.pdf$/i,
  mark_scheme_pdf: /^\d{4}_[msw]\d{2}_ms_\d{2}\.pdf$/i,
});

const DEFAULT_PILOT_TRACKS = Object.freeze({
  '9709': [1, 2, 3, 4, 5, 6],
  '9702': [1, 2, 3, 4, 5],
  '9231': [1, 2, 3, 4],
});

function toPosix(value) {
  return String(value || '').replace(/\\/g, '/');
}

function toRel(rootDir, filePath) {
  return toPosix(path.relative(rootDir, filePath));
}

function readJsonIfExists(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function listFilesRecursive(rootDir) {
  if (!fs.existsSync(rootDir)) return [];
  const out = [];
  const queue = [rootDir];
  while (queue.length > 0) {
    const current = queue.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        queue.push(full);
      } else if (entry.isFile()) {
        out.push(full);
      }
    }
  }
  return out.sort((left, right) => left.localeCompare(right));
}

function countBy(items, keyFn) {
  return items.reduce((acc, item) => {
    const key = String(keyFn(item) || 'unknown');
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function parsePaperTrack(fileName) {
  const match = String(fileName || '').match(/_(\d)(\d)\.pdf$/i);
  return match ? Number.parseInt(match[1], 10) : null;
}

function classifyOfficialPdf(fileName, sourceType) {
  const normalizedName = String(fileName || '').trim();
  if (!normalizedName) return 'non_pdf';
  if (path.extname(normalizedName).toLowerCase() !== '.pdf') return 'non_pdf';
  if (/^wm_/i.test(normalizedName)) return 'wm_variant';
  if (/_gt\.pdf$/i.test(normalizedName)) return 'gt_variant';
  const standardPattern = STANDARD_FILE_PATTERNS[sourceType];
  if (standardPattern?.test(normalizedName)) return 'standard_approved';
  return 'other_variant';
}

function scanOfficialSourceRoot({ rootDir, sourceType, workspaceRoot }) {
  const absoluteRoot = path.join(workspaceRoot, rootDir);
  const files = listFilesRecursive(absoluteRoot);
  const entries = files.map((filePath) => {
    const fileName = path.basename(filePath);
    const classification = classifyOfficialPdf(fileName, sourceType);
    return {
      file_name: fileName,
      relative_path: toRel(workspaceRoot, filePath),
      relative_root_path: toRel(absoluteRoot, filePath),
      source_type: sourceType,
      classification,
      paper_track: parsePaperTrack(fileName),
    };
  });

  const approved = entries.filter((item) => item.classification === 'standard_approved');
  const deferred = entries.filter((item) => item.classification !== 'standard_approved');

  return {
    root: toPosix(rootDir),
    exists: fs.existsSync(absoluteRoot),
    total_files: entries.length,
    approved_files: approved.length,
    deferred_files: deferred.length,
    classification_counts: countBy(entries, (item) => item.classification),
    paper_track_counts: countBy(approved, (item) => item.paper_track || 'unknown'),
    approved_examples: approved.slice(0, 8).map((item) => item.relative_path),
    deferred_examples: deferred.slice(0, 8).map((item) => ({
      classification: item.classification,
      path: item.relative_path,
    })),
    approved_entries: approved,
  };
}

function scanResearchOnlyRoots(workspaceRoot) {
  return RESEARCH_ONLY_ROOTS.map((item) => {
    const absoluteRoot = path.join(workspaceRoot, item.root);
    const files = listFilesRecursive(absoluteRoot);
    return {
      source_type: item.source_type,
      root: item.root,
      posture: item.posture,
      reason: item.reason,
      exists: fs.existsSync(absoluteRoot),
      file_count: files.length,
      examples: files.slice(0, 8).map((filePath) => toRel(workspaceRoot, filePath)),
    };
  });
}

function sortPilotCandidates(entries = []) {
  return [...entries].sort((left, right) => {
    if ((right.paper_track || 0) !== (left.paper_track || 0)) {
      return (right.paper_track || 0) - (left.paper_track || 0);
    }
    return right.file_name.localeCompare(left.file_name);
  });
}

export function buildPilotSourceSelection(
  inventory,
  {
    subjectCode = '9709',
    paperTracks = null,
    perTrackPerSourceType = 1,
  } = {},
) {
  const subject = inventory?.subjects?.[subjectCode];
  if (!subject) {
    throw new Error(`Unknown subject in inventory: ${subjectCode}`);
  }

  const wantedTracks = Array.isArray(paperTracks) && paperTracks.length > 0
    ? paperTracks
    : (DEFAULT_PILOT_TRACKS[subjectCode] || []);

  const selected = [];
  const missing = [];

  for (const track of wantedTracks) {
    for (const sourceType of ['past_paper_pdf', 'mark_scheme_pdf']) {
      const root = subject.sources?.[sourceType];
      const matches = sortPilotCandidates(
        (root?.approved_entries || []).filter((item) => item.paper_track === track),
      ).slice(0, perTrackPerSourceType);

      if (matches.length === 0) {
        missing.push({
          paper_track: track,
          source_type: sourceType,
          reason: 'no_standard_approved_asset_found',
        });
        continue;
      }

      for (const match of matches) {
        selected.push({
          subject_code: subjectCode,
          paper_track: track,
          source_type: sourceType,
          relative_path: match.relative_path,
          file_name: match.file_name,
        });
      }
    }
  }

  return {
    generated_at: new Date().toISOString(),
    subject_code: subjectCode,
    paper_tracks: wantedTracks,
    per_track_per_source_type: perTrackPerSourceType,
    selected_count: selected.length,
    selected,
    missing,
  };
}

export function buildProductionSourceInventory({
  workspaceRoot,
  postureFile = null,
  coverageFile = null,
} = {}) {
  const rootDir = workspaceRoot || process.cwd();
  const posture = readJsonIfExists(postureFile);
  const coverage = readJsonIfExists(coverageFile);
  const researchOnly = scanResearchOnlyRoots(rootDir);

  const subjects = Object.fromEntries(
    Object.entries(SUBJECT_SOURCE_ROOTS).map(([subjectCode, config]) => {
      const sources = Object.fromEntries(
        Object.entries(config.sources).map(([sourceType, sourceRoot]) => [
          sourceType,
          scanOfficialSourceRoot({
            rootDir: sourceRoot,
            sourceType,
            workspaceRoot: rootDir,
          }),
        ]),
      );

      const localApprovedCount = Object.values(sources).reduce(
        (sum, item) => sum + Number(item.approved_files || 0),
        0,
      );
      const localDeferredCount = Object.values(sources).reduce(
        (sum, item) => sum + Number(item.deferred_files || 0),
        0,
      );
      const coverageCount = Number(coverage?.subject_counts?.[subjectCode] || 0);

      return [
        subjectCode,
        {
          label: config.label,
          sources,
          local_summary: {
            approved_file_count: localApprovedCount,
            deferred_file_count: localDeferredCount,
          },
          coverage_status: {
            restricted_official_rows: coverageCount,
            present_in_restricted_official_coverage: coverageCount > 0,
            production_safe_rows_legacy: coverageCount,
            present_in_production_coverage_legacy: coverageCount > 0,
          },
        },
      ];
    }),
  );

  const missingTargetSubjects = Array.isArray(posture?.missing_target_subjects)
    ? posture.missing_target_subjects
    : [];

  return {
    generated_at: new Date().toISOString(),
    inputs: {
      posture_file: postureFile ? toRel(rootDir, postureFile) : null,
      coverage_file: coverageFile ? toRel(rootDir, coverageFile) : null,
    },
    production_policy: {
      canonical_mode: 'restricted_official',
      legacy_alias_mode: 'production',
      allowed_source_types: posture?.allowed_source_types || ['past_paper_pdf', 'mark_scheme_pdf'],
      note_md_is_production_eligible: posture?.note_md_is_production_eligible ?? false,
      notes: [
        'Historical posture artifacts still use the name production.',
        'For new Step 3 work, interpret official qp/ms coverage as restricted internal official corpus coverage.',
      ],
    },
    subjects,
    research_only_sources: researchOnly,
    gap_assessment: {
      missing_target_subjects: missingTargetSubjects,
      restricted_official_coverage_subjects: Object.entries(subjects)
        .filter(([, item]) => item.coverage_status.present_in_restricted_official_coverage)
        .map(([subjectCode]) => subjectCode),
      local_assets_without_restricted_official_coverage: Object.entries(subjects)
        .filter(([, item]) => item.local_summary.approved_file_count > 0 && !item.coverage_status.present_in_restricted_official_coverage)
        .map(([subjectCode]) => subjectCode),
      production_coverage_subjects_legacy: Object.entries(subjects)
        .filter(([, item]) => item.coverage_status.present_in_restricted_official_coverage)
        .map(([subjectCode]) => subjectCode),
      local_assets_without_production_coverage_legacy: Object.entries(subjects)
        .filter(([, item]) => item.local_summary.approved_file_count > 0 && !item.coverage_status.present_in_restricted_official_coverage)
        .map(([subjectCode]) => subjectCode),
    },
  };
}

export function renderProductionSourceInventoryReport(inventory) {
  const lines = [
    '# RAG Restricted Official Source Inventory',
    '',
    `- Generated at: \`${inventory.generated_at}\``,
    `- Posture file: \`${inventory.inputs?.posture_file || 'n/a'}\``,
    `- Coverage file: \`${inventory.inputs?.coverage_file || 'n/a'}\``,
    `- canonical_mode: \`${inventory.production_policy?.canonical_mode || 'restricted_official'}\``,
    `- legacy_alias_mode: \`${inventory.production_policy?.legacy_alias_mode || 'production'}\``,
    `- allowed_source_types: \`${JSON.stringify(inventory.production_policy?.allowed_source_types || [])}\``,
    `- note_md_is_production_eligible: \`${inventory.production_policy?.note_md_is_production_eligible}\``,
    '',
    '## Subject Inventory',
    '',
  ];

  for (const [subjectCode, subject] of Object.entries(inventory.subjects || {})) {
    lines.push(`### ${subjectCode} ${subject.label}`, '');
    lines.push(`- local approved files: \`${subject.local_summary?.approved_file_count || 0}\``);
    lines.push(`- local deferred files: \`${subject.local_summary?.deferred_file_count || 0}\``);
    lines.push(`- restricted-official rows in DB: \`${subject.coverage_status?.restricted_official_rows || 0}\``);
    lines.push(`- present in restricted-official coverage: \`${subject.coverage_status?.present_in_restricted_official_coverage}\``);
    lines.push('');

    for (const [sourceType, root] of Object.entries(subject.sources || {})) {
      lines.push(`- ${sourceType} root: \`${root.root}\``);
      lines.push(`  approved_files=\`${root.approved_files || 0}\` deferred_files=\`${root.deferred_files || 0}\``);
      lines.push(`  classification_counts=\`${JSON.stringify(root.classification_counts || {})}\``);
      lines.push(`  paper_track_counts=\`${JSON.stringify(root.paper_track_counts || {})}\``);
    }

    lines.push('');
  }

  lines.push('## Research-Only Sources', '');
  for (const item of inventory.research_only_sources || []) {
    lines.push(`- ${item.source_type}: root=\`${item.root}\` file_count=\`${item.file_count || 0}\` posture=\`${item.posture}\``);
    lines.push(`  reason=\`${item.reason}\``);
  }

  lines.push('', '## Gap Assessment', '');
  lines.push(`- missing_target_subjects: \`${JSON.stringify(inventory.gap_assessment?.missing_target_subjects || [])}\``);
  lines.push(`- restricted_official_coverage_subjects: \`${JSON.stringify(inventory.gap_assessment?.restricted_official_coverage_subjects || [])}\``);
  lines.push(`- local_assets_without_restricted_official_coverage: \`${JSON.stringify(inventory.gap_assessment?.local_assets_without_restricted_official_coverage || [])}\``);

  return `${lines.join('\n')}\n`;
}
