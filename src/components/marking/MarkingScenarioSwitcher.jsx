import React from 'react';
import clsx from 'clsx';
import { CheckCircle2, CircleDashed, AlertTriangle, LoaderCircle, Inbox } from 'lucide-react';

const iconByStatus = {
  completed: CheckCircle2,
  processing: LoaderCircle,
  loading: CircleDashed,
  empty: Inbox,
  error: AlertTriangle,
};

const toneByStatus = {
  completed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  processing: 'border-amber-200 bg-amber-50 text-amber-700',
  loading: 'border-sky-200 bg-sky-50 text-sky-700',
  empty: 'border-slate-200 bg-slate-50 text-slate-700',
  error: 'border-rose-200 bg-rose-50 text-rose-700',
};

export default function MarkingScenarioSwitcher({ scenarios, activeScenarioId, onSelectScenario }) {
  return (
    <section className="card card-subtle border-white/70 bg-white/85 backdrop-blur">
      <div className="card-body space-y-4 p-5 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Demo states</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-950">Marking lifecycle sandbox</h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-slate-600">
            用 mock 会话切换 `completed / processing / loading / empty / error`，验证页面状态映射和组件 props 是否稳定。
          </p>
        </div>

        <div className="grid gap-3 lg:grid-cols-5">
          {scenarios.map((scenario) => {
            const Icon = iconByStatus[scenario.status] || CircleDashed;
            const isActive = scenario.id === activeScenarioId;

            return (
              <button
                key={scenario.id}
                type="button"
                onClick={() => onSelectScenario?.(scenario.id)}
                className={clsx(
                  'rounded-3xl border px-4 py-4 text-left transition duration-200',
                  'focus:outline-none focus:ring-2 focus:ring-primary-200',
                  isActive
                    ? 'border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-900/10'
                    : 'border-slate-200 bg-white/70 text-slate-900 hover:-translate-y-0.5 hover:border-slate-300',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div
                      className={clsx(
                        'inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.22em]',
                        isActive ? 'border-white/20 bg-white/10 text-white' : toneByStatus[scenario.status],
                      )}
                    >
                      <Icon className={clsx('h-3.5 w-3.5', scenario.status === 'processing' && 'animate-spin')} />
                      {scenario.label}
                    </div>
                    <div className="mt-4 text-base font-semibold">{scenario.id}</div>
                  </div>
                  <span
                    className={clsx(
                      'mt-1 h-2.5 w-2.5 rounded-full',
                      isActive ? 'bg-white' : 'bg-slate-300',
                    )}
                  />
                </div>
                <p className={clsx('mt-3 text-sm leading-6', isActive ? 'text-slate-200' : 'text-slate-600')}>
                  {scenario.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
