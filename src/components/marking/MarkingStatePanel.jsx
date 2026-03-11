import React from 'react';
import clsx from 'clsx';
import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  FileQuestion,
  Inbox,
  LoaderCircle,
  RefreshCcw,
} from 'lucide-react';

const iconByStatus = {
  loading: CircleDashed,
  processing: LoaderCircle,
  completed: CheckCircle2,
  empty: Inbox,
  error: AlertTriangle,
};

const actionCopyByStatus = {
  empty: '加载一条 demo run',
  error: '重试 mock 流程',
};

export default function MarkingStatePanel({ status, request, diagnostics, onPrimaryAction }) {
  const Icon = iconByStatus[status.key] || FileQuestion;
  const warnings = diagnostics?.warnings || [];
  const hasAction = Boolean(onPrimaryAction && actionCopyByStatus[status.key]);

  return (
    <section className={clsx('card card-elevated overflow-hidden border bg-white/90', status.panelClassName)}>
      <div className="card-body p-6 sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-current/10 bg-white/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em]">
              <Icon className={clsx('h-4 w-4', status.key === 'processing' && 'animate-spin', status.key === 'loading' && 'animate-spin')} />
              {status.label}
            </div>
            <h3 className="mt-4 text-2xl font-semibold text-slate-950">{status.headline}</h3>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-700">{status.description}</p>

            {request ? (
              <div className="mt-5 flex flex-wrap gap-2 text-xs text-slate-600">
                <span className="rounded-full bg-white/70 px-3 py-1">{request.subjectCode}</span>
                <span className="rounded-full bg-white/70 px-3 py-1">{request.paperName}</span>
                <span className="rounded-full bg-white/70 px-3 py-1">{request.questionLabel}</span>
                <span className="rounded-full bg-white/70 px-3 py-1">{request.candidateLabel}</span>
              </div>
            ) : null}
          </div>

          {hasAction ? (
            <button
              type="button"
              onClick={onPrimaryAction}
              className="btn btn-primary btn-md shrink-0 self-start"
            >
              <RefreshCcw className="h-4 w-4" />
              {actionCopyByStatus[status.key]}
            </button>
          ) : null}
        </div>

        {status.key === 'loading' ? (
          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {[0, 1, 2].map((index) => (
              <div key={index} className="rounded-3xl border border-white/70 bg-white/70 p-5">
                <div className="skeleton h-5 w-28" />
                <div className="mt-4 space-y-3">
                  <div className="skeleton skeleton-text" />
                  <div className="skeleton skeleton-text" />
                  <div className="skeleton skeleton-text w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {status.key === 'empty' ? (
          <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white/70 p-6 text-sm leading-7 text-slate-600">
            这个视图在真实接口联调后可以接「最近一次评分任务」或「指定 submissionId 查询结果」。当前 mock 里保留空态，确保页面在无数据时不会坍塌。
          </div>
        ) : null}

        {status.key === 'error' ? (
          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            <div className="rounded-3xl border border-white/70 bg-white/75 p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Error code</div>
              <div className="mt-3 font-mono text-sm text-slate-800">{diagnostics?.errorCode || 'UNKNOWN_ERROR'}</div>
              <p className="mt-3 text-sm leading-7 text-slate-600">{diagnostics?.errorMessage || '未返回详细错误信息。'}</p>
            </div>
            <div className="rounded-3xl border border-white/70 bg-white/75 p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Run diagnostics</div>
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                <div>Run ID: {diagnostics?.runId || 'N/A'}</div>
                <div>Model: {diagnostics?.modelVersion || 'N/A'}</div>
                <div>Retryable: {diagnostics?.retryable ? 'Yes' : 'No'}</div>
                <div>Fallback used: {diagnostics?.fallbackUsed ? 'Yes' : 'No'}</div>
              </div>
            </div>
          </div>
        ) : null}

        {warnings.length > 0 ? (
          <div className="mt-6 rounded-3xl border border-white/70 bg-white/70 p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Warnings</div>
            <div className="mt-3 space-y-2 text-sm leading-7 text-slate-700">
              {warnings.map((warning) => (
                <div key={warning} className="flex gap-3">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                  <span>{warning}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
