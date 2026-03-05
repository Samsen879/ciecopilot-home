import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SEMANTICS_PATH = path.join(__dirname, 'marking-semantics-v1.json');

const SEMANTICS = JSON.parse(fs.readFileSync(SEMANTICS_PATH, 'utf8'));

export const MARKING_SEMANTICS_VERSION = SEMANTICS.version;

export const FT_MODE = Object.freeze({
  NONE: 'none',
  FT: 'ft',
  STRICT_FT: 'strict_ft',
});

function candidateKeys(value) {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return [];

  const base = raw.split(':', 1)[0].trim();
  const seeds = [raw, base].filter(Boolean);
  const out = new Set();

  for (const seed of seeds) {
    out.add(seed);
    const underscore = seed.replace(/[\s-]+/g, '_');
    out.add(underscore);
    out.add(underscore.replace(/_/g, ''));
  }

  return [...out];
}

function resolveAlias(aliases, value, fallback) {
  for (const key of candidateKeys(value)) {
    if (Object.prototype.hasOwnProperty.call(aliases, key)) {
      return aliases[key];
    }
  }
  return fallback;
}

export function normalizeFtMode(mode) {
  return resolveAlias(SEMANTICS.ft_mode.aliases, mode, SEMANTICS.ft_mode.default);
}

export function normalizeUncertainReason(reason, { awarded = false } = {}) {
  if (awarded) return null;
  return resolveAlias(
    SEMANTICS.uncertain_reason.aliases,
    reason,
    SEMANTICS.uncertain_reason.default,
  );
}

export function buildUncertainReason(reason, { awarded = false } = {}) {
  const isUncertain = !awarded;
  return {
    is_uncertain: isUncertain,
    code: normalizeUncertainReason(reason, { awarded }),
    source_reason: reason ?? null,
  };
}
