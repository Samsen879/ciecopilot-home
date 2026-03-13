import {
  requiresSubjectSelection,
  resolveChatRequestContext,
} from '../chatScope.js';

describe('chat scope request context', () => {
  test('generic routes require explicit subject selection', () => {
    expect(requiresSubjectSelection('/ask-ai')).toBe(true);
    expect(requiresSubjectSelection('/tools/image-solver')).toBe(true);
  });

  test('subject routes do not require explicit subject selection', () => {
    expect(requiresSubjectSelection('/topics/physics')).toBe(false);
    expect(requiresSubjectSelection('/study-hub/9709')).toBe(false);
  });

  test('generic route can provide subject scope through explicit selection', () => {
    expect(resolveChatRequestContext({
      routePathname: '/ask-ai',
      selectedSubjectCode: '9702',
    })).toEqual({
      route_pathname: '/ask-ai',
      subject_code: '9702',
    });
  });
});
