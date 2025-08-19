import React, { useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import { useAIContext } from '../context/AIContext';

// Configure worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export default function PDFViewer({ file, page = 1, onLoadSuccess }) {
  const [numPages, setNumPages] = useState(null);
  const [loading, setLoading] = useState(true);
  const { addContextSegment, setIsChatOpen } = useAIContext();

  function handleLoadSuccess({ numPages }) {
    setNumPages(numPages);
    setLoading(false);
    onLoadSuccess?.({ numPages });
  }

  useEffect(() => {
    setLoading(true);
  }, [file]);

  useEffect(() => {
    // Capture text selection from PDF text layer
    const root = document;
    const onMouseUp = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;
      const text = selection.toString();
      if (!text || text.trim().length < 10) return;
      addContextSegment({ text, title: typeof file === 'string' ? file.split('/').pop() : 'PDF' });
      setIsChatOpen(true);
    };
    root.addEventListener('mouseup', onMouseUp);
    return () => root.removeEventListener('mouseup', onMouseUp);
  }, [addContextSegment, setIsChatOpen, file]);

  return (
    <div className="w-full">
      {loading && <div className="h-40 bg-gray-100 animate-pulse rounded" />}
      <Document file={file} onLoadSuccess={handleLoadSuccess} loading={null}>
        <Page pageNumber={Math.max(1, page)} width={800} loading={null} renderTextLayer renderAnnotationLayer />
      </Document>
      {numPages && (
        <div className="text-xs text-gray-500 mt-2">Page {page} / {numPages}</div>
      )}
    </div>
  );
}