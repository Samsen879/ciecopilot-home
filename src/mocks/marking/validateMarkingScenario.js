function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function pushIssue(issues, level, code, message, path) {
  issues.push({ level, code, message, path });
}

export function validateMarkingScenario(session) {
  const issues = [];
  const sections = toArray(session?.rubric?.sections);
  const evidenceItems = toArray(session?.evidence?.items);
  const criteria = [];

  if (!session?.id) {
    pushIssue(issues, 'warning', 'missing_session_id', 'Scenario is missing an id.', 'session.id');
  }

  sections.forEach((section, sectionIndex) => {
    if (!section?.id) {
      pushIssue(issues, 'warning', 'missing_section_id', 'Rubric section is missing an id.', `rubric.sections[${sectionIndex}].id`);
    }

    toArray(section?.criteria).forEach((criterion, criterionIndex) => {
      criteria.push(criterion);

      if (!criterion?.id) {
        pushIssue(
          issues,
          'warning',
          'missing_criterion_id',
          'Criterion is missing an id.',
          `rubric.sections[${sectionIndex}].criteria[${criterionIndex}].id`,
        );
      }
    });
  });

  const criterionIds = new Set(criteria.map((criterion) => criterion?.id).filter(Boolean));
  const evidenceIds = new Set(evidenceItems.map((item) => item?.id).filter(Boolean));

  criteria.forEach((criterion, criterionIndex) => {
    toArray(criterion?.evidenceIds).forEach((evidenceId) => {
      if (!evidenceIds.has(evidenceId)) {
        pushIssue(
          issues,
          'warning',
          'dangling_evidence_reference',
          `Criterion references missing evidence id '${evidenceId}'.`,
          `criteria[${criterionIndex}].evidenceIds`,
        );
      }
    });
  });

  evidenceItems.forEach((item, itemIndex) => {
    toArray(item?.linkedCriteria).forEach((criterionId) => {
      if (!criterionIds.has(criterionId)) {
        pushIssue(
          issues,
          'warning',
          'dangling_criterion_reference',
          `Evidence item references missing criterion id '${criterionId}'.`,
          `evidence.items[${itemIndex}].linkedCriteria`,
        );
      }
    });
  });

  const awardedMarks = session?.summary?.awardedMarks ?? session?.rubric?.awardedMarks ?? 0;
  const totalMarks = session?.summary?.totalMarks ?? session?.rubric?.totalMarks ?? 0;

  if (totalMarks && awardedMarks > totalMarks) {
    pushIssue(issues, 'error', 'awarded_marks_exceed_total', 'Awarded marks exceed total marks.', 'summary.awardedMarks');
  }

  return {
    isValid: !issues.some((issue) => issue.level === 'error'),
    issues,
    counts: {
      sections: sections.length,
      criteria: criteria.length,
      evidence: evidenceItems.length,
    },
  };
}

export function validateMarkingScenarioCollection(scenariosById) {
  return Object.entries(scenariosById || {}).reduce((summary, [scenarioId, scenario]) => {
    summary[scenarioId] = validateMarkingScenario(scenario);
    return summary;
  }, {});
}
