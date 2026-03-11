import React from 'react';
import clsx from 'clsx';
import { FileSearch, FileText, Highlighter, ScanText } from 'lucide-react';

const iconByKind = {
  answer: FileText,
  markscheme: Highlighter,
  system: ScanText,
};

const toneByKind = {
  answer: 'border-blue-200 bg-blue-50 text-blue-700',
  markscheme: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  system: 'border-violet-200 bg-violet-50 text-violet-700',
};

export default function EvidenceSourceCard({ item, isSelected, isDimmed, onClick }) {
  const Icon = iconByKind[item.kind] || FileSearch;
  const tags = Array.isArray(item.tags) ? item.tags : [];
  const linkedCriteria = Array.isArray(item.linkedCriteria) ? item.linkedCriteria : [];

  return (
    <button
      type="button"
      onClick={() => onClick?.(item.id)}
      className={clsx(
        'w-full rounded-[24px] border p-4 text-left transition duration-200',
        'focus:outline-none focus:ring-2 focus:ring-primary-200',
        isSelected
          ? 'border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-900/10'
          : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-slate-300',
        isDimmed && !isSelected && 'opacity-60',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={clsx('rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em]', isSelected ? 'border-white/15 bg-white/10 text-white' : toneByKind[item.kind])}>
              <Icon className="mr-1 inline h-3.5 w-3.5" />
              {item.kind}
            </span>
            <span className={clsx('text-xs uppercase tracking-[0.2em]', isSelected ? 'text-slate-300' : 'text-slate-500')}>
              {item.locationLabel}
            </span>
          </div>
          <h4 className={clsx('mt-3 text-base font-semibold', isSelected ? 'text-white' : 'text-slate-950')}>
            {item.title}
          </h4>
        </div>
        <div className={clsx('rounded-2xl border px-3 py-2 text-center text-xs', isSelected ? 'border-white/10 bg-white/10 text-slate-200' : 'border-slate-200 bg-slate-50 text-slate-600')}>
          <div>Confidence</div>
          <div className="mt-1 font-semibold">{item.confidencePercent == null ? 'N/A' : `${item.confidencePercent}%`}</div>
        </div>
      </div>

      <p className={clsx('mt-4 text-sm leading-7', isSelected ? 'text-slate-200' : 'text-slate-600')}>
        {item.excerpt}
      </p>

      <div className={clsx('mt-4 rounded-2xl border px-3 py-3 text-sm leading-6', isSelected ? 'border-white/10 bg-white/5 text-slate-200' : 'border-slate-100 bg-slate-50/70 text-slate-600')}>
        {item.note}
      </div>

      {tags.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className={clsx(
                'rounded-full px-2.5 py-1 text-xs font-medium',
                isSelected ? 'bg-white/10 text-slate-200' : 'bg-slate-100 text-slate-600',
              )}
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      {linkedCriteria.length > 0 ? (
        <div className={clsx('mt-4 text-xs uppercase tracking-[0.2em]', isSelected ? 'text-slate-300' : 'text-slate-500')}>
          Linked criteria: {linkedCriteria.join(', ')}
        </div>
      ) : null}
    </button>
  );
}
