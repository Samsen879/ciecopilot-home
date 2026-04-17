function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

async function maybeSingle(promise, message) {
  const { data, error } = await promise;

  if (error) {
    throw new Error(`${message}: ${error.message}`);
  }

  return data ?? null;
}

async function getEffectReceiptByIdentity(client, {
  handlerName,
  effectKey,
} = {}) {
  return maybeSingle(
    client
      .from('learning_event_effects')
      .select('*')
      .eq('handler_name', handlerName)
      .eq('effect_key', effectKey)
      .maybeSingle(),
    'Failed to load learning event effect receipt',
  );
}

async function updateEffectReceipt(client, {
  handlerName,
  effectKey,
  patch,
} = {}) {
  return maybeSingle(
    client
      .from('learning_event_effects')
      .update({
        ...clone(patch),
        last_updated_at: new Date().toISOString(),
      })
      .eq('handler_name', handlerName)
      .eq('effect_key', effectKey)
      .select('*')
      .single(),
    'Failed to update learning event effect receipt',
  );
}

export function createLearningEventEffectRepository(client) {
  return {
    async getEffectReceiptByIdentity(identity = {}) {
      return getEffectReceiptByIdentity(client, identity);
    },

    async reserveEffectReceipt(input = {}) {
      const handlerName = normalizeString(input.handler_name);
      const effectKey = normalizeString(input.effect_key);
      const attemptedAt = new Date().toISOString();
      const existing = await getEffectReceiptByIdentity(client, {
        handlerName,
        effectKey,
      });

      if (existing) {
        if (existing.status === 'failed' && existing.receipt_state === 'retrying') {
          const retried = await updateEffectReceipt(client, {
            handlerName,
            effectKey,
            patch: {
              event_id: input.event_id,
              aggregate_id: input.aggregate_id,
              truth_revision: input.truth_revision,
              reconciliation_id: input.reconciliation_id ?? null,
              proposal_key: input.proposal_key ?? existing.proposal_key ?? null,
              status: 'started',
              receipt_state: 'pending',
              attempt_count: Number(existing.attempt_count ?? 0) + 1,
              last_attempted_at: attemptedAt,
              last_error: null,
            },
          });

          return {
            inserted: true,
            reason_code: 'retry_failed_effect',
            receipt: retried,
          };
        }

        return {
          inserted: false,
          reason_code: 'duplicate_effect_key',
          receipt: existing,
        };
      }

      const { data, error } = await client
        .from('learning_event_effects')
        .insert({
          proposal_key: input.proposal_key ?? null,
          event_id: input.event_id,
          handler_name: handlerName,
          effect_key: effectKey,
          aggregate_id: input.aggregate_id,
          truth_revision: input.truth_revision,
          reconciliation_id: input.reconciliation_id ?? null,
          status: 'started',
          receipt_state: 'pending',
          retry_count: 0,
          attempt_count: 1,
          last_attempted_at: attemptedAt,
          last_error: null,
        })
        .select('*')
        .single();

      if (error?.code === '23505') {
        const replay = await getEffectReceiptByIdentity(client, {
          handlerName,
          effectKey,
        });

        if (replay) {
          return {
            inserted: false,
            reason_code: 'duplicate_effect_key',
            receipt: replay,
          };
        }
      }

      if (error || !data) {
        throw new Error(error?.message || 'Failed to insert learning event effect receipt.');
      }

      return {
        inserted: true,
        reason_code: null,
        receipt: data,
      };
    },

    async markEffectReceiptSucceeded(input = {}) {
      const handlerName = normalizeString(input.handler_name);
      const effectKey = normalizeString(input.effect_key);
      return updateEffectReceipt(client, {
        handlerName,
        effectKey,
        patch: {
          status: input.status ?? 'succeeded',
          receipt_state: 'persisted',
          result_ref_type: input.result_ref_type ?? null,
          result_ref_id: input.result_ref_id ?? null,
          last_attempted_at: new Date().toISOString(),
          last_error: null,
          completed_at: new Date().toISOString(),
        },
      });
    },

    async markEffectReceiptFailed(input = {}) {
      const handlerName = normalizeString(input.handler_name);
      const effectKey = normalizeString(input.effect_key);
      const existing = await getEffectReceiptByIdentity(client, {
        handlerName,
        effectKey,
      });

      return updateEffectReceipt(client, {
        handlerName,
        effectKey,
        patch: {
          status: 'failed',
          receipt_state: input.receipt_state ?? 'retrying',
          retry_count: Number(existing?.retry_count ?? 0) + 1,
          last_attempted_at: new Date().toISOString(),
          last_error: {
            code: input.error_code ?? 'effect_execution_failed',
            message: input.error_message ?? 'effect execution failed',
          },
        },
      });
    },

    async listEffectReceiptsByEventId(eventId) {
      const { data, error } = await client
        .from('learning_event_effects')
        .select('*')
        .eq('event_id', eventId)
        .order('handler_name', { ascending: true })
        .order('effect_key', { ascending: true });

      if (error) {
        throw new Error(`Failed to list learning event effect receipts: ${error.message}`);
      }

      return Array.isArray(data) ? data : [];
    },
  };
}
