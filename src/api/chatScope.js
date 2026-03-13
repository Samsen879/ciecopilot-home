export function deriveRouteSubjectCode(pathname = '') {
  const normalizedPath = String(pathname || '').trim().toLowerCase();
  if (!normalizedPath) return null;

  const numericMatch = normalizedPath.match(/\/(9709|9702|9231)(?:\/|$)/);
  if (numericMatch) return numericMatch[1];

  if (normalizedPath.includes('/physics')) return '9702';
  if (normalizedPath.includes('further-mathematics')) return '9231';
  if (normalizedPath.includes('/mathematics')) return '9709';
  return null;
}

export const CHAT_SUBJECT_OPTIONS = [
  { value: '9709', label: 'Mathematics (9709)' },
  { value: '9702', label: 'Physics (9702)' },
  { value: '9231', label: 'Further Mathematics (9231)' },
];

export function requiresSubjectSelection(pathname = '') {
  return !deriveRouteSubjectCode(pathname);
}

export function resolveChatRequestContext({
  routePathname = '',
  selectedSubjectCode = null,
} = {}) {
  const routeSubjectCode = deriveRouteSubjectCode(routePathname);
  const subject_code = routeSubjectCode || String(selectedSubjectCode || '').trim() || undefined;

  return {
    route_pathname: routePathname,
    ...(subject_code ? { subject_code } : {}),
  };
}

export function inferSubjectCodeFromText(text = '') {
  const normalized = String(text || '').toLowerCase();
  if (!normalized.trim()) return null;

  const subjectPatterns = [
    ['9231', ['further mathematics', 'further maths', 'complex number', 'argand', 'matrices', 'hyperbolic', 'further pure']],
    ['9702', ['physics', 'electric', 'voltage', 'current', 'emf', 'momentum', 'wave', 'force', 'nuclear', 'quantum', 'potential difference', 'relation between e and v']],
    ['9709', ['mathematics', 'maths', 'math', 'quadratic', 'binomial', 'differentiat', 'integrat', 'logarithm', 'calculus']],
  ];

  for (const [subjectCode, patterns] of subjectPatterns) {
    if (patterns.some((pattern) => normalized.includes(pattern))) {
      return subjectCode;
    }
  }
  return null;
}

function isLikelySyllabusNodeId(candidate, subjectCode) {
  const value = String(candidate || '').trim();
  const subject = String(subjectCode || '').trim();
  if (!value) return false;
  if (subject && value === subject) return true;
  if (subject && value.startsWith(`${subject}.`)) return true;
  return /^\d{4}(?:\.|$)/.test(value) && !/\s/.test(value);
}

function latestUserContent(messages = []) {
  const normalized = Array.isArray(messages) ? messages : [];
  for (let index = normalized.length - 1; index >= 0; index -= 1) {
    const message = normalized[index];
    const role = message?.role === 'assistant' ? 'assistant' : 'user';
    if (role === 'user' && String(message?.content || '').trim()) {
      return String(message.content);
    }
  }
  return '';
}

export function resolveChatScope(params = {}) {
  const explicitSubjectCode = typeof params.subject_code === 'string'
    ? params.subject_code.trim() || null
    : null;
  const derivedRouteSubjectCode = params.route_subject_code ?? deriveRouteSubjectCode(params.route_pathname);
  const routeSubjectCode = typeof derivedRouteSubjectCode === 'string'
    ? derivedRouteSubjectCode.trim() || null
    : null;
  const textSubjectCode = inferSubjectCodeFromText(
    latestUserContent(params.messages) || params.query || '',
  );

  const subjectCode = explicitSubjectCode || routeSubjectCode || textSubjectCode || null;
  const requestedBoundary = params.syllabus_node_id ?? params.topic_id ?? null;
  const syllabusNodeId = subjectCode && isLikelySyllabusNodeId(requestedBoundary, subjectCode)
    ? String(requestedBoundary).trim()
    : subjectCode;

  return {
    subject_code: subjectCode,
    syllabus_node_id: syllabusNodeId || null,
  };
}
