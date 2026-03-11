import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';

const argv = process.argv.slice(2);
const urls = [];
let profile = 'Profile 10';
let outputDir = '';
let keepClone = false;

for (let i = 0; i < argv.length; i += 1) {
  const arg = argv[i];
  if (arg === '--profile') {
    profile = argv[i + 1];
    i += 1;
  } else if (arg === '--output-dir') {
    outputDir = path.resolve(argv[i + 1]);
    i += 1;
  } else if (arg === '--keep-clone') {
    keepClone = true;
  } else {
    urls.push(arg);
  }
}

if (urls.length === 0) {
  console.error('Usage: node scripts/extract-gemini-page.mjs [--profile "Profile 10"] [--output-dir dir] [--keep-clone] <url> [url...]');
  process.exit(1);
}

const localAppData = process.env.LOCALAPPDATA;
if (!localAppData) {
  console.error('LOCALAPPDATA is not set.');
  process.exit(1);
}

const chromePathCandidates = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  path.join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe'),
];

const chromePath = chromePathCandidates.find((candidate) => fs.existsSync(candidate));
if (!chromePath) {
  console.error('Google Chrome executable not found.');
  process.exit(1);
}

const userDataRoot = path.join(localAppData, 'Google', 'Chrome', 'User Data');
const sourceProfileDir = path.join(userDataRoot, profile);
if (!fs.existsSync(sourceProfileDir)) {
  console.error(`Chrome profile not found: ${sourceProfileDir}`);
  process.exit(1);
}

const cloneRoot = path.join(os.tmpdir(), `codex-gemini-${Date.now()}`);
const skipTopLevelDirs = new Set([
  'Cache',
  'Code Cache',
  'GPUCache',
  'Service Worker',
  'DawnGraphiteCache',
  'DawnWebGPUCache',
  'JumpListIconsMostVisited',
  'JumpListIconsRecentClosed',
  'AutofillAiModelCache',
  'optimization_guide_hint_cache_store',
  'Safe Browsing Network',
  'Search Logos',
  'Shared Dictionary',
  'VideoDecodeStats',
  'blob_storage',
  'Download Service',
  'Segmentation Platform',
]);

fs.mkdirSync(cloneRoot, { recursive: true });
fs.copyFileSync(path.join(userDataRoot, 'Local State'), path.join(cloneRoot, 'Local State'));
fs.cpSync(sourceProfileDir, path.join(cloneRoot, profile), {
  recursive: true,
  filter: (source) => {
    const relative = path.relative(sourceProfileDir, source);
    if (!relative || relative === '.') return true;
    const topLevel = relative.split(path.sep)[0];
    return !skipTopLevelDirs.has(topLevel);
  },
});

if (outputDir) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const safeName = (value) => value.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_').slice(0, 120);

let context;
try {
  context = await chromium.launchPersistentContext(cloneRoot, {
    executablePath: chromePath,
    headless: true,
    args: [`--profile-directory=${profile}`],
  });

  for (const url of urls) {
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForTimeout(12000);

    const result = await page.evaluate(() => {
      const normalize = (text) => (text || '').replace(/\u00a0/g, ' ').replace(/\s+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
      const main = document.querySelector('main');
      const article = document.querySelector('article');
      const bodyText = normalize(document.body?.innerText || '');
      const mainText = normalize(main?.innerText || '');
      const articleText = normalize(article?.innerText || '');
      const title = document.title || '';
      const h1 = document.querySelector('h1')?.textContent?.trim() || '';
      return {
        title,
        h1,
        bodyText,
        mainText,
        articleText,
        url: location.href,
      };
    });

    const payload = {
      requestedUrl: url,
      ...result,
    };

    console.log(JSON.stringify(payload, null, 2));

    if (outputDir) {
      const fileStem = safeName(result.h1 || result.title || new URL(result.url).pathname.split('/').filter(Boolean).pop() || 'gemini-page');
      fs.writeFileSync(path.join(outputDir, `${fileStem}.json`), JSON.stringify(payload, null, 2), 'utf8');
      fs.writeFileSync(path.join(outputDir, `${fileStem}.txt`), result.articleText || result.mainText || result.bodyText, 'utf8');
    }

    await page.close();
  }
} finally {
  if (context) {
    await context.close();
  }
  if (!keepClone) {
    fs.rmSync(cloneRoot, { recursive: true, force: true });
  }
}
