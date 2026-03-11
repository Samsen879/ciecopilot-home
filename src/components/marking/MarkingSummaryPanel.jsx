import React from 'react';
import clsx from 'clsx';
import { Clock3, ShieldCheck, Sparkles, Target } from 'lucide-react';

const moderationCopy = {
  stable: 'Stable result',
  provisional: 'Provisional result',
  unknown: 'Pending moderation',
};

export default function MarkingSummaryPanel({ request, status, summary, recommendations, diagnostics }) {
  const warnings = diagnostics?.warnings || [];
  const contractIssues = diagnostics?.contractValidation?.issues || [];
  const strengths = summary?.strengths || [];
  const focusAreas = summary?.focusAreas || [];

  return (
    <section className="relative card card-elevated overflow-hidden border border-white/70 bg-white/90 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
      <div className={clsx('absolute inset-x-0 top-0 h-32 bg-gradient-to-r', status.accentClassName)} />
      <div className="card-body relative space-y-6 p-6 sm:p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              <span className={clsx('rounded-full border px-3 py-1', status.badgeClassName)}>{status.label}</span>
              <span>{request?.subjectName}</span>
              <span>{request?.paperName}</span>
              <span>{request?.questionLabel}</span>
            </div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              {summary.headline}
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
              为后续真实接口接入保留 `summary / timeline / rubric / evidence` 四段稳定 props。本页现在完全由 mock 驱动，但已经支持 criterion 与 source card 联动。
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-xs text-slate-600">
              {request?.candidateLabel ? <span className="rounded-full bg-white/70 px-3 py-1">{request.candidateLabel}</span> : null}
              {summary?.runDurationLabel ? <span className="rounded-full bg-white/70 px-3 py-1">Run time: {summary.runDurationLabel}</span> : null}
              {summary?.confidenceLabel ? <span className="rounded-full bg-white/70 px-3 py-1">{summary.confidenceLabel}</span> : null}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-sm xl:min-w-[260px]">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Awarded marks</div>
            <div className="mt-4 flex items-end gap-3">
              <div className="text-5xl font-semibold tracking-tight text-slate-950">{summary.awardedMarks}</div>
              <div className="pb-2 text-lg text-slate-400">/ {summary.totalMarks || '--'}</div>
            </div>
            <div className="mt-4 h-2 rounded-full bg-slate-100">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-primary-500 to-sky-500 transition-all"
                style={{ width: `${summary.scorePercent || 0}%` }}
              />
            </div>
            <div className="mt-4 space-y-2 text-sm text-slate-600">
              <div className="flex items-center justify-between">
                <span>Score percent</span>
                <span className="font-medium text-slate-900">{summary.scorePercent || 0}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Confidence</span>
                <span className="font-medium text-slate-900">{summary.confidencePercent == null ? 'Pending' : `${summary.confidencePercent}%`}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Moderation</span>
                <span className="font-medium text-slate-900">{moderationCopy[summary.moderationState] || moderationCopy.unknown}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summary.metrics.map((metric) => {
            const Icon =
              metric.id === 'score'
                ? Target
                : metric.id === 'confidence'
                  ? ShieldCheck
                  : metric.id === 'pipeline'
                    ? Clock3
                    : Sparkles;

            return (
              <div key={metric.id} className="rounded-[24px] border border-slate-200 bg-white/75 p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{metric.label}</div>
                  <Icon className="h-4 w-4 text-slate-400" />
                </div>
                <div className="mt-4 text-2xl font-semibold text-slate-950">{metric.value}</div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{metric.helper}</p>
              </div>
            );
          })}
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(280px,0.9fr)]">
          <div className="rounded-[28px] border border-slate-200 bg-white/75 p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Strengths</div>
            <div className="mt-4 space-y-3 text-sm leading-7 text-slate-700">
              {strengths.length > 0 ? (
                strengths.map((item) => (
                  <div key={item} className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span>{item}</span>
                  </div>
                ))
              ) : (
                <div>等待评分完成后展示。</div>
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white/75 p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Focus areas</div>
            <div className="mt-4 space-y-3 text-sm leading-7 text-slate-700">
              {focusAreas.length > 0 ? (
                focusAreas.map((item) => (
                  <div key={item} className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-amber-500" />
                    <span>{item}</span>
                  </div>
                ))
              ) : (
                <div>当前无额外关注项。</div>
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-slate-950 p-5 text-white shadow-lg shadow-slate-900/10">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Interface hooks</div>
            <p className="mt-4 text-sm leading-7 text-slate-200">
              {recommendations?.coachNote || '这里可挂接 teacher note、moderation note 或 API diagnostics。'}
            </p>
            <div className="mt-5 space-y-3 text-sm leading-7 text-slate-300">
              {(recommendations?.nextActions || []).slice(0, 3).map((item) => (
                <div key={item} className="flex gap-3">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-sky-400" />
                  <span>{item}</span>
                </div>
              ))}
              {warnings.length > 0 ? <div className="border-t border-white/10 pt-3 text-slate-400">Warnings: {warnings.length}</div> : null}
              {contractIssues.length > 0 ? <div className="text-slate-500">Contract issues: {contractIssues.length}</div> : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
