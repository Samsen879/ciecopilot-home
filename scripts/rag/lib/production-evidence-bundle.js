import fs from 'node:fs';
import path from 'node:path';

function toRel(root, filePath) {
  return path.relative(root, filePath).replace(/\\/g, '/');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

export function loadProductionEvidenceBundle({ root = process.cwd(), manifestPath } = {}) {
  const resolvedManifestPath = path.resolve(root, manifestPath || '');
  if (!manifestPath || !fs.existsSync(resolvedManifestPath)) {
    throw new Error(`production evidence manifest not found: ${manifestPath || 'missing'}`);
  }

  const manifest = readJson(resolvedManifestPath);
  const itemsToken = typeof manifest.items_file === 'string' ? manifest.items_file.trim() : '';
  const resolvedItemsPath = itemsToken ? path.join(path.dirname(resolvedManifestPath), itemsToken) : null;
  if (itemsToken && (!resolvedItemsPath || !fs.existsSync(resolvedItemsPath))) {
    throw new Error(`production evidence items file not found: ${itemsToken}`);
  }

  return {
    manifest,
    items: resolvedItemsPath ? readJson(resolvedItemsPath) : Array.isArray(manifest.items) ? manifest.items : [],
    manifestPath: toRel(root, resolvedManifestPath),
    itemsPath: resolvedItemsPath ? toRel(root, resolvedItemsPath) : null,
  };
}

export function loadJsonArtifact({ root = process.cwd(), filePath } = {}) {
  const resolved = path.resolve(root, filePath || '');
  if (!filePath || !fs.existsSync(resolved)) {
    throw new Error(`artifact not found: ${filePath || 'missing'}`);
  }
  return {
    payload: readJson(resolved),
    path: toRel(root, resolved),
  };
}
