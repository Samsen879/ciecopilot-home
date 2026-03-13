import {
  deriveRouteSubjectCode,
  inferSubjectCodeFromText,
  resolveChatScope,
} from '../chatScope.js';

describe('chat scope helpers', () => {
  test('derives subject from numeric study hub routes', () => {
    expect(deriveRouteSubjectCode('/study-hub/9702')).toBe('9702');
    expect(deriveRouteSubjectCode('/community/9231')).toBe('9231');
  });

  test('derives subject from named subject routes', () => {
    expect(deriveRouteSubjectCode('/topics/physics')).toBe('9702');
    expect(deriveRouteSubjectCode('/further-mathematics-papers')).toBe('9231');
    expect(deriveRouteSubjectCode('/mathematics-topics')).toBe('9709');
  });

  test('infers subject from question text when route scope is absent', () => {
    expect(inferSubjectCodeFromText('What is the relation between E and V?')).toBe('9702');
    expect(inferSubjectCodeFromText('How do I complete the square for a quadratic equation?')).toBe('9709');
    expect(inferSubjectCodeFromText('How do complex numbers work in Argand diagrams?')).toBe('9231');
  });

  test('prefers explicit subject over route and text inference', () => {
    expect(resolveChatScope({
      subject_code: '9231',
      route_pathname: '/topics/physics',
      messages: [{ role: 'user', content: 'What is emf?' }],
    })).toEqual({
      subject_code: '9231',
      syllabus_node_id: '9231',
    });
  });

  test('falls back to route subject root when boundary is not a valid syllabus node id', () => {
    expect(resolveChatScope({
      route_pathname: '/topics/physics',
      topic_id: 'Motion in a Circle',
      messages: [{ role: 'user', content: 'Explain this topic.' }],
    })).toEqual({
      subject_code: '9702',
      syllabus_node_id: '9702',
    });
  });

  test('does not silently default to 9709 when no subject can be inferred', () => {
    expect(resolveChatScope({
      messages: [{ role: 'user', content: 'Help me make a revision plan.' }],
    })).toEqual({
      subject_code: null,
      syllabus_node_id: null,
    });
  });
});
