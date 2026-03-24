import { createHash } from 'node:crypto';

function normalizeString(value) {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
}

function normalizeNullableString(value) {
  const normalized = normalizeString(value);
  return normalized || null;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function canonicalizeJson(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => canonicalizeJson(entry));
  }

  if (isPlainObject(value)) {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = canonicalizeJson(value[key]);
        return acc;
      }, {});
  }

  return value ?? null;
}

function normalizeRequestPayload(requestPayload) {
  return isPlainObject(requestPayload) ? canonicalizeJson(requestPayload) : {};
}

function normalizeLookupInput({
  userId,
  requestPath,
  idempotencyKey,
} = {}) {
  const normalizedUserId = normalizeNullableString(userId);
  const normalizedRequestPath = normalizeNullableString(requestPath);
  const normalizedIdempotencyKey = normalizeNullableString(idempotencyKey);

  if (!normalizedUserId || !normalizedRequestPath || !normalizedIdempotencyKey) {
    return null;
  }

  return {
    userId: normalizedUserId,
    requestPath: normalizedRequestPath,
    idempotencyKey: normalizedIdempotencyKey,
  };
}

export function buildIdempotencyRequestFingerprint(requestPayload) {
  const normalizedPayload = normalizeRequestPayload(requestPayload);
  const serialized = JSON.stringify(normalizedPayload);
  return createHash('sha256')
    .update(serialized, 'utf8')
    .digest('hex');
}

export async function getLearningRequestIdempotency(
  client,
  {
    userId,
    requestPath,
    idempotencyKey,
  } = {},
) {
  const lookup = normalizeLookupInput({
    userId,
    requestPath,
    idempotencyKey,
  });

  if (!lookup) {
    return null;
  }

  const { data, error } = await client
    .from('learning_request_idempotency')
    .select('*')
    .eq('user_id', lookup.userId)
    .eq('request_path', lookup.requestPath)
    .eq('idempotency_key', lookup.idempotencyKey)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load learning request idempotency row: ${error.message}`);
  }

  return data || null;
}

export async function reserveLearningRequestIdempotency(
  client,
  {
    userId,
    requestPath,
    idempotencyKey,
    requestKind,
    requestPayload,
  } = {},
) {
  const lookup = normalizeLookupInput({
    userId,
    requestPath,
    idempotencyKey,
  });

  if (!lookup) {
    return {
      state: 'disabled',
      row: null,
      requestFingerprint: null,
    };
  }

  const normalizedPayload = normalizeRequestPayload(requestPayload);
  const requestFingerprint = buildIdempotencyRequestFingerprint(normalizedPayload);

  const row = {
    user_id: lookup.userId,
    request_path: lookup.requestPath,
    idempotency_key: lookup.idempotencyKey,
    request_fingerprint: requestFingerprint,
    request_payload: normalizedPayload,
    request_kind: normalizeString(requestKind),
    status: 'pending',
    resource_ref: null,
    response_payload: null,
  };

  const { data: inserted, error: insertError } = await client
    .from('learning_request_idempotency')
    .insert(row)
    .select('*')
    .single();

  if (!insertError && inserted) {
    return {
      state: 'reserved',
      row: inserted,
      requestFingerprint,
    };
  }

  if (insertError?.code !== '23505') {
    throw new Error(
      `Failed to reserve learning request idempotency row: ${insertError?.message || 'unknown error'}`,
    );
  }

  const existing = await getLearningRequestIdempotency(client, lookup);
  if (!existing) {
    throw new Error('Failed to load learning request idempotency row after unique conflict.');
  }

  if (existing.request_fingerprint !== requestFingerprint) {
    return {
      state: 'conflict',
      row: existing,
      requestFingerprint,
    };
  }

  return {
    state: 'replay',
    row: existing,
    requestFingerprint,
  };
}

export async function setLearningRequestIdempotencyResourceRef(
  client,
  {
    userId,
    requestPath,
    idempotencyKey,
    resourceRef,
  } = {},
) {
  const lookup = normalizeLookupInput({
    userId,
    requestPath,
    idempotencyKey,
  });

  if (!lookup) {
    return null;
  }

  const { error } = await client
    .from('learning_request_idempotency')
    .update({
      resource_ref: isPlainObject(resourceRef) ? resourceRef : null,
    })
    .eq('user_id', lookup.userId)
    .eq('request_path', lookup.requestPath)
    .eq('idempotency_key', lookup.idempotencyKey);

  if (error) {
    throw new Error(`Failed to persist learning request resource ref: ${error.message}`);
  }

  return getLearningRequestIdempotency(client, lookup);
}

export async function finalizeLearningRequestIdempotency(
  client,
  {
    userId,
    requestPath,
    idempotencyKey,
    responsePayload,
  } = {},
) {
  const lookup = normalizeLookupInput({
    userId,
    requestPath,
    idempotencyKey,
  });

  if (!lookup) {
    return null;
  }

  const normalizedPayload = isPlainObject(responsePayload) ? canonicalizeJson(responsePayload) : {};

  const { error } = await client
    .from('learning_request_idempotency')
    .update({
      status: 'completed',
      response_payload: normalizedPayload,
      completed_at: new Date().toISOString(),
    })
    .eq('user_id', lookup.userId)
    .eq('request_path', lookup.requestPath)
    .eq('idempotency_key', lookup.idempotencyKey);

  if (error) {
    throw new Error(`Failed to finalize learning request idempotency row: ${error.message}`);
  }

  return getLearningRequestIdempotency(client, lookup);
}

export async function deleteLearningRequestIdempotencyReservation(
  client,
  {
    userId,
    requestPath,
    idempotencyKey,
  } = {},
) {
  const lookup = normalizeLookupInput({
    userId,
    requestPath,
    idempotencyKey,
  });

  if (!lookup) {
    return;
  }

  const { error } = await client
    .from('learning_request_idempotency')
    .delete()
    .eq('user_id', lookup.userId)
    .eq('request_path', lookup.requestPath)
    .eq('idempotency_key', lookup.idempotencyKey);

  if (error) {
    throw new Error(`Failed to delete learning request idempotency row: ${error.message}`);
  }
}
