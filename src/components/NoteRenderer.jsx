import React, { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { useAIContext } from '../context/AIContext';

export default function NoteRenderer({ content }) {
  const containerRef = useRef(null);
  const { addContextSegment, setIsChatOpen } = useAIContext();

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const onDblClick = (e) => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;
      const text = selection.toString();
      if (!text || text.trim().length < 10) return;
      addContextSegment({ text, title: document.title || 'Notes' });
      setIsChatOpen(true);
    };
    node.addEventListener('dblclick', onDblClick);
    return () => node.removeEventListener('dblclick', onDblClick);
  }, [addContextSegment, setIsChatOpen]);

  return (
    <div ref={containerRef} className="prose max-w-none">
      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}