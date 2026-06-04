import fs from 'node:fs';
import path from 'node:path';

describe('legacy api-node app retirement', () => {
  test('does not keep orphaned api-node tests after the app implementation was retired', () => {
    const legacyTestsPath = path.join(process.cwd(), 'apps/api-node/api/tests');
    const files = fs.existsSync(legacyTestsPath)
      ? fs.readdirSync(legacyTestsPath, { recursive: true, withFileTypes: true })
        .filter((entry) => entry.isFile())
      : [];

    expect(files).toHaveLength(0);
  });
});
