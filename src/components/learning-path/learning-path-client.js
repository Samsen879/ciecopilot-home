import { generateLearningPath } from '../../api/aiClient.js';
import { getLearningPath, upsertLearningPath } from '../../lib/supabase/learningPathQueries.js';
import { requireSessionAccessToken } from '../../services/utils/sessionAccessToken.js';
import { supabase } from '../../utils/supabase.js';
import {
  hasUsableLearningPath,
  serializeGeneratedLearningPathForStorage,
} from './learning-path-view-model.js';

export async function loadLearningPath({
  userId,
  subjectCode,
  preferences = {},
  forceRefresh = false,
} = {}) {
  if (!userId || !subjectCode) {
    throw new Error('userId and subjectCode are required');
  }

  if (!forceRefresh) {
    const { data: storedRecord } = await getLearningPath({ userId, subjectCode });
    if (hasUsableLearningPath(storedRecord)) {
      return {
        source: 'stored',
        storedRecord,
        generatedPayload: null,
      };
    }
  }

  const accessToken = await requireSessionAccessToken(supabase);
  const generatedPayload = await generateLearningPath({
    user_id: userId,
    subject_code: subjectCode,
    preferences,
  }, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const storageInput = serializeGeneratedLearningPathForStorage(generatedPayload, {
    userId,
    subjectCode,
    preferences,
  });

  try {
    const { data } = await upsertLearningPath(storageInput);
    const storedRecord = Array.isArray(data) ? data[0] : data;
    return {
      source: 'generated',
      storedRecord: hasUsableLearningPath(storedRecord) ? storedRecord : null,
      generatedPayload,
    };
  } catch (storageError) {
    return {
      source: 'generated',
      storedRecord: null,
      generatedPayload,
      storageError,
    };
  }
}
