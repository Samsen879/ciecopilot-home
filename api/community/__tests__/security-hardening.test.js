import fs from 'fs';
import path from 'path';

function readSource(relPath) {
  return fs.readFileSync(path.join(process.cwd(), relPath), 'utf8');
}

describe('community security hardening (T14)', () => {
  const corsFiles = [
    'api/community/questions.js',
    'api/community/answers.js',
    'api/community/interactions.js',
    'api/community/reputation.js',
    'api/community/badges.js',
    'api/community/profiles.js',
    'api/community/notifications.js',
    'api/community/notifications/read-all.js',
    'api/community/notifications/unread-count.js',
    'api/community/notifications/[id].js',
    'api/community/notifications/[id]/read.js'
  ];

  it('removes wildcard CORS from all community handlers', () => {
    for (const file of corsFiles) {
      const src = readSource(file);
      expect(src).not.toContain("Access-Control-Allow-Origin', '*'");
      expect(src).toContain('applyCors(');
    }
  });

  it('applies input sanitization to question and answer UGC writes', () => {
    const questions = readSource('api/community/questions.js');
    const answers = readSource('api/community/answers.js');

    expect(questions).toContain('sanitizePlainText(');
    expect(questions).toContain('sanitizeTagList(');
    expect(answers).toContain('sanitizePlainText(');
  });

  it('enforces role checks for badge award and reputation update endpoints', () => {
    const badges = readSource('api/community/badges.js');
    const reputation = readSource('api/community/reputation.js');
    const router = readSource('api/community/index.js');

    expect(badges).toContain("isCommunityRoleAllowed(supabase, user.id, ['admin', 'moderator'])");
    expect(reputation).toContain("isCommunityRoleAllowed(supabase, user.id, ['admin', 'moderator'])");
    expect(router).toContain("requirePermission('manage_roles')");
  });

  it('uses query id parameters in notification detail routes without URL split fallback', () => {
    const deleteById = readSource('api/community/notifications/[id].js');
    const markRead = readSource('api/community/notifications/[id]/read.js');

    expect(deleteById).not.toContain('req.url.split');
    expect(markRead).not.toContain('req.url.split');
    expect(deleteById).toContain('req.query?.id');
    expect(markRead).toContain('req.query?.id');
  });
});
