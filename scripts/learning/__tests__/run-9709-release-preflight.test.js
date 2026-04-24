import fs from 'node:fs';
import path from 'node:path';

const TMP_DIR = path.join(process.cwd(), 'tmp', '9709-release-preflight-test');

function writeJson(relativeName, payload) {
  const filePath = path.join(TMP_DIR, relativeName);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return filePath;
}

function buildManifest(diagramPresent = true) {
  return {
    items: [
      {
        storage_key: '9709/s24_qp_13/questions/q09.png',
        syllabus_code: '9709',
        paper: 1,
        primary_topic_path: '9709.p1.integration',
        diagram_present: diagramPresent,
      },
    ],
  };
}

function buildSidecar() {
  return {
    items: [
      {
        storage_key: '9709/s24_qp_13/questions/q09.png',
        authority_input_pack: {
          canonical_primary_topic_path: '9709.p1.integration',
        },
      },
    ],
  };
}

function buildSeed() {
  return {
    syllabus_code: '9709',
    version_tag: '2025-2027_v1',
    nodes: [
      {
        syllabus_code: '9709',
        version_tag: '2025-2027_v1',
        topic_path: '9709.p1.integration',
      },
    ],
  };
}

describe('run_9709_release_preflight cli', () => {
  beforeEach(() => {
    fs.rmSync(TMP_DIR, { recursive: true, force: true });
    fs.mkdirSync(TMP_DIR, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(TMP_DIR, { recursive: true, force: true });
  });

  test('writes JSON and Markdown reports and returns zero for warnings-only or clean results', async () => {
    const { main } = await import('../run_9709_release_preflight.js');
    const manifestPath = writeJson('manifest.json', buildManifest());
    const sidecarPath = writeJson('sidecar.json', buildSidecar());
    const seedPath = writeJson('seed.json', buildSeed());
    const jsonOut = path.join(TMP_DIR, 'report.json');
    const markdownOut = path.join(TMP_DIR, 'report.md');

    const exitCode = await main([
      '--manifest', manifestPath,
      '--authority-sidecar', sidecarPath,
      '--curriculum-seed', seedPath,
      '--expected-count', '1',
      '--json-out', jsonOut,
      '--markdown-out', markdownOut,
    ]);

    expect(exitCode).toBe(0);
    expect(JSON.parse(fs.readFileSync(jsonOut, 'utf8'))).toMatchObject({
      status: 'pass',
      counts: {
        manifest_items: 1,
      },
    });
    expect(fs.readFileSync(markdownOut, 'utf8')).toContain('# 9709 Release Preflight');
  });

  test('returns non-zero when blockers are present', async () => {
    const { main } = await import('../run_9709_release_preflight.js');
    const manifestPath = writeJson('manifest.json', buildManifest(null));
    const sidecarPath = writeJson('sidecar.json', buildSidecar());
    const seedPath = writeJson('seed.json', buildSeed());
    const jsonOut = path.join(TMP_DIR, 'blocked.json');

    const exitCode = await main([
      '--manifest', manifestPath,
      '--authority-sidecar', sidecarPath,
      '--curriculum-seed', seedPath,
      '--expected-count', '1',
      '--json-out', jsonOut,
    ]);

    expect(exitCode).toBe(1);
    expect(JSON.parse(fs.readFileSync(jsonOut, 'utf8'))).toMatchObject({
      status: 'fail',
      blockers: [
        expect.objectContaining({ reason_code: 'diagram_present_not_boolean' }),
      ],
    });
  });
});
