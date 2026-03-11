import React from 'react';
import clsx from 'clsx';
import { CheckCircle2, CircleDashed, MinusCircle, Target } from 'lucide-react';

const toneByCriterionState = {
  awarded: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  partial: 'border-amber-200 bg-amber-50 text-amber-700',
  pending: 'border-slate-200 bg-slate-50 text-slate-500',
  missed: 'border-rose-200 bg-rose-50 text-rose-700',
};

const iconByCriterionState = {
  awarded: CheckCircle2,
  partial: Target,
  pending: CircleDashed,
  missed: MinusCircle,
};

const toneByVerdict = {
  secure: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  'mostly-secure': 'border-sky-200 bg-sky-50 text-sky-700',
  'needs-review': 'border-amber-200 bg-amber-50 text-amber-700',
  'in-review': 'border-amber-200 bg-amber-50 text-amber-700',
  pending: 'border-slate-200 bg-slate-50 text-slate-600',
};

export default function MarkingRubricPanel({ rubric, selectedCriterionId, onCriterionSelect }) {
  if (!rubric.sections.length) {
    return null;
  }

  return (
    <section className="card card-subtle overflow-hidden border border-white/70 bg-white/90">
      <div className="card-body space-y-6 p-6 sm:p-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Rubric breakdown</p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-950">Awarded marks by criterion</h3>
          </div>
          <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
            {rubric.awardedMarks}/{rubric.totalMarks} total marks
          </div>
        </div>

        <div className="space-y-5">
          {rubric.sections.map((section) => (
            <div key={section.id} className="rounded-[28px] border border-slate-200 bg-white/75 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h4 className="text-lg font-semibold text-slate-950">{section.title}</h4>
                    <span className={clsx('rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em]', toneByVerdict[section.verdict] || toneByVerdict.pending)}>
                      {section.verdict}
                    </span>
                  </div>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">{section.summary}</p>
                </div>
                <div className="min-w-[120px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center">
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Section marks</div>
                  <div className="mt-2 text-2xl font-semibold text-slate-950">{section.marksLabel}</div>
                  <div className="mt-2 text-sm text-slate-500">{section.percent || 0}%</div>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {section.criteria.map((criterion) => {
                  const Icon = iconByCriterionState[criterion.state] || CircleDashed;
                  const isActive = criterion.id === selectedCriterionId;

                  return (
                    <button
                      key={criterion.id}
                      type="button"
                      onClick={() => onCriterionSelect?.(criterion.id)}
                      className={clsx(
                        'w-full rounded-[22px] border p-4 text-left transition duration-200',
                        'focus:outline-none focus:ring-2 focus:ring-primary-200',
                        isActive
                          ? 'border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-900/10'
                          : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-slate-300',
                      )}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-3">
                            <span className={clsx('rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em]', isActive ? 'border-white/15 bg-white/10 text-white' : toneByCriterionState[criterion.state])}>
                              <Icon className={clsx('mr-1 inline h-3.5 w-3.5', criterion.state === 'pending' && 'animate-spin')} />
                              {criterion.code}
                            </span>
                            <span className={clsx('text-sm font-semibold', isActive ? 'text-white' : 'text-slate-900')}>
                              {criterion.descriptor}
                            </span>
                          </div>
                          <p className={clsx('mt-3 text-sm leading-7', isActive ? 'text-slate-200' : 'text-slate-600')}>
                            {criterion.explanation}
                          </p>
                          {(criterion.evidenceIds || []).length > 0 ? (
                            <div className={clsx('mt-3 text-xs uppercase tracking-[0.22em]', isActive ? 'text-slate-300' : 'text-slate-500')}>
                              Linked evidence: {criterion.evidenceIds.length}
                            </div>
                          ) : null}
                        </div>
                        <div className="shrink-0 rounded-2xl border border-current/10 bg-black/0 px-4 py-3 text-center lg:min-w-[92px]">
                          <div className={clsx('text-xs font-semibold uppercase tracking-[0.22em]', isActive ? 'text-slate-300' : 'text-slate-500')}>
                            Marks
                          </div>
                          <div className={clsx('mt-2 text-xl font-semibold', isActive ? 'text-white' : 'text-slate-950')}>
                            {criterion.marksLabel}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
