import fs from 'fs';
import path from 'path';

function readSource(relPath) {
  return fs.readFileSync(path.join(process.cwd(), relPath), 'utf8');
}

describe('auth middleware unification (T13)', () => {
  it('keeps root middleware/auth.js as a shim to the single implementation', () => {
    const shim = readSource('middleware/auth.js');
    expect(shim).toContain("export * from '../api/middleware/auth.js';");
    expect(shim).toContain("export default auth;");
    expect(shim).not.toContain('createClient(');
    expect(shim.split('\n').length).toBeLessThanOrEqual(8);
  });

  it('supports direct-call auth flow for api/users handlers', () => {
    const source = readSource('api/middleware/auth.js');
    expect(source).toContain("if (typeof res === 'undefined' && typeof next === 'undefined')");
    expect(source).toContain("return authenticateRequest(req, { optional: false });");
  });

  it('supports direct permission checks while retaining middleware factory mode', () => {
    const source = readSource('api/middleware/auth.js');
    expect(source).toContain('function requirePermission(requiredPermissions, options = {})');
    expect(source).toContain('if (isUserLike(requiredPermissions))');
    expect(source).toContain('const permission = options;');
    expect(source).toContain('return async (req, res, next) => {');
  });

  it('supports direct ownership checks used by profile API', () => {
    const source = readSource('api/middleware/auth.js');
    expect(source).toContain('function requireOwnership(resourceType, idParam = \'id\')');
    expect(source).toContain('if (isUserLike(resourceType))');
    expect(source).toContain('const targetUserId = idParam;');
  });
});
