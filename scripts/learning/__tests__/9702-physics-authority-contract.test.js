import fs from 'node:fs';
import path from 'node:path';

function rootPath(relativePath) {
  return path.resolve(process.cwd(), relativePath);
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(rootPath(relativePath), 'utf8'));
}

function componentIdsFromInventory() {
  const inventory = readJson('docs/reports/2026-06-09-9702-source-truth-inventory.json');
  return Object.keys(inventory?.summary?.by_component || {}).sort((a, b) => Number(a) - Number(b));
}

describe('9702 Physics authority contract and seed', () => {
  test('contract is conservative component-level and does not claim detailed canonical topics', () => {
    const contract = readJson('data/contracts/9702_physics_authority_contract_v1.json');
    const expectedComponents = componentIdsFromInventory();

    expect(contract.schema_version).toBe('9702_physics_authority_contract_v1');
    expect(contract.contract_id).toBe('9702_physics_authority_contract_v1');
    expect(contract.subject_code).toBe('9702');
    expect(contract.production_ready_claimed).toBe(false);
    expect(contract.canonical_syllabus_detailed_topic_claimed).toBe(false);

    expect(contract.official_syllabus_source).toMatchObject({
      available: false,
      status: 'missing',
    });

    expect(contract.source_truth_inventory).toMatchObject({
      inventory_report: 'docs/reports/2026-06-09-9702-source-truth-inventory.json',
      source_root: 'data/past-papers/9702Physics',
      production_ready_claimed: false,
      status: 'pass',
      blocker_count: 0,
    });

    expect(Array.isArray(contract.components)).toBe(true);
    expect(contract.components).toHaveLength(expectedComponents.length);

    const componentsById = new Map(contract.components.map((entry) => [String(entry.component_id), entry]));
    expect(Array.from(componentsById.keys()).sort((a, b) => Number(a) - Number(b))).toEqual(expectedComponents);

    for (const componentId of expectedComponents) {
      const component = componentsById.get(componentId);
      expect(component).toBeDefined();
      expect(component.status).toBe('accepted');
      expect(component.canonical_syllabus_detailed_topic_claimed).toBe(false);
      expect(component.subject_code).toBeUndefined();

      const paper = Number(component.paper);
      expect(Number.isInteger(paper)).toBe(true);
      expect(paper).toBeGreaterThanOrEqual(1);
      expect(paper).toBeLessThanOrEqual(5);

      expect(component.component_path).toBe(`9702.p${paper}.c${componentId}`);
      expect(component.component_scope?.authority_level).toBe('component_scoped');
      expect(component.component_scope?.allowed_questions).toBe('all_rows_for_matching_component_id');
      expect(component.component_scope?.fallback_authority_topic_path).toBe(`9702.p${paper}`);

      expect(component.deterministic_topic_hints?.length).toBeGreaterThan(0);
      for (const hint of component.deterministic_topic_hints || []) {
        expect(hint.topic_path).toMatch(/^9702\.p[1-5]$/);
        expect(hint.hint_status).toBe('paper_scope_fallback');
        expect(hint.evidence).toContain('component_id_in_source_pdf_filename');
      }
    }

    const nonPhysicsHints = contract.components
      .flatMap((component) => (component.deterministic_topic_hints || []))
      .filter((hint) => !String(hint.topic_path).startsWith('9702.'));
    expect(nonPhysicsHints).toHaveLength(0);

    expect(contract.components.every((entry) => entry.component_scope.authority_level === 'component_scoped')).toBe(true);
  });

  test('seed mirrors contract components and is component-aligned only', () => {
    const contract = readJson('data/contracts/9702_physics_authority_contract_v1.json');
    const seed = readJson('data/manifests/9702_physics_component_authority_seed_v1.json');
    const expectedComponents = componentIdsFromInventory();

    expect(seed.schema_version).toBe('9702_physics_component_authority_seed_v1');
    expect(seed.seed_id).toBe('9702_physics_component_authority_seed_v1');
    expect(seed.contract_id).toBe(contract.contract_id);
    expect(seed.subject_code).toBe('9702');
    expect(seed.production_ready_claimed).toBe(false);
    expect(seed.canonical_syllabus_detailed_topic_claimed).toBe(false);
    expect(seed.source_truth_inventory_report).toBe('docs/reports/2026-06-09-9702-source-truth-inventory.json');
    expect(seed.source_truth_inventory_status).toBe('pass');
    expect(Array.isArray(seed.component_authority_items)).toBe(true);
    expect(seed.component_authority_items).toHaveLength(expectedComponents.length);

    const contractMap = new Map(contract.components.map((entry) => [String(entry.component_id), entry]));
    const seedMap = new Map(seed.component_authority_items.map((entry) => [String(entry.component_id), entry]));
    expect(Array.from(seedMap.keys()).sort((a, b) => Number(a) - Number(b))).toEqual(expectedComponents);

    for (const componentId of expectedComponents) {
      const contractEntry = contractMap.get(componentId);
      const seedEntry = seedMap.get(componentId);
      expect(seedEntry).toBeDefined();
      expect(contractEntry).toBeDefined();

      expect(seedEntry.status).toBe('accepted');
      expect(seedEntry.canonical_syllabus_detailed_topic_claimed).toBeUndefined();
      expect(seedEntry.component_path).toBe(`9702.p${contractEntry.paper}.c${componentId}`);
      expect(seedEntry.paper).toBe(contractEntry.paper);
      expect(seedEntry.row_alignment).toMatchObject({
        source_key: 'component_id_from_source_pdf',
        authority_target: contractEntry.component_path,
        canonical_syllabus_detailed_topic_claimed: false,
      });

      expect(seedEntry.component_scope?.authority_level).toBe('component_scoped');
      expect(seedEntry.component_scope?.fallback_authority_topic_path).toBe(`9702.p${contractEntry.paper}`);

      const hints = seedEntry.deterministic_topic_hints || [];
      expect(hints.length).toBe(1);
      expect(hints[0].topic_path).toBe(`9702.p${contractEntry.paper}`);
      expect(hints[0].hint_status).toBe('paper_scope_fallback');
      expect(hints[0].evidence).toContain('derived_from_component_id_in_source_pdf_filename');
    }

    const seedDetailedClaims = seed.component_authority_items
      .filter((entry) => entry.row_alignment?.canonical_syllabus_detailed_topic_claimed)
      .length;
    expect(seedDetailedClaims).toBe(0);
  });
});
