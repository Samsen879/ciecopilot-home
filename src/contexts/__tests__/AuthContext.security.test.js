import fs from 'node:fs';
import path from 'node:path';

describe('AuthContext logging posture', () => {
  test('does not log complete Supabase session objects', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/contexts/AuthContext.jsx'),
      'utf8',
    );

    expect(source).not.toMatch(/console\.(log|debug|info)\([^;\n]*session/);
  });
});
