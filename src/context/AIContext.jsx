import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

const AIContext = createContext(null);

export function AIProvider({ children }) {
  const [contextSegments, setContextSegments] = useState([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [panelWidth, setPanelWidth] = useState(() => {
    const savedWidth = localStorage.getItem('ai-chat-panel-width');
    return savedWidth ? parseInt(savedWidth) : 380;
  });

  const addContextSegment = useCallback((segment) => {
    if (!segment || !segment.text || !segment.text.trim()) return;
    const newSeg = {
      id: Date.now() + Math.random(),
      text: segment.text.trim(),
      sourceType: segment.sourceType || null,
      title: segment.title || null,
      path: segment.path || null,
      pageFrom: segment.pageFrom || null,
      pageTo: segment.pageTo || null,
      createdAt: new Date().toISOString(),
    };
    setContextSegments((prev) => [newSeg, ...prev].slice(0, 8));
  }, []);

  const removeContextSegment = useCallback((id) => {
    setContextSegments((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const clearContextSegments = useCallback(() => {
    setContextSegments([]);
  }, []);

  const value = useMemo(() => ({
    contextSegments,
    addContextSegment,
    removeContextSegment,
    clearContextSegments,
    isChatOpen,
    setIsChatOpen,
    panelWidth,
    setPanelWidth,
  }), [contextSegments, addContextSegment, removeContextSegment, clearContextSegments, isChatOpen, panelWidth]);

  return (
    <AIContext.Provider value={value}>
      {children}
    </AIContext.Provider>
  );
}

export function useAIContext() {
  const ctx = useContext(AIContext);
  if (!ctx) throw new Error('useAIContext must be used within AIProvider');
  return ctx;
}


