describe('adapter-method-dispatcher', () => {
  test('executes the approved pilot adapter methods and preserves dependency gating', async () => {
    const {
      runPilotAdapterRuntime,
      PILOT_9709_ADAPTER_METHODS,
    } = await import('../lib/marking/adapter-method-dispatcher.js');

    const template = {
      question_type_id: '9709.integration.application',
      parts: [
        {
          part_id: 'main',
          points: [
            {
              point_id: 'transform',
              official_mark_notation: 'M1',
              mark_family: 'M',
              max_score: 1,
              verification_condition: {
                kind: 'adapter_call',
                adapter_method: 'transform_bundle_check',
                params: {
                  requires_substitution: true,
                },
              },
            },
            {
              point_id: 'symbolic',
              official_mark_notation: 'A1',
              mark_family: 'A',
              max_score: 1,
              verification_condition: {
                kind: 'adapter_call',
                adapter_method: 'symbolic_check',
                params: {
                  expects_exact_integral: true,
                },
              },
              dependency_chain: {
                prerequisite_point_ids: ['transform'],
                prerequisite_policy: 'all',
                strict: true,
              },
            },
            {
              point_id: 'numeric',
              official_mark_notation: 'B1',
              mark_family: 'B',
              max_score: 1,
              verification_condition: {
                kind: 'adapter_call',
                adapter_method: 'numeric_check',
                params: {
                  requires_initial_condition: true,
                },
              },
            },
            {
              point_id: 'proof',
              official_mark_notation: 'C1',
              mark_family: 'C',
              max_score: 1,
              verification_condition: {
                kind: 'adapter_call',
                adapter_method: 'proof_structure_check',
                params: {
                  requires_identity_rewrite: true,
                },
              },
            },
          ],
        },
      ],
    };

    const result = runPilotAdapterRuntime({
      rubricTemplate: template,
      studentSteps: [
        { step_id: 's1', text: 'Let u = x^2 + 1 so the substitution is explicit.' },
        { step_id: 's2', text: 'Therefore the exact integral is ln(x^2 + 1) + C.' },
        { step_id: 's3', text: 'Using x = 0 and y = 1 gives C = 1.' },
        { step_id: 's4', text: 'sin^2 x + cos^2 x = 1 proves the rewrite.' },
      ],
      includeUncertainReason: true,
    });

    expect(PILOT_9709_ADAPTER_METHODS).toEqual([
      'numeric_check',
      'proof_structure_check',
      'symbolic_check',
      'transform_bundle_check',
    ]);
    expect(result.decisions).toEqual([
      expect.objectContaining({
        rubric_id: 'transform',
        reason: 'pilot_adapter_match',
        awarded: true,
      }),
      expect.objectContaining({
        rubric_id: 'symbolic',
        reason: 'pilot_adapter_match',
        awarded: true,
      }),
      expect.objectContaining({
        rubric_id: 'numeric',
        reason: 'pilot_adapter_match',
        awarded: true,
      }),
      expect.objectContaining({
        rubric_id: 'proof',
        reason: 'pilot_adapter_match',
        awarded: true,
      }),
    ]);
    expect(result.rubric_points).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rubric_id: 'symbolic',
          depends_on: ['transform'],
        }),
      ]),
    );
  });

  test('builds compat v0 alignments from remaining rubric order when later pilot steps lack direct evidence spans', async () => {
    const { runPilotAdapterRuntime } = await import('../lib/marking/adapter-method-dispatcher.js');

    const template = {
      question_type_id: '9709.trigonometry.identities',
      parts: [
        {
          part_id: 'main',
          points: [
            {
              point_id: 'identity-rewrite',
              official_mark_notation: 'M1',
              mark_family: 'M',
              max_score: 1,
              verification_condition: {
                kind: 'adapter_call',
                adapter_method: 'proof_structure_check',
                params: {
                  requires_identity_rewrite: true,
                },
              },
            },
            {
              point_id: 'identity-result',
              official_mark_notation: 'A1',
              mark_family: 'A',
              max_score: 1,
              verification_condition: {
                kind: 'adapter_call',
                adapter_method: 'symbolic_check',
                params: {
                  expects_target_identity: true,
                },
              },
              dependency_chain: {
                prerequisite_point_ids: ['identity-rewrite'],
                prerequisite_policy: 'all',
                strict: true,
              },
            },
          ],
        },
      ],
    };

    const result = runPilotAdapterRuntime({
      rubricTemplate: template,
      compatMode: 'v0',
      studentSteps: [
        { step_id: 's1', text: 'sin^2 x + cos^2 x = 1' },
        { step_id: 's2', text: 'Hence the target identity is proved.' },
      ],
    });

    expect(result.alignments).toEqual([
      expect.objectContaining({
        step_id: 's1',
        status: 'aligned',
        rubric_id: 'identity-rewrite',
        mark_label: 'M1',
        reason: 'pilot_adapter_match',
      }),
      expect.objectContaining({
        step_id: 's2',
        status: 'aligned',
        rubric_id: 'identity-result',
        mark_label: 'A1',
        reason: 'pilot_adapter_match',
      }),
    ]);
  });

  test('keeps trivial trig equations conservative for the released identities pilot template', async () => {
    const { runPilotAdapterRuntime } = await import('../lib/marking/adapter-method-dispatcher.js');

    const template = {
      question_type_id: '9709.trigonometry.identities',
      parts: [
        {
          part_id: 'main',
          points: [
            {
              point_id: 'identity-rewrite',
              official_mark_notation: 'M1',
              mark_family: 'M',
              max_score: 1,
              verification_condition: {
                kind: 'adapter_call',
                adapter_method: 'proof_structure_check',
                params: {
                  requires_identity_rewrite: true,
                },
              },
            },
            {
              point_id: 'identity-result',
              official_mark_notation: 'A1',
              mark_family: 'A',
              max_score: 1,
              verification_condition: {
                kind: 'adapter_call',
                adapter_method: 'symbolic_check',
                params: {
                  expects_target_identity: true,
                },
              },
              dependency_chain: {
                prerequisite_point_ids: ['identity-rewrite'],
                prerequisite_policy: 'all',
                strict: true,
              },
            },
          ],
        },
      ],
    };

    const result = runPilotAdapterRuntime({
      rubricTemplate: template,
      studentSteps: [
        { step_id: 's1', text: 'sin x = 0' },
      ],
    });

    expect(result.decisions).toEqual([
      expect.objectContaining({
        rubric_id: 'identity-rewrite',
        reason: 'pilot_adapter_mismatch',
        awarded: false,
        awarded_marks: 0,
      }),
      expect.objectContaining({
        rubric_id: 'identity-result',
        reason: 'dependency_not_met',
        awarded: false,
        awarded_marks: 0,
      }),
    ]);
  });
});
