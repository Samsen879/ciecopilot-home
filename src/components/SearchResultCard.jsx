import React, { useMemo, useState } from 'react';

const sourceMap = {
  note: { label: 'Note', color: 'bg-emerald-100 text-emerald-700' },
  paper: { label: 'Paper', color: 'bg-blue-100 text-blue-700' },
  mark: { label: 'MS', color: 'bg-purple-100 text-purple-700' },
};

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeMarkOnly(html) {
  if (!html) return '';
  // Preserve <mark> tags only, drop everything else by escaping
  const OPEN = '__MARK_OPEN__';
  const CLOSE = '__MARK_CLOSE__';
  const tmp = html.replace(/<\s*mark\s*>/gi, OPEN).replace(/<\s*\/\s*mark\s*>/gi, CLOSE);
  const escaped = escapeHtml(tmp);
  return escaped
    .replaceAll(OPEN, '<mark class="bg-yellow-200 rounded px-0.5">')
    .replaceAll(CLOSE, '</mark>');
}

function clientHighlight(text, keyword) {
  if (!keyword) return text;
  const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig');
  const parts = text.split(regex);
  return parts.map((part, idx) =>
    regex.test(part) ? (
      <mark key={idx} className="bg-yellow-200 rounded px-0.5">{part}</mark>
    ) : (
      <span key={idx}>{part}</span>
    )
  );
}

export default function SearchResultCard({ item, keyword, onJump }) {
  const source = sourceMap[item.source_type] || { label: item.source_type, color: 'bg-gray-100 text-gray-700' };
  const [expanded, setExpanded] = useState(false);

  const hasServerHighlight = typeof item.snippet === 'string' && item.snippet.toLowerCase().includes('<mark');
  const sanitizedHtml = useMemo(() => (hasServerHighlight ? sanitizeMarkOnly(item.snippet) : ''), [hasServerHighlight, item.snippet]);
  return (
    <div className="p-4 rounded-lg border border-gray-200 bg-white hover:shadow-sm transition cursor-pointer" onClick={() => onJump?.(item)}>
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${source.color}`}>{source.label}</span>
        {typeof item.page_from === 'number' && (
          <span className="text-xs text-gray-500">p.{item.page_from}{item.page_to && item.page_to !== item.page_from ? `-${item.page_to}` : ''}</span>
        )}
        {item.path && <span className="text-xs text-gray-400 truncate">{item.path}</span>}
      </div>
      <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
      {hasServerHighlight ? (
        <p className={`text-sm text-gray-700 ${expanded ? '' : 'line-clamp-2'}`} dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
      ) : (
        <p className={`text-sm text-gray-700 ${expanded ? '' : 'line-clamp-2'}`}>{clientHighlight(item.snippet || '', keyword)}</p>
      )}
      {(item.snippet && item.snippet.length > 120) && (
        <button
          type="button"
          className="mt-2 text-xs text-blue-600 hover:underline"
          onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
        >
          {expanded ? '收起' : '展开更多'}
        </button>
      )}
    </div>
  );
}