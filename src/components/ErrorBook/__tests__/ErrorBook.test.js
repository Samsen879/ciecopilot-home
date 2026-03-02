/**
 * ErrorBook 前端回归测试 — 字段可见性与数据转换
 *
 * 由于项目未安装 React Testing Library，这里测试数据转换逻辑
 * 和条件渲染判断函数，确保 source/metadata 字段正确映射。
 */
import { transformErrorBookRecord as transformRecord } from '../../../services/errorBookTransform.js';

/** Mirrors the source label rendering logic in the list card */
function getSourceLabel(source) {
  return source === 'mark_engine_auto' ? '自动' : '手工';
}

/** Mirrors the conditional check for showing auto-metadata section */
function shouldShowMetadata(error) {
  return (
    error.source === 'mark_engine_auto' &&
    error.metadata &&
    Object.keys(error.metadata).length > 0
  );
}

// ---- Fixtures ----

const autoRecord = {
  id: 'a1',
  syllabus_code: '9709',
  paper: 1,
  topic: {
    id: 'topic-1',
    name: 'Functions',
  },
  question: 'Q1',
  user_answer: 'wrong',
  correct_answer: 'right',
  explanation: 'because',
  created_at: '2025-06-01T00:00:00Z',
  storage_key: '9709/p1/q01.png',
  node_id: 'node-abc',
  source: 'mark_engine_auto',
  metadata: {
    rubric_id: 'rub-001',
    run_id: 'run-001',
    rubric_source_version: 'ext:openai:gpt4:v1',
    decision_reason: 'below_threshold',
    scoring_engine_version: 'b2_smart_mark_engine_v1',
    mark_label: 'M1',
  },
};

const manualRecord = {
  id: 'm1',
  syllabus_code: '9702',
  paper: 'Paper 3',
  topic_name: 'Mechanics',
  question: 'Q2',
  user_answer: 'oops',
  correct_answer: 'correct',
  explanation: 'reason',
  created_at: '2025-06-02T00:00:00Z',
  storage_key: '9702/p1/q02.png',
  node_id: 'node-xyz',
  source: 'manual',
  metadata: {},
};

const nullSourceRecord = {
  id: 'n1',
  question: 'Q3',
  user_answer: 'a',
  correct_answer: 'b',
  explanation: 'c',
  created_at: '2025-06-03T00:00:00Z',
  // source and metadata intentionally missing
};

// ---- Tests ----

describe('ErrorBook data transform', () => {
  test('auto record: source is mark_engine_auto', () => {
    const t = transformRecord(autoRecord);
    expect(t.source).toBe('mark_engine_auto');
  });

  test('manual record: source is manual', () => {
    const t = transformRecord(manualRecord);
    expect(t.source).toBe('manual');
  });

  test('numeric paper is normalized to display label', () => {
    const t = transformRecord(autoRecord);
    expect(t.paper).toBe('Paper 1');
  });

  test('null source defaults to manual', () => {
    const t = transformRecord(nullSourceRecord);
    expect(t.source).toBe('manual');
  });

  test('null metadata defaults to empty object', () => {
    const t = transformRecord(nullSourceRecord);
    expect(t.metadata).toEqual({});
  });

  test('auto record preserves all metadata fields', () => {
    const t = transformRecord(autoRecord);
    expect(t.metadata.rubric_id).toBe('rub-001');
    expect(t.metadata.run_id).toBe('run-001');
    expect(t.metadata.rubric_source_version).toBe('ext:openai:gpt4:v1');
    expect(t.metadata.decision_reason).toBe('below_threshold');
  });
});

describe('Source label rendering logic', () => {
  test('auto source shows 自动', () => {
    expect(getSourceLabel('mark_engine_auto')).toBe('自动');
  });

  test('manual source shows 手工', () => {
    expect(getSourceLabel('manual')).toBe('手工');
  });

  test('undefined source shows 手工 (fallback)', () => {
    expect(getSourceLabel(undefined)).toBe('手工');
  });
});

describe('Metadata section visibility', () => {
  test('auto record with metadata → show section', () => {
    const t = transformRecord(autoRecord);
    expect(shouldShowMetadata(t)).toBe(true);
  });

  test('manual record → hide section', () => {
    const t = transformRecord(manualRecord);
    expect(shouldShowMetadata(t)).toBe(false);
  });

  test('auto record with empty metadata → hide section', () => {
    const t = transformRecord({ ...autoRecord, metadata: {} });
    expect(shouldShowMetadata(t)).toBe(false);
  });

  test('null source record → hide section', () => {
    const t = transformRecord(nullSourceRecord);
    expect(shouldShowMetadata(t)).toBe(false);
  });
});

describe('storageKey and nodeId compatibility', () => {
  test('storageKey preserved from record', () => {
    const t = transformRecord(autoRecord);
    expect(t.storageKey).toBe('9709/p1/q01.png');
  });

  test('nodeId preserved from record', () => {
    const t = transformRecord(autoRecord);
    expect(t.nodeId).toBe('node-abc');
  });

  test('enrichment storageKey is used as fallback', () => {
    const t = transformRecord({
      ...nullSourceRecord,
      enrichment: {
        attempt: {
          storage_key: '9709/p1/q09.png',
        },
      },
    });
    expect(t.storageKey).toBe('9709/p1/q09.png');
  });

  test('missing storageKey defaults to null', () => {
    const t = transformRecord(nullSourceRecord);
    expect(t.storageKey).toBeNull();
  });

  test('missing nodeId defaults to null', () => {
    const t = transformRecord(nullSourceRecord);
    expect(t.nodeId).toBeNull();
  });
});
