import fs from 'node:fs';
import path from 'node:path';

describe('learning runtime jsx compatibility shell retirements', () => {
  test('does not keep component-level jsx re-export shells', () => {
    const runtimeComponentsDir = path.join(process.cwd(), 'src/components/learning-runtime');
    const jsxShells = fs.readdirSync(runtimeComponentsDir)
      .filter((fileName) => fileName.endsWith('.jsx'));

    expect(jsxShells).toEqual([]);
  });

  test('does not import learning-runtime compatibility shells from pages', () => {
    for (const relativePath of [
      'src/pages/learning-runtime/LearningSessionPage.jsx',
      'src/pages/learning-runtime/TopicWorkspacePage.jsx',
      'src/pages/learning-runtime/ReviewQueuePage.jsx',
    ]) {
      const source = fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

      expect(source).not.toMatch(/components\/learning-runtime\/[^'"]+\.jsx/);
    }
  });
});
