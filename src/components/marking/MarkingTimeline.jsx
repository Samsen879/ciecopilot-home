import React from 'react';
import clsx from 'clsx';
import { AlertTriangle, CheckCircle2, CircleDashed, Clock3, LoaderCircle } from 'lucide-react';

const iconByState = {
  completed: CheckCircle2,
  current: LoaderCircle,
  pending: CircleDashed,
  error: AlertTriangle,
};

const toneByState = {
  completed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  current: 'border-amber-200 bg-amber-50 text-amber-700',
  pending: 'border-slate-200 bg-slate-50 text-slate-500',
  error: 'border-rose-200 bg-rose-50 text-rose-700',
};

export default function MarkingTimeline({ timeline, status }) {
  if (!timeline.items.length) {
    return null;
  }

  return (
    <section className="card card-subtle overflow-hidden border border-white/70 bg-white/90">
      <div className="card-body space-y-5 p-6 sm:p-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Pipeline timeline</p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-950">Processing states</h3>
          </div>
          <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
            {timeline.completedSteps}/{timeline.totalSteps} steps completed
          </div>
        </div>

        <div className="overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-primary-500 via-sky-500 to-cyan-500 transition-all"
            style={{ width: `${status.timelinePercent}%` }}
          />
        </div>

        <div className="space-y-4">
          {timeline.items.map((step, index) => {
            const Icon = iconByState[step.state] || Clock3;
            const isLast = index === timeline.items.length - 1;

            return (
              <div key={step.id} className="grid gap-4 md:grid-cols-[auto_1fr]">
                <div className="flex flex-col items-center">
                  <div
                    className={clsx(
                      'flex h-12 w-12 items-center justify-center rounded-2xl border shadow-sm',
                      toneByState[step.state],
                    )}
                  >
                    <Icon className={clsx('h-5 w-5', step.state === 'current' && 'animate-spin')} />
                  </div>
                  {!isLast ? <div className="mt-2 h-full min-h-10 w-px bg-slate-200" /> : null}
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-white/75 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">{step.label}</span>
                        <span className={clsx('rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em]', toneByState[step.state])}>
                          {step.state}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-7 text-slate-600">{step.detail}</p>
                    </div>
                    <div className="grid shrink-0 gap-2 text-right text-xs uppercase tracking-[0.2em] text-slate-500">
                      <div>{step.timestampLabel}</div>
                      <div>{step.durationLabel}</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

