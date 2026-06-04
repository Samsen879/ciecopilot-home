import fs from 'node:fs';
import path from 'node:path';

const RETIRED_FILES = [
  'src/components/NoteRenderer.jsx',
  'src/components/PDFViewer.jsx',
  'src/utils/ragSearch.js',
];

const RETIRED_LEGACY_FRONTEND_FILES = [
  'public/aichatinput',
  'public/ai聊天界面demo.tsx',
  'public/vite.svg',
  'src/assets/react.svg',
  'src/components/Admin/DatabaseManager.jsx',
  'src/components/Admin/RecommendationManagement.jsx',
  'src/components/Analysis/LearningAnalyticsDashboard.jsx',
  'src/components/DesignSystemDemo.jsx',
  'src/components/EnhancedFeatures.jsx',
  'src/components/ErrorBook/ErrorBook.jsx',
  'src/components/Layout.jsx',
  'src/components/RealtimeStats.jsx',
  'src/components/SimpleFeatures.jsx',
  'src/components/SimpleHeroSection.jsx',
  'src/components/SimpleTransition.jsx',
  'src/components/StudentTestimonials.jsx',
  'src/components/ui/tabs.jsx',
  'src/config/recommendationConfig.js',
  'src/hooks/useBreakpoint.js',
  'src/lib/supabase/errorHandler.js',
  'src/lib/supabase/index.js',
  'src/lib/supabase/learningPathQueries.js',
  'src/lib/supabase/recommendationQueries.js',
  'src/lib/supabase/userProfileQueries.js',
  'src/pages/DesignSystemPage.jsx',
  'src/pages/Home.jsx',
  'src/pages/HomeOrRedirect.jsx',
  'src/pages/Topics.jsx',
  'tests/manual/sample_markdown_file.md',
  'tests/manual/test-api.html',
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

  test('does not keep retired legacy frontend pages, components, wrappers, or static prototypes', () => {
    for (const relativePath of RETIRED_LEGACY_FRONTEND_FILES) {
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
