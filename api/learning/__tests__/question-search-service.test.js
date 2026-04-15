import { jest } from '@jest/globals';

const mockSearchQuestionProjection = jest.fn();

jest.unstable_mockModule('../lib/repositories/question-search-repository.js', () => ({
  searchQuestionProjection: mockSearchQuestionProjection,
}));

const { MAX_QUESTION_SEARCH_PAGE_SIZE, searchQuestions } = await import(
  '../lib/questions/question-search-service.js'
);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('question-search-service', () => {
  test('searchQuestions rejects requests without subject_code', async () => {
    await expect(
      searchQuestions({}, {
        page: 1,
        page_size: 10,
      }),
    ).rejects.toMatchObject({
      code: 'invalid_payload',
      status: 400,
      publicMessage: 'subject_code is required.',
      details: { field: 'subject_code' },
    });

    expect(mockSearchQuestionProjection).not.toHaveBeenCalled();
  });

  test('searchQuestions normalizes numeric filters and caps page_size before hitting the repository', async () => {
    mockSearchQuestionProjection.mockResolvedValueOnce({
      total: 1,
      rows: [
        {
          question_id: 'question-1',
          subject_code: '9709',
          search_text: 'Find tan(x).',
        },
      ],
    });

    const result = await searchQuestions({}, {
      subject_code: ' 9709 ',
      primary_topic_id: ' topic-1 ',
      family_id: ' family-1 ',
      primary_question_type_id: ' 9709.trigonometry.equations ',
      year: ' 2024 ',
      session: ' mj ',
      paper_number: ' 3 ',
      variant: ' 2 ',
      q_number: ' 5 ',
      query: ' tan ',
      page: ' 2 ',
      page_size: ' 500 ',
    });

    expect(mockSearchQuestionProjection).toHaveBeenCalledWith({}, {
      subject_code: '9709',
      primary_topic_id: 'topic-1',
      family_id: 'family-1',
      primary_question_type_id: '9709.trigonometry.equations',
      year: 2024,
      session: 'mj',
      paper_number: 3,
      variant: 2,
      q_number: 5,
      query: 'tan',
      page: 2,
      page_size: MAX_QUESTION_SEARCH_PAGE_SIZE,
    });
    expect(result.page).toBe(2);
    expect(result.page_size).toBe(MAX_QUESTION_SEARCH_PAGE_SIZE);
  });

  test('searchQuestions rejects invalid numeric filters deterministically', async () => {
    await expect(
      searchQuestions({}, {
        subject_code: '9709',
        year: 'twenty-twenty-four',
      }),
    ).rejects.toMatchObject({
      code: 'invalid_payload',
      status: 400,
      publicMessage: 'year must be a positive integer.',
      details: { field: 'year', value: 'twenty-twenty-four' },
    });

    expect(mockSearchQuestionProjection).not.toHaveBeenCalled();
  });

  test('searchQuestions rejects malformed numeric strings instead of truncating them', async () => {
    await expect(
      searchQuestions({}, {
        subject_code: '9709',
        q_number: '12a',
      }),
    ).rejects.toMatchObject({
      code: 'invalid_payload',
      status: 400,
      publicMessage: 'q_number must be a positive integer.',
      details: { field: 'q_number', value: '12a' },
    });

    expect(mockSearchQuestionProjection).not.toHaveBeenCalled();
  });

  test('searchQuestions attaches the fixed match_context shape to every returned row', async () => {
    mockSearchQuestionProjection.mockResolvedValueOnce({
      total: 1,
      rows: [
        {
          question_id: 'question-1',
          subject_code: '9709',
          family_id: 'family-1',
          search_text: 'Use a trigonometric identity.',
        },
      ],
    });

    const result = await searchQuestions({}, {
      subject_code: '9709',
      family_id: 'family-1',
      query: ' identity ',
      page: ' 1 ',
      page_size: ' 10 ',
    });

    expect(result).toEqual({
      items: [
        {
          question_id: 'question-1',
          subject_code: '9709',
          family_id: 'family-1',
          search_text: 'Use a trigonometric identity.',
          match_context: {
            filters_applied: ['subject_code', 'family_id'],
            text_query_used: true,
          },
        },
      ],
      total: 1,
      page: 1,
      page_size: 10,
    });
  });
});
