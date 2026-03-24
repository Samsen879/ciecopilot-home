import fs from 'node:fs';

import { describe, expect, test } from '@jest/globals';

const readmePath = new URL('../README.md', import.meta.url);
const readmeContents = fs.readFileSync(readmePath, 'utf8');

describe('src/styles README Jekyll escaping', () => {
  test('wraps the JSX design token example in raw tags so Liquid does not parse style braces', () => {
    expect(readmeContents).toMatch(
      /### Using Design Tokens in JavaScript\s+\{% raw %\}\s*```javascript[\s\S]*?<div style=\{\{[\s\S]*?```\s*\{% endraw %\}/
    );
  });
});
