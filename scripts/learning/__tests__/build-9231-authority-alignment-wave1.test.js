import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  build9231AuthorityAlignmentWave1,
  buildAuthorityAlignmentItem,
  write9231AuthorityAlignmentArtifacts,
} from '../build_9231_authority_alignment_wave1.js';

function fixtureRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), '9231-authority-wave1-'));
}

function writeJson(root, repoPath, payload) {
  const filePath = path.join(root, repoPath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function baseV2Item(overrides = {}) {
  return {
    schema_version: 'question_plain_text_v2',
    storage_key: '9231/s16_qp_11/questions/q01.png',
    subject_code: '9231',
    year: 2016,
    session: 's',
    paper: 1,
    variant: 1,
    q_number: 1,
    source_pdf: 'data/past-papers/9231Further-Mathematics/paper1/9231_s16_qp_11.pdf',
    normalized_plain_text: 'The roots of the cubic equation are alpha, beta and gamma.',
    text_only_addressable: true,
    requires_image_context: false,
    image_assets: ['data/crops/9231/q01.png'],
    ...overrides,
  };
}

describe('9231 authority alignment wave1', () => {
  test('assigns component authority and deterministic topic hints from v2 text', () => {
    const item = buildAuthorityAlignmentItem(baseV2Item());

    expect(item).toMatchObject({
      storage_key: '9231/s16_qp_11/questions/q01.png',
      primary_topic_path: '9231.p1.polynomials_roots',
      authority_alignment_status: 'component_aligned_topic_hint_recorded',
      canonical_syllabus_detailed_topic_claimed: false,
      component_authority: {
        status: 'component_aligned_from_paper_code',
        component_path: '9231.p1',
        component_title: 'Further Pure Mathematics 1',
      },
      topic_authority: {
        status: 'deterministic_topic_hint_assigned',
        topic_id: 'polynomials_roots',
      },
      blockers: [],
    });
  });

  test('keeps component-level alignment when detailed topic remains unresolved', () => {
    const item = buildAuthorityAlignmentItem(baseV2Item({
      normalized_plain_text: 'Find the exact value of k.',
    }));

    expect(item.primary_topic_path).toBe('9231.p1');
    expect(item.topic_authority.status).toBe('detailed_topic_unresolved');
    expect(item.warnings).toContain('detailed_topic_unresolved_by_local_heuristic');
    expect(item.blockers).toEqual([]);
  });

  test('writes an aggregate sidecar and blocks unknown paper components', () => {
    const root = fixtureRoot();
    writeJson(root, 'docs/reports/2026-06-05-9231-question-plain-text-v2.json', {
      schema_version: '9231_question_plain_text_v2',
      status: 'pass',
      subject_code: '9231',
      items: [
        baseV2Item(),
        baseV2Item({
          storage_key: '9231/s16_qp_91/questions/q01.png',
          paper: 9,
          normalized_plain_text: 'Find the probability that X is greater than 3.',
        }),
      ],
    });

    const layer = build9231AuthorityAlignmentWave1({ rootDir: root });
    write9231AuthorityAlignmentArtifacts({ rootDir: root, layer });

    expect(layer.status).toBe('blocked');
    expect(layer.summary).toMatchObject({
      rows: 2,
      component_aligned_rows: 1,
      topic_hint_rows: 2,
      component_unresolved_rows: 1,
      canonical_syllabus_detailed_topic_claimed_rows: 0,
      blockers: 1,
    });
    expect(layer.blockers[0]).toMatchObject({
      check: 'component_authority_unresolved',
      storage_key: '9231/s16_qp_91/questions/q01.png',
    });
    expect(fs.existsSync(path.join(root, 'docs/reports/2026-06-05-9231-authority-alignment-wave1.json'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'docs/reports/2026-06-05-9231-authority-alignment-wave1.md'))).toBe(true);
  });
});
