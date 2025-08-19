import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ragApi } from '../api/ragApi';
import SearchResultCard from '../components/SearchResultCard';
import FiltersBar from '../components/FiltersBar';

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [subjectCode, setSubjectCode] = useState('9702');
  const [filters, setFilters] = useState({ source_type: '', lang: '' });
  const parentRef = useRef(null);
  const abortRef = useRef(null);

  const debouncedQ = useDebounce(q, 300);

  const { data, isFetching, error, refetch } = useQuery({
    queryKey: ['ragSearch', debouncedQ, subjectCode, filters],
    queryFn: async ({ signal }) => {
      abortRef.current = signal;
      const minSimParam = searchParams.get('minSim');
      const res = await ragApi.search({ q: debouncedQ, subject_code: subjectCode, min_similarity: minSimParam ? Number(minSimParam) : undefined }, { signal });
      const items = res.items?.filter((it) => !filters.source_type || it.source_type === filters.source_type)
        .filter((it) => !filters.lang || it.lang === filters.lang) || [];
      return { ...res, items };
    },
    enabled: !!debouncedQ,
    staleTime: 30 * 1000,
  });

  const rowVirtualizer = useVirtualizer({
    count: data?.items?.length || 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 96,
    overscan: 6,
  });

  useEffect(() => {
    return () => abortRef.current?.abort?.();
  }, []);

  // Sync from URL params → local state
  useEffect(() => {
    const urlQ = searchParams.get('q') || '';
    const urlSubject = searchParams.get('subject') || '9702';
    const urlLang = searchParams.get('lang') || '';
    if (urlQ !== q) setQ(urlQ);
    if (urlSubject !== subjectCode) setSubjectCode(urlSubject);
    if (urlLang !== filters.lang) setFilters((prev) => ({ ...prev, lang: urlLang }));
  }, [searchParams]);

  // Update URL when clicking search
  const applyToUrl = () => {
    const next = new URLSearchParams();
    if (q) next.set('q', q);
    if (subjectCode) next.set('subject', subjectCode);
    if (filters.lang) next.set('lang', filters.lang);
    setSearchParams(next);
  };

  const onReset = () => setFilters({ source_type: '', lang: '' });

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold mb-4">Search</h1>
      <div className="flex gap-2 mb-3">
        <input
          className="border rounded px-3 py-2 flex-1"
          placeholder="Search..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') applyToUrl();
          }}
        />
        <select
          className="border rounded px-2 py-2"
          value={subjectCode}
          onChange={(e) => setSubjectCode(e.target.value)}
          title="Subject"
        >
          <option value="9702">Physics (9702)</option>
          <option value="9709">Mathematics (9709)</option>
          <option value="9231">Further Mathematics (9231)</option>
        </select>
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded"
          onClick={() => applyToUrl()}
        >
          Search
        </button>
      </div>
      <FiltersBar filters={filters} onChange={setFilters} onReset={onReset} />

      {data?.mode === 'fulltext' && (
        <div className="mt-2 mb-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 inline-flex items-center gap-1">
          <span>已降级为全文检索</span>
        </div>
      )}

      {error && <div className="text-red-600 text-sm mb-2">{String(error.message || error)}</div>}

      <div ref={parentRef} className="h-[520px] overflow-auto border rounded">
        <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const item = data?.items?.[virtualRow.index];
            return (
              <div
                key={virtualRow.key}
                ref={rowVirtualizer.measureElement}
                data-index={virtualRow.index}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                className="p-2"
              >
                {item ? (
                  <SearchResultCard item={item} keyword={debouncedQ} onJump={(it) => console.log('jump to', it)} />
                ) : (
                  <div className="p-4">Loading...</div>
                )}
              </div>
            );
          })}
        </div>
        {isFetching && <div className="p-2 text-xs text-gray-500">Loading...</div>}
      </div>
    </div>
  );
}

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}