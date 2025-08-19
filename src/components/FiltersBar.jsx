import React from 'react';

export default function FiltersBar({ filters, onChange, onReset }) {
  return (
    <div className="flex flex-wrap gap-2 items-center mb-3">
      <select
        className="border rounded px-2 py-1 text-sm"
        value={filters.source_type || ''}
        onChange={(e) => onChange({ ...filters, source_type: e.target.value || null })}
      >
        <option value="">All sources</option>
        <option value="note">Note</option>
        <option value="paper">Paper</option>
        <option value="mark">Mark Scheme</option>
      </select>
      <select
        className="border rounded px-2 py-1 text-sm"
        value={filters.lang || ''}
        onChange={(e) => onChange({ ...filters, lang: e.target.value || '' })}
      >
        <option value="">Any lang</option>
        <option value="en">English</option>
        <option value="zh">中文</option>
      </select>
      <button className="text-xs text-blue-600 hover:underline" onClick={onReset}>Clear</button>
    </div>
  );
}