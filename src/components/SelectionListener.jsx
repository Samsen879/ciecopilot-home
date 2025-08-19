import React, { useEffect } from 'react';
import { useAIContext } from '../context/AIContext';

export default function SelectionListener() {
  const { addContextSegment, setIsChatOpen } = useAIContext();

  useEffect(() => {
    function captureSelection() {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;
      const text = selection.toString();
      if (!text || text.trim().length < 10) return;
      const title = document.title || null;
      addContextSegment({ text, title });
      setIsChatOpen(true);
    }

    const onMouseUp = () => setTimeout(captureSelection, 0);
    const onKeyUp = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
        captureSelection();
      }
    };
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('keyup', onKeyUp);
    return () => {
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('keyup', onKeyUp);
    };
  }, [addContextSegment, setIsChatOpen]);

  return null;
}







