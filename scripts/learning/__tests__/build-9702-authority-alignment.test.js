import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  build9702AuthorityAlignment,
} from '../build_9702_authority_alignment.js';

function fixtureRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), '9702-authority-alignment-'));
}

function writeJson(root, repoPath, payload) {
  const filePath = path.join(root, repoPath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function writeContract(root) {
  writeJson(root, 'data/contracts/9702_physics_authority_contract_v1.json', {
    schema_version: '9702_physics_authority_contract_v1',
    contract_id: '9702_physics_authority_contract_v1',
    subject_code: '9702',
    status: 'active',
    production_ready_claimed: false,
    canonical_syllabus_detailed_topic_claimed: false,
    components: [{
      component_id: '12',
      paper: 1,
      component_path: '9702.p1.c12',
      component_scope: {
        authority_level: 'component_scoped',
        fallback_authority_topic_path: '9702.p1',
      },
      deterministic_topic_hints: [{
        topic_path: '9702.p1',
        hint_status: 'paper_scope_fallback',
        evidence: 'derived_from_component_id_in_source_pdf_filename',
      }],
      canonical_syllabus_detailed_topic_claimed: false,
      status: 'accepted',
    }],
  });
}

describe('9702 authority alignment', () => {
  test('aligns every row to the Phase 2 component authority contract without detailed topic claims', () => {
    const root = fixtureRoot();
    writeContract(root);
    writeJson(root, 'docs/reports/2026-06-10-9702-question-plain-text-v2.json', {
      schema_version: '9702_question_plain_text_v2',
      status: 'pass',
      subject_code: '9702',
      summary: {
        production_rows: 1,
        v2_rows: 1,
        normalized_plain_text_rows: 1,
        blockers: 0,
      },
      blockers: [],
      items: [{
        storage_key: '9702/m17_qp_12/questions/q01.png',
        subject_code: '9702',
        year: 2017,
        session: 'm',
        paper: 1,
        variant: 2,
        q_number: 1,
        source_pdf: 'data/past-papers/9702Physics/paper1/9702_m17_qp_12.pdf',
        normalized_plain_text: 'Which expression has the same base units as pressure?',
      }],
    });

    const layer = build9702AuthorityAlignment({
      rootDir: root,
      generatedOn: '2026-06-10',
    });

    expect(layer.status).toBe('pass');
    expect(layer.production_ready_claimed).toBe(false);
    expect(layer.summary).toMatchObject({
      rows: 1,
      component_aligned_rows: 1,
      topic_hint_rows: 1,
      detailed_topic_unresolved_rows: 1,
      canonical_syllabus_detailed_topic_claimed_rows: 0,
      blockers: 0,
    });
    expect(layer.items[0]).toMatchObject({
      storage_key: '9702/m17_qp_12/questions/q01.png',
      component_id: '12',
      primary_topic_path: '9702.p1',
      authority_alignment_status: 'component_aligned_topic_hint_recorded',
      canonical_syllabus_detailed_topic_claimed: false,
      component_authority: {
        status: 'component_aligned_from_paper_code',
        component_path: '9702.p1.c12',
      },
      topic_authority: {
        status: 'deterministic_topic_hint_assigned',
        topic_path: '9702.p1',
      },
    });
  });
});
