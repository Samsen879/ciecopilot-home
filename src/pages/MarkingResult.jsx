import React, { useEffect, useState } from 'react';
import { Layers3, Link2, Workflow } from 'lucide-react';
import MarkingResultView from '../components/marking/MarkingResultView';
import MarkingScenarioSwitcher from '../components/marking/MarkingScenarioSwitcher';
import { createMarkingResultViewModel } from '../mocks/marking/createMarkingResultViewModel';
import {
  DEFAULT_MARKING_SCENARIO_ID,
  getMarkingScenario,
  getMarkingScenarioCatalog,
} from '../mocks/marking/markingResultScenarios';

const SCENARIO_CATALOG = getMarkingScenarioCatalog();

export default function MarkingResult() {
  const [activeScenarioId, setActiveScenarioId] = useState(DEFAULT_MARKING_SCENARIO_ID);
  const [queuedScenarioId, setQueuedScenarioId] = useState(null);
  const [selectedCriterionId, setSelectedCriterionId] = useState(null);
  const [selectedEvidenceId, setSelectedEvidenceId] = useState(null);

  const scenario = getMarkingScenario(activeScenarioId);
  const viewModel = createMarkingResultViewModel(scenario);

  useEffect(() => {
    setSelectedCriterionId(viewModel.rubric.defaultCriterionId);
    setSelectedEvidenceId(viewModel.evidence.defaultEvidenceId);
  }, [activeScenarioId, viewModel.evidence.defaultEvidenceId, viewModel.rubric.defaultCriterionId]);

  useEffect(() => {
    if (!queuedScenarioId) {
      return undefined;
    }

    setActiveScenarioId('loading');

    const timer = window.setTimeout(() => {
      setActiveScenarioId(queuedScenarioId);
      setQueuedScenarioId(null);
    }, 1100);

    return () => window.clearTimeout(timer);
  }, [queuedScenarioId]);

  const handleScenarioSelect = (scenarioId) => {
    setQueuedScenarioId(null);
    setActiveScenarioId(scenarioId);
  };

  const handlePrimaryAction = () => {
    if (viewModel.status.key === 'empty') {
      setQueuedScenarioId('processing');
      return;
    }

    if (viewModel.status.key === 'error') {
      setQueuedScenarioId('completed');
    }
  };

  const handleCriterionSelect = (criterionId) => {
    setSelectedCriterionId((current) => (current === criterionId ? null : criterionId));
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.14),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.12),_transparent_30%),linear-gradient(180deg,_#f8fbff_0%,_#eef4ff_42%,_#f8fafc_100%)] text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[36px] border border-white/70 bg-white/85 shadow-[0_30px_80px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="grid gap-8 px-6 py-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.9fr)] lg:px-8 lg:py-10">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-primary-700">
                Marking UI mock
              </div>
              <h1 className="mt-5 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                Marking Result
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
                一个完整的评分结果页：包含结果摘要、processing timeline、rubric 细项、evidence source cards，以及 loading / empty / error 状态。当前全部由 mock 数据驱动，方便下一轮真实接口直接挂接到稳定 props 上。
              </p>
              <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-600">
                <div className="rounded-full border border-white/80 bg-white/80 px-4 py-2 shadow-sm">
                  <Layers3 className="mr-2 inline h-4 w-4 text-primary-600" />
                  Summary + rubric + evidence 联动
                </div>
                <div className="rounded-full border border-white/80 bg-white/80 px-4 py-2 shadow-sm">
                  <Workflow className="mr-2 inline h-4 w-4 text-primary-600" />
                  Mock state machine for lifecycle states
                </div>
                <div className="rounded-full border border-white/80 bg-white/80 px-4 py-2 shadow-sm">
                  <Link2 className="mr-2 inline h-4 w-4 text-primary-600" />
                  Future API-ready prop contract
                </div>
              </div>
            </div>

            <div className="rounded-[32px] border border-slate-200 bg-slate-950 p-6 text-white shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Expected payload slices</div>
              <div className="mt-5 space-y-4 text-sm leading-7 text-slate-300">
                <div>
                  <div className="font-semibold text-white">summary</div>
                  <div>总分、置信度、moderation 状态、强弱项摘要。</div>
                </div>
                <div>
                  <div className="font-semibold text-white">timeline</div>
                  <div>pipeline step、状态、时间戳、持续时长。</div>
                </div>
                <div>
                  <div className="font-semibold text-white">rubric.sections[]</div>
                  <div>criterion code、awarded marks、解释文本、evidenceIds。</div>
                </div>
                <div>
                  <div className="font-semibold text-white">evidence.items[]</div>
                  <div>source kind、excerpt、location、confidence、linkedCriteria。</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-6 space-y-6">
          <MarkingScenarioSwitcher
            scenarios={SCENARIO_CATALOG}
            activeScenarioId={activeScenarioId}
            onSelectScenario={handleScenarioSelect}
          />

          <MarkingResultView
            request={viewModel.request}
            status={viewModel.status}
            summary={viewModel.summary}
            timeline={viewModel.timeline}
            rubric={viewModel.rubric}
            evidence={viewModel.evidence}
            diagnostics={viewModel.diagnostics}
            recommendations={viewModel.recommendations}
            selectedCriterionId={selectedCriterionId}
            selectedEvidenceId={selectedEvidenceId}
            onCriterionSelect={handleCriterionSelect}
            onEvidenceSelect={setSelectedEvidenceId}
            onPrimaryAction={handlePrimaryAction}
          />
        </div>
      </div>
    </div>
  );
}
