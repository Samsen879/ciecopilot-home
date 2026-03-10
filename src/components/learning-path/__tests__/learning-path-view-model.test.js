import {
  createLearningPathViewModel,
  deriveLearningPathSurfaceState,
  hasUsableLearningPath,
  serializeGeneratedLearningPathForStorage,
} from '../learning-path-view-model.js';

describe('learning path view model', () => {
  const generatedPayload = {
    data: {
      learning_path: {
        total_topics: 2,
        estimated_duration: 14,
        daily_study_time: 45,
        target_mastery: 0.85,
        timeline: [
          {
            topic_id: 'topic-1',
            topic_name: 'Functions',
            current_mastery: 0.4,
            target_mastery: 0.8,
            allocated_time: 90,
            priority_reason: 'Function basics still block later topics.',
            sessions: [
              {
                day: 1,
                activity_type: 'practice',
                difficulty_level: 'intermediate',
              },
            ],
          },
        ],
        milestones: [
          {
            milestone_id: 'ms-1',
            day: 7,
            title: 'Week 1 checkpoint',
            description: 'Complete function basics.',
          },
        ],
        adaptive_rules: {
          performance_adjustment: {
            high_performance: {
              action: 'increase_difficulty',
              description: 'Increase difficulty when performance is strong.',
            },
          },
        },
      },
      next_steps: ['Start with Functions'],
      user_state: {
        total_topics: 10,
      },
    },
  };

  it('maps generated payloads into a stable page model and storage snapshot', () => {
    const storage = serializeGeneratedLearningPathForStorage(generatedPayload, {
      userId: 'user-1',
      subjectCode: '9709',
      preferences: {
        difficulty_progression: 'adaptive',
      },
    });

    expect(storage).toEqual(expect.objectContaining({
      userId: 'user-1',
      subjectCode: '9709',
      estimatedCompletionMinutes: 630,
      difficultyProgression: 'adaptive',
    }));
    expect(storage.topicsSequence).toHaveLength(1);
    expect(storage.adaptiveRules.next_steps).toEqual(['Start with Functions']);

    const viewModel = createLearningPathViewModel({
      generatedPayload,
      subjectCode: '9709',
      now: new Date('2026-03-10T12:00:00.000Z').getTime(),
    });

    expect(viewModel).toEqual(expect.objectContaining({
      source: 'generated',
      completionPercentage: 0,
      estimatedDurationLabel: '10 小时 30 分钟',
      dailyCommitmentLabel: '45 分钟',
      targetMasteryPercentage: 85,
    }));
    expect(viewModel.timeline[0]).toEqual(expect.objectContaining({
      title: 'Functions',
      status: 'in_progress',
      durationLabel: '1 小时 30 分钟',
      activityLabel: 'practice',
    }));
    expect(viewModel.adaptiveRules[0]).toEqual(expect.objectContaining({
      label: 'increase_difficulty',
    }));
    expect(deriveLearningPathSurfaceState({
      isAuthenticated: true,
      isLoading: false,
      error: null,
      viewModel,
    })).toBe('ready');
  });

  it('detects stored stale paths and rejects empty snapshots', () => {
    const storedRecord = {
      title: 'Math learning path',
      subject_code: '9709',
      estimated_completion_time: 300,
      updated_at: '2026-02-25T00:00:00.000Z',
      topics_sequence: [
        {
          topic_id: 'topic-2',
          topic_name: 'Vectors',
          current_mastery: 0.2,
          target_mastery: 0.8,
          allocated_time: 60,
          sessions: [],
        },
      ],
      adaptive_rules: {
        milestones: [],
        next_steps: [],
        target_mastery: 0.8,
        daily_study_time: 30,
      },
    };

    expect(hasUsableLearningPath(storedRecord)).toBe(true);
    expect(hasUsableLearningPath({ topics_sequence: [], adaptive_rules: {} })).toBe(false);

    const viewModel = createLearningPathViewModel({
      storedRecord,
      subjectCode: '9709',
      now: new Date('2026-03-10T12:00:00.000Z').getTime(),
    });

    expect(viewModel.stale).toBe(true);
    expect(deriveLearningPathSurfaceState({
      isAuthenticated: true,
      isLoading: false,
      error: null,
      viewModel,
    })).toBe('stale');

    expect(deriveLearningPathSurfaceState({
      isAuthenticated: true,
      isLoading: false,
      error: new Error('empty'),
      viewModel: null,
    })).toBe('error');
  });
});
