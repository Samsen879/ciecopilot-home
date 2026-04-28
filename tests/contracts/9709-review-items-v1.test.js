import fs from 'node:fs';
import path from 'node:path';

const reviewItemsPath = path.join(process.cwd(), 'data/syllabus/9709/review_items_v1.json');
const reportPath = path.join(process.cwd(), 'docs/reports/9709-syllabus-human-review-pack.md');
const rawSectionsPath = path.join(process.cwd(), 'data/syllabus/9709/raw_sections_v1.json');
const sourceInventoryPath = path.join(process.cwd(), 'data/syllabus/9709/source_inventory.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

const requiredCategories = [
  'merge_split_candidate',
  'ambiguous_boundary',
  'component_conflict',
  'naming_or_id_issue',
  'unmapped_official_bullet',
];

describe('9709 human review items v1', () => {
  test('publishes a compact machine-readable human review queue and report', () => {
    const artifact = readJson(reviewItemsPath);
    const report = fs.readFileSync(reportPath, 'utf8');

    expect(artifact.schema_version).toBe('9709_review_items_v1');
    expect(artifact.issue).toBe(292);
    expect(artifact.parent_tracker).toBe(286);
    expect(artifact.reusable_by_issue).toBe(293);
    expect(artifact.review_items.length).toBeGreaterThan(0);
    expect(artifact.review_items.length).toBeLessThanOrEqual(10);
    expect(artifact.review_policy.excludes_low_risk_items).toBe(true);
    expect(artifact.approved_baseline_freeze_attempted).toBe(false);

    const categories = artifact.review_items.map((item) => item.category);
    expect(categories).toEqual(expect.arrayContaining(requiredCategories));

    expect(report).toContain('Issue: #292');
    expect(report).toContain('Machine-readable decisions');
    for (const item of artifact.review_items) {
      expect(report).toContain(item.item_id);
    }
  });

  test('makes every human decision reusable by the follow-up approval issue', () => {
    const artifact = readJson(reviewItemsPath);
    const ids = new Set();

    for (const item of artifact.review_items) {
      expect(ids.has(item.item_id)).toBe(false);
      ids.add(item.item_id);
      expect(requiredCategories).toContain(item.category);
      expect(['low', 'medium', 'high']).toContain(item.risk_level);
      expect(item.source_refs.length).toBeGreaterThan(0);
      expect(item.recommended_options.length).toBeGreaterThanOrEqual(2);
      expect(item.downstream_impact).toEqual(
        expect.objectContaining({
          affected_artifacts: expect.any(Array),
          issue_293_reuse: expect.any(String),
        }),
      );
      expect(item.decision).toEqual(
        expect.objectContaining({
          status: 'pending',
          selected_option_id: null,
          reusable_by_issue: 293,
        }),
      );

      const optionIds = new Set(item.recommended_options.map((option) => option.option_id));
      expect(optionIds.size).toBe(item.recommended_options.length);
      for (const option of item.recommended_options) {
        expect(option.label).toEqual(expect.any(String));
        expect(option.machine_action).toEqual(expect.any(String));
        expect(option.resulting_contract_change).toEqual(expect.any(String));
      }
    }
  });

  test('keeps source references anchored in the locked official extraction layer', () => {
    const artifact = readJson(reviewItemsPath);
    const rawSections = readJson(rawSectionsPath);
    const sourceInventory = readJson(sourceInventoryPath);
    const rawById = new Map(rawSections.sections.map((section) => [section.section_id, section]));
    const officialSourceIds = new Set(
      sourceInventory.official_sources.map((source) => source.id),
    );

    expect(officialSourceIds.has(artifact.source_lock.source_document_id)).toBe(true);

    for (const item of artifact.review_items) {
      for (const sourceRef of item.source_refs) {
        expect(sourceRef.source_type).toBe('official_syllabus');
        expect(officialSourceIds.has(sourceRef.source_document_id)).toBe(true);
        expect(rawById.has(sourceRef.raw_section_id)).toBe(true);
        expect(sourceRef.locator).toEqual(expect.any(String));
      }
    }
  });
});
