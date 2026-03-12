import { normalizeLatex, estimateFormulaDensity } from './latex-normalizer.js';

const BOILERPLATE_PATTERNS = [
  /\.{10,}/g,
  /\u00a9\s*UCLES\s*\d{4}/gi,
  /\[Turn over\]/gi,
  /\d{4}\/\d{1,2}\/[A-Z]\/[A-Z]\/\d{2}/g,
  /This document (?:has|consists of) \d+ (?:printed )?pages?[^.]*\.?/gi,
  /Any blank pages are indicated\.?/gi,
  /BLANK PAGE/gi,
  /\*\d+\*/g,
  /JC\d{2}\s+\d{2}_\d{4}_\d{2}\/\d{1,2}R?/gi,
];

const MARK_SCHEME_NOISE_PATTERNS = [
  /^Question\s+Answer\s+Marks\s+Guidance$/i,
  /^PUBLISHED$/i,
  /^(?:October\/November|May\/June|February\/March)\s+\d{4}$/i,
  /^Page\s+\d+\s+of\s+\d+$/i,
  /^©\s*UCLES\s*\d{4}(?:\s+Page \d+ of \d+)?$/i,
  /^\d{4}\/\d{1,2}\s+Cambridge International[^\n]*Mark Scheme$/i,
  /^Cambridge International AS & A Level$/i,
  /^MATHEMATICS\s+\d{4}\/\d{1,2}$/i,
  /^Paper\s+\d+.*$/i,
  /^Maximum Mark:\s*\d+/i,
];

const MAX_CHUNK_TOKENS = 800;
const MAX_QUESTION_NUMBER = 20;
const NON_QUESTION_INLINE_PATTERNS = [
  /^\d{1,2}\s*hour(?:s)?(?:\s*\d{1,2}\s*minute(?:s)?)?\b/i,
  /^\d{1,2}\s*minute(?:s)?\b/i,
];

function approxTokenCount(text) {
  if (!text) return 0;
  return Math.ceil(text.split(/\s+/).filter(Boolean).length * 0.75);
}

function sanitizeExtractionArtifacts(text) {
  return String(text || '')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, ' ')
    .replace(/\u00b3/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function stripBoilerplate(text) {
  let cleaned = String(text || '');
  for (const pattern of BOILERPLATE_PATTERNS) {
    cleaned = cleaned.replace(pattern, ' ');
  }
  return sanitizeExtractionArtifacts(cleaned);
}

function stripPageHeaders(text) {
  const lines = String(text || '').split('\n');
  return lines
    .filter((line) => !isPageArtifactLine(line))
    .join('\n');
}

function stripStandalonePageNumbers(text) {
  const lines = String(text || '').split('\n');
  const result = [];

  for (let index = 0; index < lines.length; index += 1) {
    const current = lines[index].trim();
    const previous = previousSignificantLine(lines, index);
    const next = nextSignificantLine(lines, index + 1);

    if (
      /^\d{1,2}$/.test(current)
      && (isPageArtifactLine(previous) || isPageArtifactLine(next))
    ) {
      const pageNumber = Number(current);
      if (pageNumber >= 1 && pageNumber <= 30) {
        continue;
      }
    }

    result.push(lines[index]);
  }

  return result.join('\n');
}

function getLineOffsets(text) {
  const lines = String(text || '').split('\n');
  const offsets = [];
  let runningOffset = 0;
  for (const line of lines) {
    offsets.push(runningOffset);
    runningOffset += line.length + 1;
  }
  return { lines, offsets };
}

function compactLine(text) {
  return String(text || '')
    .replace(/\s+/g, '')
    .replace(/[\u001f\ufffd]/g, '')
    .trim()
    .toLowerCase();
}

function isPageArtifactLine(line) {
  const compact = compactLine(line);
  if (!compact) return false;
  return (
    /^©?ucles\d{4}(?:\[?turnover\]?)?$/.test(compact)
    || /^\d{4}\/\d{1,2}\/[a-z]\/[a-z]\/\d{2}(?:©?ucles\d{4}(?:\[?turnover\]?)?)?$/.test(compact)
    || /^©?ucles\d{4}\d{4}\/\d{1,2}\/[a-z]\/[a-z]\/\d{2}(?:\[?turnover\]?)?$/.test(compact)
    || /^\[?turnover\]?$/.test(compact)
    || /^thisdocument(?:has|consistsof)\d+(?:printed)?pages?\.?$/.test(compact)
    || /^jc\d+_\d+_\d+\/[a-z0-9]+$/i.test(compact)
    || /^additionalpage$/.test(compact)
    || /^blankpage$/.test(compact)
  );
}

function previousSignificantLine(lines, startIndex) {
  for (let index = startIndex - 1; index >= 0; index -= 1) {
    const trimmed = lines[index].trim();
    if (trimmed) return trimmed;
  }
  return null;
}

function nextSignificantLine(lines, startIndex) {
  for (let index = startIndex; index < lines.length; index += 1) {
    const trimmed = lines[index].trim();
    if (trimmed) return trimmed;
  }
  return null;
}

function isLikelyNonQuestionLine(trimmedLine) {
  return NON_QUESTION_INLINE_PATTERNS.some((pattern) => pattern.test(trimmedLine));
}

function isLikelyQuestionLeadText(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return false;
  if (/^\([a-h]\)/i.test(trimmed) || /^[A-Z]/.test(trimmed)) {
    return true;
  }
  const lowerWordMatch = trimmed.match(/^([a-z][a-z0-9]*)\b/);
  if (!lowerWordMatch) return false;
  const token = lowerWordMatch[1].toLowerCase();
  if (['x', 'y', 'z', 'sin', 'cos', 'tan', 'cot', 'sec', 'cosec', 'ln', 'log', 'exp'].includes(token)) {
    return false;
  }
  return token.length >= 3;
}

function isLikelyFormulaFragmentLine(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return false;
  if (/^\d{1,3}$/.test(trimmed)) return true;
  if (/^[+\-−=.,]+$/.test(trimmed)) return true;
  if (trimmed.length <= 3 && !isLikelyQuestionLeadText(trimmed)) return true;
  return false;
}

function hasStandaloneQuestionContext(lines, startIndex) {
  let significantSeen = 0;
  for (let index = startIndex; index < lines.length; index += 1) {
    const trimmed = lines[index].trim();
    if (!trimmed || isPageArtifactLine(trimmed)) continue;
    if (/^\d{1,2}$/.test(trimmed)) return false;
    significantSeen += 1;
    if (isLikelyQuestionLeadText(trimmed)) return true;
    if (significantSeen >= 4) return false;
  }
  return false;
}

function detectQuestionBoundaries(text) {
  const { lines, offsets } = getLineOffsets(text);
  const boundaries = [];
  const seen = new Set();

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    const inlineMatch = trimmed.match(/^(\d{1,2})(.*)$/);
    if (inlineMatch) {
      const questionNum = Number(inlineMatch[1]);
      const remainder = inlineMatch[2]?.trimStart() || '';
      if (
        questionNum >= 1
        && questionNum <= MAX_QUESTION_NUMBER
        && !seen.has(questionNum)
        && isLikelyQuestionLeadText(remainder)
      ) {
        if (isLikelyNonQuestionLine(trimmed)) {
          continue;
        }
        boundaries.push({
          questionNum,
          index: offsets[index] + rawLine.indexOf(inlineMatch[1]),
        });
        seen.add(questionNum);
        continue;
      }
    }

    const standaloneMatch = trimmed.match(/^(\d{1,2})$/);
    if (!standaloneMatch) continue;

    const questionNum = Number(standaloneMatch[1]);
    if (questionNum < 1 || questionNum > MAX_QUESTION_NUMBER || seen.has(questionNum)) {
      continue;
    }

    const previousLine = previousSignificantLine(lines, index);
    if (isLikelyFormulaFragmentLine(previousLine)) {
      continue;
    }

    const nextLine = nextSignificantLine(lines, index + 1);
    if (!nextLine) continue;
    if (!hasStandaloneQuestionContext(lines, index + 1)) {
      continue;
    }
    if (isLikelyNonQuestionLine(nextLine) || /^\d{1,2}$/.test(nextLine)) {
      continue;
    }

    boundaries.push({
      questionNum,
      index: offsets[index] + rawLine.indexOf(standaloneMatch[1]),
    });
    seen.add(questionNum);
  }

  return boundaries.sort((left, right) => left.index - right.index);
}

function detectLetterPartBoundaries(text, questionNumber) {
  const boundaries = [];
  const seen = new Set();

  const leadingPattern = new RegExp(`^\\s*${questionNumber}\\s*\\(([a-h])\\)`, 'i');
  const leadingMatch = text.match(leadingPattern);
  if (leadingMatch) {
    boundaries.push({ index: 0, label: leadingMatch[1].toLowerCase() });
    seen.add(`0:${leadingMatch[1].toLowerCase()}`);
  }

  const linePattern = /(?:^|\n)\s*\(([a-h])\)/g;
  let match;
  while ((match = linePattern.exec(text)) !== null) {
    const label = match[1].toLowerCase();
    const index = match.index + match[0].lastIndexOf('(');
    const key = `${index}:${label}`;
    if (!seen.has(key)) {
      boundaries.push({ index, label });
      seen.add(key);
    }
  }

  return boundaries.sort((left, right) => left.index - right.index);
}

function detectRomanPartBoundaries(text, questionNumber, letterLabel) {
  const boundaries = [];
  const seen = new Set();

  const leadingPattern = new RegExp(`^\\s*(?:${questionNumber}\\s*\\(${letterLabel}\\)\\s*)?\\(([ivx]+)\\)`, 'i');
  const leadingMatch = text.match(leadingPattern);
  if (leadingMatch) {
    boundaries.push({ index: 0, label: leadingMatch[1].toLowerCase() });
    seen.add(`0:${leadingMatch[1].toLowerCase()}`);
  }

  const linePattern = /(?:^|\n)\s*\(([ivx]+)\)/g;
  let match;
  while ((match = linePattern.exec(text)) !== null) {
    const label = match[1].toLowerCase();
    const index = match.index + match[0].lastIndexOf('(');
    const key = `${index}:${label}`;
    if (!seen.has(key)) {
      boundaries.push({ index, label });
      seen.add(key);
    }
  }

  return boundaries.sort((left, right) => left.index - right.index);
}

function extractMarks(text) {
  const marks = [];
  const pattern = /\[(\d{1,2})\]/g;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    marks.push(Number(match[1]));
  }
  return marks;
}

function extractMarkLabels(text) {
  const labels = [];
  const pattern = /\b([MAB](?:\d+)?)\b/g;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    labels.push(match[1]);
  }
  return [...new Set(labels)];
}

function hasFigureReference(text) {
  return /\b(?:diagram|figure|graph|sketch|curve|table|image)\b/i.test(text) || /\[diagram[^\]]*\]/i.test(text);
}

function buildChunk({
  content,
  sourceType,
  paperId,
  questionId = null,
  parentQuestionId = null,
  partLabel = null,
  marks = null,
  markLabels = [],
  pageSpan = [1, 1],
  retrievalEligible = true,
  subchunkIndex = null,
}) {
  const { normalized, latex_norm_version, replacements_applied } = normalizeLatex(content);
  const tokenCount = approxTokenCount(normalized);

  return {
    content: normalized,
    content_raw_length: String(content || '').length,
    source_type: sourceType,
    paper_id: paperId,
    question_id: questionId,
    parent_question_id: parentQuestionId,
    part_label: partLabel,
    marks,
    mark_labels: markLabels.length > 0 ? markLabels : [],
    page_span: pageSpan,
    has_figure: hasFigureReference(content),
    formula_density: Number(estimateFormulaDensity(normalized).toFixed(4)),
    latex_norm_version,
    latex_replacements: replacements_applied,
    retrieval_eligible: retrievalEligible,
    token_count: tokenCount,
    subchunk_index: subchunkIndex,
  };
}

function splitContentByBudget(content) {
  const paragraphs = String(content || '')
    .split(/\n{2,}|(?<=\.)\s+/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) {
    return [String(content || '').trim()].filter(Boolean);
  }

  const chunks = [];
  let buffer = [];
  let bufferTokens = 0;

  for (const paragraph of paragraphs) {
    const paragraphTokens = approxTokenCount(paragraph);
    if (buffer.length > 0 && bufferTokens + paragraphTokens > MAX_CHUNK_TOKENS) {
      chunks.push(buffer.join(' ').trim());
      buffer = [];
      bufferTokens = 0;
    }

    if (paragraphTokens > MAX_CHUNK_TOKENS) {
      const words = paragraph.split(/\s+/).filter(Boolean);
      let wordBuffer = [];
      let wordTokens = 0;
      for (const word of words) {
        const nextTokens = approxTokenCount(word);
        if (wordBuffer.length > 0 && wordTokens + nextTokens > MAX_CHUNK_TOKENS) {
          chunks.push(wordBuffer.join(' ').trim());
          wordBuffer = [];
          wordTokens = 0;
        }
        wordBuffer.push(word);
        wordTokens += nextTokens;
      }
      if (wordBuffer.length > 0) {
        chunks.push(wordBuffer.join(' ').trim());
      }
      continue;
    }

    buffer.push(paragraph);
    bufferTokens += paragraphTokens;
  }

  if (buffer.length > 0) {
    chunks.push(buffer.join(' ').trim());
  }

  return chunks.filter(Boolean);
}

function tokenSubSplit(chunk) {
  if (chunk.token_count <= MAX_CHUNK_TOKENS) {
    return [chunk];
  }

  return splitContentByBudget(chunk.content).map((content, index) => ({
    ...chunk,
    content,
    token_count: approxTokenCount(content),
    subchunk_index: index,
  }));
}

function withSharedStem(stemText, partText) {
  if (!stemText || stemText.length < 20) {
    return partText;
  }
  return `${stemText}\n${partText}`.trim();
}

function dedupeBoundaries(boundaries) {
  const seen = new Set();
  const result = [];
  for (const boundary of boundaries) {
    const key = `${boundary.index}:${boundary.label}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(boundary);
  }
  return result.sort((left, right) => left.index - right.index);
}

function decomposeQuestionId(questionId) {
  const match = /^Q(\d+)([a-h])?([ivx]+)?$/i.exec(questionId || '');
  if (!match) {
    return { number: null, letter: null, roman: null };
  }
  return {
    number: Number(match[1]),
    letter: match[2] ? match[2].toLowerCase() : null,
    roman: match[3] ? match[3].toLowerCase() : null,
  };
}

function deriveParentQuestionId(questionId) {
  const { number, letter, roman } = decomposeQuestionId(questionId);
  if (!number) return null;
  if (roman) return `Q${number}${letter}`;
  if (letter) return `Q${number}`;
  return `Q${number}`;
}

function buildQuestionChunks({
  questionText,
  questionNumber,
  paperId,
  sourceType,
  markLabels = false,
}) {
  if (!questionText || questionText.trim().length < 5) {
    return [];
  }

  const chunks = [];
  const questionId = `Q${questionNumber}`;
  const topLevelParts = dedupeBoundaries(detectLetterPartBoundaries(questionText, questionNumber));

  if (topLevelParts.length === 0) {
    const marks = extractMarks(questionText);
    chunks.push(buildChunk({
      content: questionText,
      sourceType,
      paperId,
      questionId,
      parentQuestionId: questionId,
      marks: marks.length > 0 ? marks[marks.length - 1] : null,
      markLabels: markLabels ? extractMarkLabels(questionText) : [],
    }));
    return chunks;
  }

  const questionStem = questionText.slice(0, topLevelParts[0].index).trim();

  for (let index = 0; index < topLevelParts.length; index += 1) {
    const current = topLevelParts[index];
    const next = topLevelParts[index + 1];
    const topLevelText = questionText.slice(current.index, next ? next.index : undefined).trim();
    if (topLevelText.length < 5) continue;

    const topLevelQuestionId = `${questionId}${current.label}`;
    const romanParts = dedupeBoundaries(detectRomanPartBoundaries(topLevelText, questionNumber, current.label));

    if (romanParts.length === 0) {
      const marks = extractMarks(topLevelText);
      chunks.push(buildChunk({
        content: withSharedStem(questionStem, topLevelText),
        sourceType,
        paperId,
        questionId: topLevelQuestionId,
        parentQuestionId: questionId,
        partLabel: current.label,
        marks: marks.length > 0 ? marks[marks.length - 1] : null,
        markLabels: markLabels ? extractMarkLabels(topLevelText) : [],
      }));
      continue;
    }

    const romanStem = topLevelText.slice(0, romanParts[0].index).trim();
    for (let romanIndex = 0; romanIndex < romanParts.length; romanIndex += 1) {
      const romanCurrent = romanParts[romanIndex];
      const romanNext = romanParts[romanIndex + 1];
      const romanText = topLevelText.slice(romanCurrent.index, romanNext ? romanNext.index : undefined).trim();
      if (romanText.length < 5) continue;

      const marks = extractMarks(romanText);
      chunks.push(buildChunk({
        content: withSharedStem(romanStem || questionStem, romanText),
        sourceType,
        paperId,
        questionId: `${topLevelQuestionId}${romanCurrent.label}`,
        parentQuestionId: topLevelQuestionId,
        partLabel: romanCurrent.label,
        marks: marks.length > 0 ? marks[marks.length - 1] : null,
        markLabels: markLabels ? extractMarkLabels(romanText) : [],
      }));
    }
  }

  return chunks;
}

function firstTableHeaderIndex(text) {
  return text.search(/Question\s+Answer\s+Marks\s+Guidance/i);
}

function isMarkSchemeNoiseLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return false;
  return MARK_SCHEME_NOISE_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function buildQuestionIdMatcher(questionId) {
  const { number, letter, roman } = decomposeQuestionId(questionId);
  if (!number) return null;
  if (roman) {
    return new RegExp(`^${number}\\s*\\(${letter}\\)\\s*\\(${roman}\\)(?:\\s|$)`, 'i');
  }
  if (letter) {
    return new RegExp(`^${number}\\s*\\(${letter}\\)(?!\\s*\\([ivx]+\\))(?:\\s|$)`, 'i');
  }
  return new RegExp(`^${number}\\s*$`, 'i');
}

function buildInlineQuestionIdMatcher(questionId) {
  const { number, letter, roman } = decomposeQuestionId(questionId);
  if (!number || (!letter && !roman)) return null;
  if (roman) {
    return new RegExp(`(?:^|\\s)${number}\\s*\\(${letter}\\)\\s*\\(${roman}\\)(?=\\s|$)`, 'ig');
  }
  return new RegExp(`(?:^|\\s)${number}\\s*\\(${letter}\\)(?!\\s*\\([ivx]+\\))(?=\\s|$)`, 'ig');
}

function hasMarkSchemeTableContext(lines, lineIndex) {
  const isHeaderLine = (line) => (
    /^Question$/i.test(line)
    || /^Answer$/i.test(line)
    || /^Marks$/i.test(line)
    || /^Guidance$/i.test(line)
    || /^Question\s+Answer\s+Marks\s+Guidance$/i.test(line)
  );

  const tail = [];
  for (let index = lineIndex - 1; index >= Math.max(0, lineIndex - 8); index -= 1) {
    const trimmed = lines[index].trim();
    if (!trimmed) continue;
    if (!isHeaderLine(trimmed)) break;
    tail.unshift(trimmed);
  }

  return tail.length > 0
    && tail.some((line) => /^Guidance$/i.test(line) || /^Question\s+Answer\s+Marks\s+Guidance$/i.test(line));
}

function findMsBlocksByExpectedIds(contentText, expectedQuestionIds) {
  const lines = String(contentText || '')
    .split('\n')
    .filter((line) => !isMarkSchemeNoiseLine(line));
  const filteredText = lines.join('\n');
  const { offsets } = getLineOffsets(filteredText);

  const patterns = expectedQuestionIds
    .map((questionId) => ({
      questionId,
      regex: buildQuestionIdMatcher(questionId),
      inlineRegex: buildInlineQuestionIdMatcher(questionId),
      specificity: questionId.length,
      parsed: decomposeQuestionId(questionId),
    }))
    .filter((entry) => entry.regex)
    .sort((left, right) => right.specificity - left.specificity);

  const markers = [];
  const markerKeys = new Set();
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();
    if (!trimmed) continue;

    for (const pattern of patterns) {
      if (pattern.parsed.letter || pattern.parsed.roman) {
        pattern.inlineRegex.lastIndex = 0;
        let inlineMatch;
        while ((inlineMatch = pattern.inlineRegex.exec(line)) !== null) {
          const digitOffset = inlineMatch[0].search(/\d/);
          const absoluteIndex = offsets[index] + inlineMatch.index + Math.max(digitOffset, 0);
          const key = `${absoluteIndex}:${pattern.questionId}`;
          if (markerKeys.has(key)) continue;
          markerKeys.add(key);
          markers.push({ index: absoluteIndex, questionId: pattern.questionId });
        }
        continue;
      }

      if (!pattern.regex.test(trimmed) || !hasMarkSchemeTableContext(lines, index)) {
        continue;
      }

      const absoluteIndex = offsets[index] + line.search(/\d/);
      const key = `${absoluteIndex}:${pattern.questionId}`;
      if (markerKeys.has(key)) {
        continue;
      }
      markerKeys.add(key);
      markers.push({ index: absoluteIndex, questionId: pattern.questionId });
    }
  }

  if (markers.length === 0) {
    return [];
  }

  markers.sort((left, right) => left.index - right.index);

  const blocks = [];
  for (let index = 0; index < markers.length; index += 1) {
    const current = markers[index];
    const next = markers[index + 1];
    const text = filteredText.slice(current.index, next ? next.index : undefined).trim();
    if (text.length < 5) continue;
    blocks.push({ questionId: current.questionId, text });
  }
  return blocks;
}

export function parseQuestionPaper(rawText, metadata = {}) {
  if (!rawText || typeof rawText !== 'string') return [];

  const paperId = metadata.paper_id || 'unknown';
  let cleaned = stripStandalonePageNumbers(rawText);
  cleaned = stripBoilerplate(cleaned);
  cleaned = stripPageHeaders(cleaned);
  cleaned = cleaned.replace(/Additional\s*Page[\s\S]*$/i, '').trim();

  const chunks = [];
  const questionBoundaries = detectQuestionBoundaries(cleaned);

  if (questionBoundaries.length === 0) {
    return [buildChunk({
      content: cleaned,
      sourceType: 'past_paper_question',
      paperId,
      questionId: 'Q0',
      retrievalEligible: true,
    })].flatMap(tokenSubSplit);
  }

  const headerText = cleaned.slice(0, questionBoundaries[0].index).trim();
  if (headerText.length > 50) {
    chunks.push(buildChunk({
      content: headerText,
      sourceType: 'exam_header',
      paperId,
      retrievalEligible: false,
    }));
  }

  for (let questionIndex = 0; questionIndex < questionBoundaries.length; questionIndex += 1) {
    const current = questionBoundaries[questionIndex];
    const next = questionBoundaries[questionIndex + 1];
    const questionText = cleaned.slice(current.index, next ? next.index : undefined).trim();
    chunks.push(...buildQuestionChunks({
      questionText,
      questionNumber: current.questionNum,
      paperId,
      sourceType: 'past_paper_question',
      markLabels: false,
    }));
  }

  return chunks.flatMap(tokenSubSplit);
}

export function parseMarkScheme(rawText, metadata = {}) {
  if (!rawText || typeof rawText !== 'string') return [];

  const paperId = metadata.paper_id || 'unknown';
  let cleaned = stripStandalonePageNumbers(rawText);
  cleaned = stripBoilerplate(cleaned);
  cleaned = stripPageHeaders(cleaned);

  const chunks = [];
  const tableHeaderIndex = firstTableHeaderIndex(cleaned);
  let principlesText = '';
  let contentText = cleaned.trim();

  if (tableHeaderIndex >= 0) {
    principlesText = cleaned.slice(0, tableHeaderIndex).trim();
    contentText = cleaned.slice(tableHeaderIndex).trim();
  }

  if (principlesText.length > 50) {
    chunks.push(buildChunk({
      content: principlesText,
      sourceType: 'marking_principle',
      paperId,
      retrievalEligible: false,
    }));
  }

  const expectedQuestionIds = [...new Set((metadata.expected_question_ids || []).filter(Boolean))];
  const expectedBlocks = expectedQuestionIds.length > 0
    ? findMsBlocksByExpectedIds(contentText, expectedQuestionIds)
    : [];

  if (expectedBlocks.length > 0) {
    for (const block of expectedBlocks) {
      const marks = extractMarks(block.text);
      const parsedId = decomposeQuestionId(block.questionId);
      chunks.push(buildChunk({
        content: block.text,
        sourceType: 'mark_scheme_question',
        paperId,
        questionId: block.questionId,
        parentQuestionId: deriveParentQuestionId(block.questionId),
        partLabel: parsedId.roman || parsedId.letter,
        marks: marks.length > 0 ? marks[marks.length - 1] : null,
        markLabels: extractMarkLabels(block.text),
      }));
    }
    return chunks.flatMap(tokenSubSplit);
  }

  const questionBoundaries = detectQuestionBoundaries(contentText);
  if (questionBoundaries.length === 0) {
    if (contentText.length > 50) {
      chunks.push(buildChunk({
        content: contentText,
        sourceType: 'mark_scheme_question',
        paperId,
        questionId: 'Q0',
        markLabels: extractMarkLabels(contentText),
      }));
    }
    return chunks.flatMap(tokenSubSplit);
  }

  for (let questionIndex = 0; questionIndex < questionBoundaries.length; questionIndex += 1) {
    const current = questionBoundaries[questionIndex];
    const next = questionBoundaries[questionIndex + 1];
    const questionText = contentText.slice(current.index, next ? next.index : undefined).trim();
    chunks.push(...buildQuestionChunks({
      questionText,
      questionNumber: current.questionNum,
      paperId,
      sourceType: 'mark_scheme_question',
      markLabels: true,
    }));
  }

  return chunks.flatMap(tokenSubSplit);
}

function buildPairingKey(chunk) {
  const questionId = chunk?.question_id || chunk?.parent_question_id;
  if (!chunk?.paper_id || !questionId) return null;
  return `${chunk.paper_id}::${questionId}`;
}

export function buildPairingIndex(qpChunks, msChunks) {
  const index = new Map();

  for (const chunk of qpChunks) {
    if (!chunk.retrieval_eligible) continue;
    const key = buildPairingKey(chunk);
    if (!key) continue;
    if (!index.has(key)) index.set(key, { qp: [], ms: [] });
    index.get(key).qp.push(chunk);
  }

  for (const chunk of msChunks) {
    if (!chunk.retrieval_eligible) continue;
    const key = buildPairingKey(chunk);
    if (!key) continue;
    if (!index.has(key)) index.set(key, { qp: [], ms: [] });
    index.get(key).ms.push(chunk);
  }

  return index;
}




