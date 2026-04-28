import fs from 'node:fs';
import path from 'node:path';

function readWorkspaceFile(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('community module retirement', () => {
  test('removes active frontend community services and routes', () => {
    for (const relativePath of [
      'src/services/communityService.js',
      'src/services/communityAnswerService.js',
      'src/pages/CommunityAndRecommendations.jsx',
    ]) {
      expect(fs.existsSync(path.join(process.cwd(), relativePath))).toBe(false);
    }

    const appSource = readWorkspaceFile('src/App.jsx');
    expect(appSource).not.toContain('/community/:subjectCode');
    expect(appSource).not.toContain('CommunityAndRecommendations');
  });

  test('removes community API documentation and package scripts', () => {
    const docs = readWorkspaceFile('docs/API_DOCUMENTATION.md');
    const readme = readWorkspaceFile('README.md');
    const packageJson = readWorkspaceFile('package.json');

    expect(docs).not.toContain('/api/community');
    expect(docs).not.toContain('社区系统 API');
    expect(readme).not.toContain('社区问答与声誉系统');
    expect(readme).not.toContain('社区、RAG、评分相关');
    expect(packageJson).not.toContain('test:community');
  });
});
