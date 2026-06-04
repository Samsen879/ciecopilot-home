import fs from 'node:fs';
import path from 'node:path';

const RETIRED_FILES = [
  'src/components/NoteRenderer.jsx',
  'src/components/PDFViewer.jsx',
  'src/utils/ragSearch.js',
];

const RETIRED_DEPENDENCIES = [
  'katex',
  'pdfjs-dist',
  'react-markdown',
  'react-pdf',
  'rehype-katex',
  'remark-math',
];

describe('frontend dead code retirements', () => {
  test('does not keep unused renderer and deprecated rag search files', () => {
    for (const relativePath of RETIRED_FILES) {
      expect(fs.existsSync(path.join(process.cwd(), relativePath))).toBe(false);
    }
  });

  test('does not keep dependencies that were only used by retired renderer files', () => {
    const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
    const packageLock = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package-lock.json'), 'utf8'));
    const declaredDependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    for (const dependency of RETIRED_DEPENDENCIES) {
      expect(declaredDependencies).not.toHaveProperty(dependency);
      expect(packageLock.packages?.['']?.dependencies || {}).not.toHaveProperty(dependency);
    }
  });
});
