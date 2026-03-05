import { createInMemoryQueueAdapter } from '../../../api/infra/queue/index.js';

function print(label, payload) {
  // Keep output deterministic and easy to compare in local smoke runs.
  console.log(`\n[${label}]`);
  console.log(JSON.stringify(payload, null, 2));
}

function main() {
  const queue = createInMemoryQueueAdapter({
    max_attempts: 2,
    backoff_policy: {
      base_delay_ms: 100,
      factor: 2,
      max_delay_ms: 5000,
    },
  });

  const baseTs = 1_000_000;

  const enqueueResult = queue.enqueue(
    {
      idempotency_key: 'demo-idem-1',
      trace_id: 'trace-demo-1',
      stage: 'ingest',
      payload_version: 'v1',
      payload: { source: 'demo' },
    },
    { now: baseTs },
  );
  print('enqueue', enqueueResult);

  const claim1 = queue.claim({ now: baseTs });
  print('claim#1', claim1);

  const retry1 = queue.retry(claim1.lease_id, {
    now: baseTs,
    error: 'transient timeout',
  });
  print('retry#1', retry1);

  const earlyClaim = queue.claim({ now: baseTs + 99 });
  print('claim-too-early', earlyClaim);

  const claim2 = queue.claim({ now: retry1.available_at_ms });
  print('claim#2', claim2);

  const manualDlq = queue.to_dlq(claim2.lease_id, {
    now: retry1.available_at_ms + 1,
    reason: 'poison_payload',
  });
  print('to_dlq', manualDlq);

  print('stats', queue.stats());
  print('snapshot', queue.snapshot());
}

main();

