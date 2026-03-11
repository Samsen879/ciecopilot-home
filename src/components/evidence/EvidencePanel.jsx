import React, { useEffect, useState } from 'react';
import clsx from 'clsx';
import { ArrowRightLeft, FolderSearch, Link2 } from 'lucide-react';
import EvidenceSourceCard from './EvidenceSourceCard';

export default function EvidencePanel({
  evidence,
  criteriaById = {},
  selectedCriterionId,
  selectedEvidenceId,
  onEvidenceSelect,
}) {
  const [mode, setMode] = useState('linked');
  const items = Array.isArray(evidence?.items) ? evidence.items : [];
  const selectedCriterion = selectedCriterionId ? criteriaById[selectedCriterionId] : null;

  useEffect(() => {
    setMode('linked');
  }, [selectedCriterionId, items.length]);

  const linkedItems = selectedCriterion
    ? items.filter((item) => (item.linkedCriteria || []).includes(selectedCriterionId))
    : items;

  const visibleItems = mode === 'linked' && selectedCriterion && linkedItems.length > 0 ? linkedItems : items;
  const activeItem = visibleItems.find((item) => item.id === selectedEvidenceId) || visibleItems[0] || null;

  if (!items.length) {
    return null;
  }

  return (
    <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
      <section className="card card-elevated overflow-hidden border border-white/70 bg-white/90">
        <div className="card-body space-y-5 p-6">
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Evidence panel</p>
              <h3 className="mt-2 text-2xl font-semibold text-slate-950">Source cards</h3>
            </div>
            <p className="text-sm leading-7 text-slate-600">
              右侧面板保留稳定的 `evidence.items[]` 结构。选中 rubric criterion 后，优先展示相关 source cards；切回全部视图可以查看整条证据链。
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setMode('linked')}
              className={clsx(
                'rounded-full border px-4 py-2 text-sm font-medium transition',
                mode === 'linked'
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
              )}
            >
              <Link2 className="mr-2 inline h-4 w-4" />
              仅看关联 evidence
            </button>
            <button
              type="button"
              onClick={() => setMode('all')}
              className={clsx(
                'rounded-full border px-4 py-2 text-sm font-medium transition',
                mode === 'all'
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
              )}
            >
              <ArrowRightLeft className="mr-2 inline h-4 w-4" />
              查看全部 evidence
            </button>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-slate-950 p-5 text-white shadow-lg shadow-slate-900/10">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Current context</div>
            {selectedCriterion ? (
              <>
                <div className="mt-4 inline-flex rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-200">
                  {selectedCriterion.code}
                </div>
                <h4 className="mt-4 text-lg font-semibold text-white">{selectedCriterion.descriptor}</h4>
                <p className="mt-3 text-sm leading-7 text-slate-300">{selectedCriterion.explanation}</p>
              </>
            ) : (
              <div className="mt-4 flex items-start gap-3 text-sm leading-7 text-slate-300">
                <FolderSearch className="mt-1 h-4 w-4 shrink-0" />
                <span>还没有选中某个 criterion，当前展示整组 evidence。点击左侧 rubric 条目后，这里会自动高亮相关 source cards。</span>
              </div>
            )}
          </div>

          {activeItem ? (
            <div className="rounded-[28px] border border-slate-200 bg-white/75 p-5 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Selected source</div>
              <div className="mt-3 text-lg font-semibold text-slate-950">{activeItem.title}</div>
              <div className="mt-2 text-sm text-slate-500">{activeItem.sourceLabel}</div>
              <p className="mt-4 text-sm leading-7 text-slate-600">{activeItem.excerpt}</p>
            </div>
          ) : null}
        </div>
      </section>

      <div className="space-y-3">
        {visibleItems.map((item) => {
          const isLinked = !selectedCriterion || (item.linkedCriteria || []).includes(selectedCriterionId);

          return (
            <EvidenceSourceCard
              key={item.id}
              item={item}
              isSelected={activeItem?.id === item.id}
              isDimmed={selectedCriterion && !isLinked}
              onClick={onEvidenceSelect}
            />
          );
        })}
      </div>
    </aside>
  );
}
