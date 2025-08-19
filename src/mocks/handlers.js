import { http, HttpResponse, delay } from 'msw';

// Helper to simulate network delay and error rate
const maybeDelay = async () => {
  await delay(200 + Math.random() * 400);
};

// Sample mock data builders
function buildSearchResult(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    chunk_id: overrides.chunk_id || 'chunk_9702_EFIELDS_001',
    document_id: overrides.document_id || 'doc_9702_el_fields_notes',
    subject_code: '9702',
    paper_code: 'AS',
    topic_id: 'electric_fields',
    source_type: overrides.source_type || 'note', // 'note'|'paper'|'mark'
    lang: 'en',
    page_from: overrides.page_from ?? 1,
    page_to: overrides.page_to ?? 1,
    path: overrides.path || '/data/notes/9702/electric_fields.md',
    title: overrides.title || 'Electric fields overview',
    snippet: overrides.snippet || 'The electric potential difference between two points is defined as the work done per unit charge to move a small test charge between the points...',
    similarity: 0.78,
    score: 0.78,
    ...overrides,
  };
}

function buildCitation(overrides = {}) {
  return {
    document_id: 'doc_9702_el_fields_paper_2023_summer_qp12',
    subject_code: '9702',
    paper_code: 'P1',
    topic_id: 'electric_fields',
    source_type: 'paper',
    lang: 'en',
    page_from: 3,
    page_to: 4,
    path: '/data/past-papers/9702Physics/paper1/9702_s23_qp_12.pdf',
    title: '9702 Physics P1 Summer 2023 QP12',
    snippet: 'Relates E, V and separation via E = -dV/dx in uniform fields...'
  };
}

export const handlers = [
  // RAG Search endpoint
  http.post('/api/rag/search', async ({ request }) => {
    await maybeDelay();
    const body = await request.json().catch(() => ({}));
    const { q = '', subject_code = '9702', paper_code = null, topic_id = null, page = 1, page_size = 20 } = body || {};

    const items = [
      buildSearchResult({ source_type: 'note', page_from: 1, page_to: 1, snippet: 'Electric field strength E relates to potential gradient by E = -dV/dx ...', title: 'Electric Fields (Notes)' }),
      buildSearchResult({ source_type: 'paper', page_from: 3, page_to: 3, path: '/data/past-papers/9702Physics/paper1/9702_s23_qp_12.pdf', title: 'QP12 2023 Summer', similarity: 0.74 }),
      buildSearchResult({ source_type: 'mark', page_from: 3, page_to: 3, path: '/data/mark-schemes/9702Physics/9702_s23_ms_12.pdf', title: 'MS12 2023 Summer', similarity: 0.72 }),
    ];

    const response = {
      query: q,
      subject_code,
      paper_code,
      topic_id,
      page,
      page_size,
      total: items.length,
      items,
      lang: 'en',
      usage: { prompt_tokens: 140, completion_tokens: 0, total_tokens: 140 },
    };

    return HttpResponse.json(response);
  }),

  // RAG Chat endpoint
  http.post('/api/rag/chat', async ({ request }) => {
    await maybeDelay();
    const body = await request.json().catch(() => ({}));
    const { messages = [], subject_code = '9702', paper_code = null, topic_id = null, lang = 'en' } = body || {};

    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    const question = lastUser?.content || 'Explain electric potential difference.';

    const answer = `Answer (${lang}): Electric potential difference (V) between two points is the work done per unit charge (W/q) to move a small positive test charge between the points. In uniform fields, E = -dV/dx. For CIE exams, mention units and definitions explicitly.`;

    const citations = [
      buildCitation({}),
      buildCitation({ source_type: 'mark', document_id: 'doc_9702_el_fields_ms_2023_summer_12', path: '/data/mark-schemes/9702Physics/9702_s23_ms_12.pdf', title: '9702 Physics MS12 2023 Summer', page_from: 3, page_to: 3 }),
      {
        document_id: 'doc_9702_el_fields_notes',
        subject_code: '9702',
        paper_code: 'AS',
        topic_id: 'electric_fields',
        source_type: 'note',
        lang: 'en',
        page_from: 1,
        page_to: 1,
        path: '/src/data/9702AS_A2.json',
        title: 'Electric Fields Notes',
        snippet: 'Definition of electric potential difference and relationship to field strength...'
      },
    ];

    const response = {
      subject_code,
      paper_code,
      topic_id,
      lang,
      answer,
      citations,
      usage: { prompt_tokens: 210, completion_tokens: 120, total_tokens: 330 },
    };

    return HttpResponse.json(response);
  }),
];