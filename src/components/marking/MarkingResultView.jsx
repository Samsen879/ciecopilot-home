import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import EvidencePanel from '../evidence/EvidencePanel';
import MarkingRubricPanel from './MarkingRubricPanel';
import MarkingStatePanel from './MarkingStatePanel';
import MarkingSummaryPanel from './MarkingSummaryPanel';
import MarkingTimeline from './MarkingTimeline';

export default function MarkingResultView({
  request,
  status,
  summary,
  timeline,
  rubric,
  evidence,
  diagnostics,
  recommendations,
  selectedCriterionId,
  selectedEvidenceId,
  onCriterionSelect,
  onEvidenceSelect,
  onPrimaryAction,
}) {
  const showStructuredLayout = status.key === 'completed' || status.key === 'processing' || status.key === 'error';

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={status.key}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -18 }}
        transition={{ duration: 0.24 }}
        className="space-y-6"
      >
        {!showStructuredLayout ? (
          <MarkingStatePanel
            status={status}
            request={request}
            diagnostics={diagnostics}
            onPrimaryAction={onPrimaryAction}
          />
        ) : (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.95fr)]">
            <div className="space-y-6">
              {status.key === 'error' ? (
                <MarkingStatePanel
                  status={status}
                  request={request}
                  diagnostics={diagnostics}
                  onPrimaryAction={onPrimaryAction}
                />
              ) : (
                <MarkingSummaryPanel
                  request={request}
                  status={status}
                  summary={summary}
                  recommendations={recommendations}
                  diagnostics={diagnostics}
                />
              )}

              <MarkingTimeline timeline={timeline} status={status} />

              {status.key !== 'error' ? (
                <MarkingRubricPanel
                  rubric={rubric}
                  selectedCriterionId={selectedCriterionId}
                  onCriterionSelect={onCriterionSelect}
                />
              ) : null}
            </div>

            <EvidencePanel
              evidence={evidence}
              criteriaById={rubric.criteriaById}
              selectedCriterionId={selectedCriterionId}
              selectedEvidenceId={selectedEvidenceId}
              onEvidenceSelect={onEvidenceSelect}
            />
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
