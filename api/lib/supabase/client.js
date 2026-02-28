import { createClient } from '@supabase/supabase-js';

let serviceClient = null;
let anonClient = null;

export function assertServerEnv() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
  if (!url) {
    throw new Error('Missing SUPABASE_URL');
  }
  if (!serviceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
  }
  return { url, serviceKey };
}

function buildClient(url, key) {
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function getServiceClient() {
  if (serviceClient) return serviceClient;
  const { url, serviceKey } = assertServerEnv();
  serviceClient = buildClient(url, serviceKey);
  return serviceClient;
}

export function getAnonClient() {
  if (anonClient) return anonClient;
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY');
  }
  anonClient = buildClient(url, anonKey);
  return anonClient;
}

export function _resetSupabaseClientsForTest() {
  serviceClient = null;
  anonClient = null;
}
