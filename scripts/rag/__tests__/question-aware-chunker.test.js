import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { parseQuestionPaper, parseMarkScheme, buildPairingIndex } from '../lib/question-aware-chunker.js';

const require = createRequire(import.meta.url);
const pdf = require('pdf-parse/lib/pdf-parse.js');
const REAL_QP_9709_W23_23 = path.resolve(process.cwd(), 'data/past-papers/9709Mathematics/paper2/9709_w23_qp_23.pdf');
const REAL_MS_9709_W23_23 = path.resolve(process.cwd(), 'data/mark-schemes/9709Mathematics/9709_w23_ms_23.pdf');
const REAL_QP_9709_W23_33 = path.resolve(process.cwd(), 'data/past-papers/9709Mathematics/paper3/9709_w23_qp_33.pdf');
const REAL_MS_9709_W23_33 = path.resolve(process.cwd(), 'data/mark-schemes/9709Mathematics/9709_w23_ms_33.pdf');

async function extractPdfText(filePath) {
  const data = await pdf(fs.readFileSync(filePath));
  return String(data.text || '');
}

const SAMPLE_QP_TEXT = `
*2108969358*
Cambridge International AS & A Level
MATHEMATICS 9709/13
Paper 1 Pure Mathematics 1 October/November 2023
1 hour 50 minutes
INSTRUCTIONS
Answer all questions.
The total mark for this paper is 75.
The number of marks for each question or part question is shown in brackets [ ].

1 A curve is such that its gradient at a point x,y is given by dy/dx = x - 3x^(-1/2). It is given that the curve passes through the point 4, 1. Find the equation of the curve. [4]

2 The circle with equation (x-3)^2 + (y-5)^2 = 40 intersects the y-axis at points A and B.
(a) Find the y-coordinates of A and B, expressing your answers in terms of surds. [2]
(b) Find the equation of the tangent to the circle at point A. [4]

3   (a) Show that the equation 5 cos theta - sin theta tan theta + 1 = 0 may be expressed in the form a cos^2 theta + b cos theta + c = 0, where a, b and c are constants to be found. [3]
(b) Hence solve the equation 5 cos theta - sin theta tan theta + 1 = 0 for 0 < theta < 2pi. [4]

4   (a) Expand the following in ascending powers of x up to and including the term in x^2.
(i) (1 + 2x)^5 [1]
(ii) (1 - ax)^6, where a is a constant. [2]
In the expansion of (1 + 2x)^5 (1 - ax)^6, the coefficient of x^2 is -5.
(b) Find the possible values of a. [4]
`;

const SAMPLE_MS_TEXT = `
This document consists of 15 printed pages.
© UCLES 2023
Cambridge International AS & A Level
MATHEMATICS 9709/13
Paper 1 Pure Mathematics 1 October/November 2023
MARK SCHEME
Maximum Mark: 75

Generic Marking Principles
GENERIC MARKING PRINCIPLE 1:
Marks must be awarded in line with the specific content of the mark scheme.
GENERIC MARKING PRINCIPLE 2:
Marks awarded are always whole marks.

Question
Answer
Marks
Guidance
1
Use of correct integration method M1
  (1/2)x^2 - 6x^(1/2) + c A1
  Substitution of (4, 1) to find c M1
  y = (1/2)x^2 - 6x^(1/2) + 9 A1

2(a) Substitute x = 0 M1
  y = 5 ± sqrt(31) A1
2(b) Gradient of radius to A B1
  Gradient of tangent: negative reciprocal M1
  Equation of tangent A1

Question
Answer
Marks
Guidance
3(a) Multiply by cos theta M1
  6cos^2 theta + cos theta - 1 = 0 A1
3(b) Solve the quadratic A1 A1

Question
Answer
Marks
Guidance
4(a)(i) 1 + 10x + 40x^2 B1
4(a)(ii) 1 - 6ax + 15a^2x^2 B2
4(b) 60 - 60a + 15a^2 = -5 M1 A1
`;

const SAMPLE_QP_COMPACT_HEADER_TEXT = `
Cambridge International AS & A Level
MATHEMATICS 9709/23
Paper 2 Pure Mathematics 2
1hour15minutes Youmustansweronthequestionpaper.
Youwillneed:Listofformulae(MF19)
INSTRUCTIONS
Answerallquestions.

1Find the set of values of x satisfying the inequality x^2 - 5x + 6 < 0. [4]
2The line l has equation y = 2x + 3. [3]
`;

const SAMPLE_MS_COMPACT_INLINE_PARTS = `
Question
Answer
Marks
Guidance
6(a) Use identity B1 Obtain result A1 3 6(b) Solve quadratic M1 Obtain answer A1 3 6(c) Integrate expression M1 Obtain final answer A1 3
10(a) Differentiate expression M1 Obtain derivative A1 4 10(b) Integrate by parts M1 Obtain final answer A1 5
`;

describe('parseQuestionPaper', () => {
  it('produces header and question chunks', () => {
    const chunks = parseQuestionPaper(SAMPLE_QP_TEXT, { paper_id: '9709_w23_13' });
    const types = [...new Set(chunks.map((chunk) => chunk.source_type))];
    expect(types).toContain('exam_header');
    expect(types).toContain('past_paper_question');
  });

  it('isolates exam header as non-retrieval-eligible', () => {
    const chunks = parseQuestionPaper(SAMPLE_QP_TEXT, { paper_id: '9709_w23_13' });
    const headers = chunks.filter((chunk) => chunk.source_type === 'exam_header');
    expect(headers.length).toBeGreaterThanOrEqual(1);
    for (const header of headers) {
      expect(header.retrieval_eligible).toBe(false);
    }
  });

  it('keeps duration and instructions out of the retrievable Q1 chunk', () => {
    const chunks = parseQuestionPaper(SAMPLE_QP_TEXT, { paper_id: '9709_w23_13' });
    const q1 = chunks.find((chunk) => chunk.question_id === 'Q1');
    expect(q1).toBeDefined();
    expect(q1.content).toMatch(/^1 A curve is such that its gradient/);
    expect(q1.content).not.toMatch(/1 hour 50 minutes/i);
    expect(q1.content).not.toMatch(/INSTRUCTIONS/i);
    expect(q1.content).not.toMatch(/Answer all questions/i);
  });

  it('retains duration and instructions inside the non-retrieval exam header', () => {
    const chunks = parseQuestionPaper(SAMPLE_QP_TEXT, { paper_id: '9709_w23_13' });
    const header = chunks.find((chunk) => chunk.source_type === 'exam_header');
    expect(header).toBeDefined();
    expect(header.content).toMatch(/1 hour 50 minutes/i);
    expect(header.content).toMatch(/INSTRUCTIONS/i);
    expect(header.content).toMatch(/Answer all questions/i);
  });

  it('does not treat compact duration lines as Q1 boundaries', () => {
    const chunks = parseQuestionPaper(SAMPLE_QP_COMPACT_HEADER_TEXT, { paper_id: '9709_w23_23' });
    const q1 = chunks.find((chunk) => chunk.question_id === 'Q1');
    const header = chunks.find((chunk) => chunk.source_type === 'exam_header');
    expect(q1).toBeDefined();
    expect(header).toBeDefined();
    expect(q1.content).toMatch(/^1Find the set of values of x satisfying the inequality/);
    expect(q1.content).not.toMatch(/1hour15minutes/i);
    expect(header.content).toMatch(/1hour15minutes/i);
  });

  it('detects question and part boundaries, including nested roman parts', () => {
    const chunks = parseQuestionPaper(SAMPLE_QP_TEXT, { paper_id: '9709_w23_13' });
    const ids = chunks
      .filter((chunk) => chunk.source_type === 'past_paper_question')
      .map((chunk) => chunk.question_id);

    expect(ids).toEqual(expect.arrayContaining(['Q1', 'Q2a', 'Q2b', 'Q3a', 'Q3b', 'Q4ai', 'Q4aii', 'Q4b']));
    expect(ids).not.toContain('Q2stem');
    expect(ids).not.toContain('Q4i');
  });

  it('carries shared stem text into split parts', () => {
    const chunks = parseQuestionPaper(SAMPLE_QP_TEXT, { paper_id: '9709_w23_13' });
    const q2a = chunks.find((chunk) => chunk.question_id === 'Q2a');
    const q2b = chunks.find((chunk) => chunk.question_id === 'Q2b');
    expect(q2a.content).toMatch(/The circle with equation/);
    expect(q2b.content).toMatch(/The circle with equation/);
  });

  it('extracts marks for nested parts', () => {
    const chunks = parseQuestionPaper(SAMPLE_QP_TEXT, { paper_id: '9709_w23_13' });
    const q4aii = chunks.find((chunk) => chunk.question_id === 'Q4aii');
    expect(q4aii).toBeDefined();
    expect(q4aii.marks).toBe(2);
  });

  it('preserves question_id across token sub-splitting', () => {
    const longBody = Array.from({ length: 2200 }, (_, index) => `term${index}`).join(' ');
    const chunks = parseQuestionPaper(`1 ${longBody} [4]`, { paper_id: 'long_qp' });
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => chunk.question_id === 'Q1')).toBe(true);
    expect(chunks.some((chunk) => chunk.subchunk_index === 0)).toBe(true);
  });

  it('strips answer-space dots from content', () => {
    const chunks = parseQuestionPaper(
      'INSTRUCTIONS\n1 Find the value of x. [3]\n.................................................\n2 Solve for y. [2]',
      { paper_id: 'test' },
    );
    for (const chunk of chunks) {
      expect(chunk.content).not.toMatch(/\.{10,}/);
    }
  });

  it('returns empty array for empty input', () => {
    expect(parseQuestionPaper('')).toEqual([]);
    expect(parseQuestionPaper(null)).toEqual([]);
  });

  it('does not misread page-turn page numbers as later question ids in 9709_w23_qp_23', async () => {
    const rawText = await extractPdfText(REAL_QP_9709_W23_23);
    const chunks = parseQuestionPaper(rawText, { paper_id: '9709_w23_23' });
    const ids = chunks
      .filter((chunk) => chunk.retrieval_eligible)
      .map((chunk) => chunk.question_id);

    expect(ids).toEqual(expect.arrayContaining(['Q2', 'Q3a', 'Q3b', 'Q4a', 'Q4b', 'Q4c', 'Q5b', 'Q7a']));
    expect(ids).not.toEqual(expect.arrayContaining(['Q9a', 'Q9c', 'Q11b', 'Q11c', 'Q11d', 'Q12']));
  });

  it('does not treat formula fragments as question boundaries in 9709_w23_qp_33', async () => {
    const rawText = await extractPdfText(REAL_QP_9709_W23_33);
    const chunks = parseQuestionPaper(rawText, { paper_id: '9709_w23_33' });
    const retrievalChunks = chunks.filter((chunk) => chunk.retrieval_eligible);
    const ids = retrievalChunks.map((chunk) => chunk.question_id);
    const q2 = retrievalChunks.find((chunk) => chunk.question_id === 'Q2');

    expect(q2).toBeDefined();
    expect(q2.content).toMatch(/Argand diagram/i);
    expect(ids).toEqual(expect.arrayContaining(['Q9a', 'Q9b', 'Q9c', 'Q10a', 'Q10b', 'Q11a', 'Q11b', 'Q11c']));
    expect(ids).not.toEqual(expect.arrayContaining(['Q17a', 'Q17b', 'Q17c']));
  });
});

describe('parseMarkScheme', () => {
  it('isolates marking principles as non-retrieval-eligible', () => {
    const chunks = parseMarkScheme(SAMPLE_MS_TEXT, { paper_id: '9709_w23_13' });
    const principles = chunks.filter((chunk) => chunk.source_type === 'marking_principle');
    expect(principles.length).toBeGreaterThanOrEqual(1);
    expect(principles.every((chunk) => chunk.retrieval_eligible === false)).toBe(true);
  });

  it('keeps generic principles out of retrieval chunks when expected ids are supplied', () => {
    const qpChunks = parseQuestionPaper(SAMPLE_QP_TEXT, { paper_id: '9709_w23_13' });
    const expectedIds = qpChunks.filter((chunk) => chunk.retrieval_eligible).map((chunk) => chunk.question_id);
    const chunks = parseMarkScheme(SAMPLE_MS_TEXT, {
      paper_id: '9709_w23_13',
      expected_question_ids: expectedIds,
    });
    const firstQuestion = chunks.find((chunk) => chunk.question_id === 'Q1');
    expect(firstQuestion.content).not.toMatch(/GENERIC MARKING PRINCIPLE/);
  });

  it('splits mark scheme into aligned question-part chunks', () => {
    const chunks = parseMarkScheme(SAMPLE_MS_TEXT, {
      paper_id: '9709_w23_13',
      expected_question_ids: ['Q1', 'Q2a', 'Q2b', 'Q3a', 'Q3b', 'Q4ai', 'Q4aii', 'Q4b'],
    });
    const ids = chunks
      .filter((chunk) => chunk.source_type === 'mark_scheme_question')
      .map((chunk) => chunk.question_id);
    expect(ids).toEqual(expect.arrayContaining(['Q1', 'Q2a', 'Q2b', 'Q3a', 'Q3b', 'Q4ai', 'Q4aii', 'Q4b']));
  });

  it('extracts M/A/B mark labels', () => {
    const chunks = parseMarkScheme(SAMPLE_MS_TEXT, {
      paper_id: '9709_w23_13',
      expected_question_ids: ['Q1', 'Q2a', 'Q2b'],
    });
    const q1 = chunks.find((chunk) => chunk.question_id === 'Q1');
    expect(q1.mark_labels).toEqual(expect.arrayContaining(['M1', 'A1']));
  });

  it('returns empty array for empty input', () => {
    expect(parseMarkScheme('')).toEqual([]);
    expect(parseMarkScheme(null)).toEqual([]);
  });

  it('keeps mark scheme alignment on real 9709_w23_ms_23 blocks with expected ids', async () => {
    const rawText = await extractPdfText(REAL_MS_9709_W23_23);
    const chunks = parseMarkScheme(rawText, {
      paper_id: '9709_w23_23',
      expected_question_ids: ['Q5a', 'Q5b', 'Q6a', 'Q6b', 'Q7a', 'Q7b'],
    });
    const ids = chunks
      .filter((chunk) => chunk.retrieval_eligible)
      .map((chunk) => chunk.question_id);

    expect(ids).toEqual(expect.arrayContaining(['Q5a', 'Q5b', 'Q6a', 'Q6b', 'Q7a', 'Q7b']));
    expect(ids).not.toContain('Q19');
  });

  it('splits compact inline part markers inside the same mark-scheme line', () => {
    const chunks = parseMarkScheme(SAMPLE_MS_COMPACT_INLINE_PARTS, {
      paper_id: '9709_compact_ms',
      expected_question_ids: ['Q6a', 'Q6b', 'Q6c', 'Q10a', 'Q10b'],
    });
    const q6a = chunks.find((chunk) => chunk.question_id === 'Q6a');
    const q6b = chunks.find((chunk) => chunk.question_id === 'Q6b');
    const q6c = chunks.find((chunk) => chunk.question_id === 'Q6c');
    const q10a = chunks.find((chunk) => chunk.question_id === 'Q10a');
    const q10b = chunks.find((chunk) => chunk.question_id === 'Q10b');

    expect(q6a.content).toMatch(/^6\(a\)/i);
    expect(q6a.content).not.toMatch(/6\(b\)/i);
    expect(q6b.content).toMatch(/^6\(b\)/i);
    expect(q6b.content).not.toMatch(/6\(c\)/i);
    expect(q6c.content).toMatch(/^6\(c\)/i);
    expect(q10a.content).toMatch(/^10\(a\)/i);
    expect(q10a.content).not.toMatch(/10\(b\)/i);
    expect(q10b.content).toMatch(/^10\(b\)/i);
  });

  it('keeps real 9709_w23_ms_23 sub-question chunks from bleeding into the next part', async () => {
    const rawText = await extractPdfText(REAL_MS_9709_W23_23);
    const chunks = parseMarkScheme(rawText, {
      paper_id: '9709_w23_23',
      expected_question_ids: ['Q5a', 'Q5b', 'Q6a', 'Q6b', 'Q6c', 'Q7a', 'Q7b', 'Q7c', 'Q7d'],
    });
    const q5a = chunks.find((chunk) => chunk.question_id === 'Q5a');
    const q6a = chunks.find((chunk) => chunk.question_id === 'Q6a');
    const q6b = chunks.find((chunk) => chunk.question_id === 'Q6b');
    const q6c = chunks.find((chunk) => chunk.question_id === 'Q6c');
    const q7a = chunks.find((chunk) => chunk.question_id === 'Q7a');

    expect(q5a.content).not.toMatch(/5\(b\)/i);
    expect(q6a.content).not.toMatch(/6\(b\)/i);
    expect(q6b.content).not.toMatch(/6\(c\)/i);
    expect(q6c.content).not.toMatch(/Page\s+11\s+of\s+12/i);
    expect(q7a.content).not.toMatch(/7\(b\)/i);
  });

  it('keeps real 9709_w23_ms_33 sub-question chunks from bleeding into the next part', async () => {
    const rawText = await extractPdfText(REAL_MS_9709_W23_33);
    const chunks = parseMarkScheme(rawText, {
      paper_id: '9709_w23_33',
      expected_question_ids: ['Q9a', 'Q9b', 'Q9c', 'Q10a', 'Q10b', 'Q11a', 'Q11b', 'Q11c'],
    });
    const q9a = chunks.find((chunk) => chunk.question_id === 'Q9a');
    const q9b = chunks.find((chunk) => chunk.question_id === 'Q9b');
    const q10a = chunks.find((chunk) => chunk.question_id === 'Q10a');
    const q11b = chunks.find((chunk) => chunk.question_id === 'Q11b');

    expect(q9a.content).not.toMatch(/9\(b\)/i);
    expect(q9b.content).not.toMatch(/9\(c\)/i);
    expect(q10a.content).not.toMatch(/10\(b\)/i);
    expect(q11b.content).not.toMatch(/11\(c\)/i);
  });
});

describe('buildPairingIndex', () => {
  it('pairs QP and MS chunks by paper_id + question_id using arrays', () => {
    const index = buildPairingIndex(
      [
        { paper_id: 'p', question_id: 'Q1', retrieval_eligible: true },
        { paper_id: 'p', question_id: 'Q1', retrieval_eligible: true, subchunk_index: 1 },
      ],
      [
        { paper_id: 'p', question_id: 'Q1', retrieval_eligible: true },
      ],
    );

    expect(index.size).toBe(1);
    const entry = index.get('p::Q1');
    expect(entry.qp).toHaveLength(2);
    expect(entry.ms).toHaveLength(1);
  });

  it('excludes non-retrieval-eligible chunks from pairing', () => {
    const index = buildPairingIndex(
      [
        { paper_id: 'p', question_id: 'Q1', retrieval_eligible: true },
        { paper_id: 'p', question_id: 'Q2', retrieval_eligible: false },
      ],
      [
        { paper_id: 'p', question_id: 'Q1', retrieval_eligible: true },
        { paper_id: 'p', question_id: 'Q2', retrieval_eligible: false },
      ],
    );

    expect(index.size).toBe(1);
    for (const entry of index.values()) {
      expect(entry.qp.every((chunk) => chunk.retrieval_eligible)).toBe(true);
      expect(entry.ms.every((chunk) => chunk.retrieval_eligible)).toBe(true);
    }
  });
});



