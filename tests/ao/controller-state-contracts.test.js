import { describe, expect, it } from '@jest/globals';

import {
  createControllerCursorRecord,
  createEmptyControlPlaneState,
  createObservationRecord,
  OBSERVATION_SOURCE_KINDS,
} from '../../scripts/ao/lib/state-contracts.js';

const NOW = '2026-03-29T06:00:00.000Z';

describe('ao controller state contracts', () => {
  it('exports frozen poll-observation source kinds', () => {
    expect(OBSERVATION_SOURCE_KINDS).toEqual(['ao_poll', 'github_poll']);
  });

  it('creates durable observation and controller cursor records', () => {
    expect(createObservationRecord({
      observation_id: 'obs-1',
      task_id: 'issue-89',
      source_kind: 'ao_poll',
      cursor: 'cursor-1',
      observed_at: NOW,
      recorded_at: NOW,
      summary: 'Observed AO worker state for issue-89.',
      payload: {
        workers: [{ session_name: 'cie-50' }],
      },
    })).toEqual({
      observation_id: 'obs-1',
      task_id: 'issue-89',
      source_kind: 'ao_poll',
      cursor: 'cursor-1',
      observed_at: NOW,
      recorded_at: NOW,
      summary: 'Observed AO worker state for issue-89.',
      payload: {
        workers: [{ session_name: 'cie-50' }],
      },
    });

    expect(createControllerCursorRecord({
      cursor_id: 'default:issue-89:ao_poll',
      controller_id: 'default',
      task_id: 'issue-89',
      source_kind: 'ao_poll',
      last_cursor: 'cursor-1',
      observed_at: NOW,
      updated_at: NOW,
    })).toEqual({
      cursor_id: 'default:issue-89:ao_poll',
      controller_id: 'default',
      task_id: 'issue-89',
      source_kind: 'ao_poll',
      last_cursor: 'cursor-1',
      observed_at: NOW,
      updated_at: NOW,
    });
  });

  it('extends empty control-plane state with observation and cursor collections', () => {
    expect(createEmptyControlPlaneState({
      project_id: 'ciecopilot-home',
      created_at: NOW,
      updated_at: NOW,
    })).toMatchObject({
      project_id: 'ciecopilot-home',
      observations: [],
      controller_cursors: [],
    });
  });
});
