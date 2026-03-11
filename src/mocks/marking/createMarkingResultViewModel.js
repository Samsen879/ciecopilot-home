import { validateMarkingScenario } from './validateMarkingScenario.js';

const STATUS_META = {
  loading: {
    key: 'loading',
    label: '加载中',
    headline: '正在拉取评分结果',
    description: '页面已拿到任务上下文，正在等待评分摘要、rubric 和证据返回。',
    badgeClassName: 'border-sky-200 bg-sky-50 text-sky-700',
    accentClassName: 'from-sky-500/15 via-blue-500/10 to-cyan-400/15',
    panelClassName: 'border-sky-200 bg-sky-50/70 text-sky-900',
  },
  processing: {
    key: 'processing',
    label: '处理中',
    headline: '评分进行中',
    description: '方法分和证据卡已部分锁定，最终 rubric 仍可变化。',
    badgeClassName: 'border-amber-200 bg-amber-50 text-amber-700',
    accentClassName: 'from-amber-500/15 via-orange-500/10 to-yellow-400/15',
    panelClassName: 'border-amber-200 bg-amber-50/70 text-amber-900',
  },
  completed: {
    key: 'completed',
    label: '已完成',
    headline: '评分完成',
    description: '已生成可审计的分数摘要、criterion 解释与 evidence 链接。',
    badgeClassName: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    accentClassName: 'from-emerald-500/15 via-teal-500/10 to-sky-400/15',
    panelClassName: 'border-emerald-200 bg-emerald-50/70 text-emerald-900',
  },
  empty: {
    key: 'empty',
    label: '空状态',
    headline: '还没有评分结果',
    description: '当前没有选中的评分任务，或该任务尚未产出可展示内容。',
    badgeClassName: 'border-slate-200 bg-slate-50 text-slate-700',
    accentClassName: 'from-slate-400/15 via-slate-300/10 to-slate-200/15',
    panelClassName: 'border-slate-200 bg-slate-50/80 text-slate-900',
  },
  error: {
    key: 'error',
    label: '错误',
    headline: '评分流程中断',
    description: '保留失败诊断和中间 evidence，便于重试或人工排查。',
    badgeClassName: 'border-rose-200 bg-rose-50 text-rose-700',
    accentClassName: 'from-rose-500/15 via-red-500/10 to-orange-400/15',
    panelClassName: 'border-rose-200 bg-rose-50/75 text-rose-900',
  },
};

function getStatusMeta(status) {
  return STATUS_META[status] || STATUS_META.loading;
}

function getConfidenceLabel(confidence) {
  if (confidence >= 0.85) {
    return '高置信';
  }

  if (confidence >= 0.65) {
    return '建议复核';
  }

  return '低置信';
}

function toPercent(awardedMarks, totalMarks) {
  if (!totalMarks) {
    return null;
  }

  return Math.round((awardedMarks / totalMarks) * 100);
}

function toSafeArray(value) {
  return Array.isArray(value) ? value : [];
}

function toUniqueList(value) {
  return [...new Set(toSafeArray(value).filter(Boolean))];
}

export function createMarkingResultViewModel(session) {
  const contractValidation = validateMarkingScenario(session);
  const status = getStatusMeta(session?.status);
  const summary = session?.summary || null;
  const timelineItems = toSafeArray(session?.timeline).map((step, index) => ({
    ...step,
    id: step?.id || `step-${index + 1}`,
    sequence: index + 1,
    label: step?.label || `Step ${index + 1}`,
    state: step?.state || 'pending',
    detail: step?.detail || 'No detail provided.',
    timestampLabel: step?.timestampLabel || 'Pending',
    durationLabel: step?.durationLabel || 'Pending',
  }));

  const sections = toSafeArray(session?.rubric?.sections).map((section, sectionIndex) => {
    const criteria = toSafeArray(section?.criteria).map((criterion, criterionIndex) => ({
      ...criterion,
      id: criterion?.id || `${section?.id || `section-${sectionIndex + 1}`}-criterion-${criterionIndex + 1}`,
      code: criterion?.code || `C${criterionIndex + 1}`,
      descriptor: criterion?.descriptor || 'Criterion description missing.',
      awardedMarks: criterion?.awardedMarks ?? 0,
      totalMarks: criterion?.totalMarks ?? 0,
      state: criterion?.state || 'pending',
      explanation: criterion?.explanation || 'No explanation provided.',
      evidenceIds: toUniqueList(criterion?.evidenceIds),
      marksLabel: `${criterion?.awardedMarks ?? 0}/${criterion?.totalMarks ?? 0}`,
    }));

    const awardedMarks = section?.awardedMarks ?? 0;
    const totalMarks = section?.totalMarks ?? 0;

    return {
      ...section,
      id: section?.id || `section-${sectionIndex + 1}`,
      title: section?.title || `Rubric section ${sectionIndex + 1}`,
      awardedMarks,
      totalMarks,
      verdict: section?.verdict || 'pending',
      summary: section?.summary || 'No section summary provided.',
      percent: toPercent(awardedMarks, totalMarks),
      marksLabel: `${awardedMarks}/${totalMarks}`,
      criteria,
    };
  });

  const criteria = sections.flatMap((section) =>
    section.criteria.map((criterion) => ({
      ...criterion,
      sectionId: section.id,
      sectionTitle: section.title,
    })),
  );

  const criteriaById = criteria.reduce((index, criterion) => {
    index[criterion.id] = criterion;
    return index;
  }, {});

  const evidenceItems = toSafeArray(session?.evidence?.items).map((item, index) => ({
    ...item,
    id: item?.id || `evidence-${index + 1}`,
    kind: item?.kind || 'system',
    title: item?.title || `Evidence ${index + 1}`,
    sourceLabel: item?.sourceLabel || 'Unknown source',
    locationLabel: item?.locationLabel || 'Unknown location',
    excerpt: item?.excerpt || 'No excerpt provided.',
    note: item?.note || 'No evidence note provided.',
    confidence: item?.confidence ?? null,
    confidencePercent: item?.confidence == null ? null : Math.round(item.confidence * 100),
    tags: toUniqueList(item?.tags),
    linkedCriteria: toUniqueList(item?.linkedCriteria),
  }));

  const completedSteps = timelineItems.filter((step) => step.state === 'completed').length;
  const hasCurrentStep = timelineItems.some((step) => step.state === 'current');
  const timelinePercent = timelineItems.length
    ? Math.round(((completedSteps + (hasCurrentStep ? 0.5 : 0)) / timelineItems.length) * 100)
    : 0;

  const awardedMarks = summary?.awardedMarks ?? session?.rubric?.awardedMarks ?? 0;
  const totalMarks = summary?.totalMarks ?? session?.rubric?.totalMarks ?? 0;
  const scorePercent = toPercent(awardedMarks, totalMarks);
  const confidencePercent = summary?.confidence == null ? null : Math.round(summary.confidence * 100);
  const currentStep = timelineItems.find((step) => step.state === 'current') || null;
  const diagnostics = session?.diagnostics || {};
  const recommendations = session?.recommendations || { coachNote: '', nextActions: [] };

  return {
    id: session?.id || 'marking-run',
    status: {
      ...status,
      timelinePercent,
    },
    request: session?.request || null,
    summary: {
      awardedMarks,
      totalMarks,
      scorePercent,
      confidence: summary?.confidence ?? null,
      confidencePercent,
      confidenceLabel: summary?.confidence == null ? '待生成' : getConfidenceLabel(summary.confidence),
      moderationState: summary?.moderationState || 'unknown',
      runDurationLabel: summary?.runDurationLabel || null,
      headline: summary?.headline || status.headline,
      strengths: toSafeArray(summary?.strengths),
      focusAreas: toSafeArray(summary?.focusAreas),
      metrics: [
        {
          id: 'score',
          label: '得分',
          value: totalMarks ? `${awardedMarks}/${totalMarks}` : '--',
          helper: scorePercent == null ? '等待评分完成' : `已覆盖总分的 ${scorePercent}%`,
        },
        {
          id: 'confidence',
          label: '置信度',
          value: confidencePercent == null ? '待生成' : `${confidencePercent}%`,
          helper: summary?.confidence == null ? '等待 rubric 对齐' : getConfidenceLabel(summary.confidence),
        },
        {
          id: 'pipeline',
          label: '流程',
          value: timelineItems.length ? `${completedSteps}/${timelineItems.length}` : '--',
          helper: currentStep ? `当前步骤：${currentStep.label}` : status.description,
        },
        {
          id: 'evidence',
          label: '证据数',
          value: `${evidenceItems.length}`,
          helper: evidenceItems.length ? 'linked source cards' : 'No evidence returned yet',
        },
      ],
    },
    timeline: {
      items: timelineItems,
      completedSteps,
      totalSteps: timelineItems.length,
      currentStep,
    },
    rubric: {
      awardedMarks,
      totalMarks,
      sections,
      criteria,
      criteriaById,
      defaultCriterionId:
        criteria.find((criterion) => (criterion.evidenceIds || []).length > 0)?.id || criteria[0]?.id || null,
    },
    evidence: {
      items: evidenceItems,
      linkedCount: evidenceItems.filter((item) => (item.linkedCriteria || []).length > 0).length,
      defaultEvidenceId: evidenceItems[0]?.id || null,
    },
    diagnostics: {
      ...diagnostics,
      contractValidation,
    },
    recommendations,
    contractValidation,
  };
}

