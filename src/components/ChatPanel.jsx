import React, { useEffect, useRef, useState, useMemo } from 'react';
import { ragApi } from '../api/ragApi';
import { useAIContext } from '../context/AIContext';
import { PureMultimodalInput } from './ui/multimodal-ai-chat-input';

export default function ChatPanel() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('What is the relation between E and V?');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const controllerRef = useRef(null);
  const { contextSegments, clearContextSegments } = useAIContext();
  const [attachments, setAttachments] = useState([]);

  useEffect(() => {
    setMessages([{ role: 'assistant', content: 'Hello! Ask a question about CIE A Levels.' }]);
  }, []);

  async function send(customInput) {
    const effectiveInput = typeof customInput === 'string' ? customInput : input;
    if (!effectiveInput.trim() && attachments.length === 0) return;
    const prefix = contextSegments.length
      ? `Consider this context:\n\n${contextSegments.map((s, i) => `[#${i+1}] ${s.title ? s.title + ': ' : ''}${s.text}`).join('\n\n')}\n\n---\n`
      : '';
    const user = { role: 'user', content: prefix + effectiveInput.trim() };
    const next = [...messages, user];
    setMessages(next);
    setInput('');
    controllerRef.current?.abort?.();
    controllerRef.current = new AbortController();
    setLoading(true);
    setError('');

    try {
      const res = await ragApi.chat({ messages: next, subject_code: '9702' }, { signal: controllerRef.current.signal });
      setMessages([...next, { role: 'assistant', content: res.answer, citations: res.citations }]);
      if (contextSegments.length) clearContextSegments();
      if (attachments.length) setAttachments([]);
    } catch (e) {
      setError(String(e.message || e));
      setMessages([...next, { role: 'assistant', content: '出错了：' + (e.message || e), isError: true }]);
    } finally {
      setLoading(false);
    }
  }

  function stop() {
    controllerRef.current?.abort?.();
  }

  function copyAnswer(text) {
    const cleaned = text.replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n');
    navigator.clipboard.writeText(cleaned);
  }

  const uiMessages = useMemo(() => messages.map((m, idx) => ({ id: String(idx), content: m.content, role: m.role })), [messages]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto space-y-3 p-3 bg-gray-50 rounded">
        {messages.map((m, idx) => (
          <div key={idx} className={m.role === 'user' ? 'text-right' : 'text-left'}>
            <div className={`inline-block px-3 py-2 rounded ${m.role === 'user' ? 'bg-blue-600 text-white' : (m.isError ? 'bg-red-100 text-red-700' : 'bg-white border')}`}>
              <div className="whitespace-pre-wrap text-sm">{m.content}</div>
              {m.citations?.length ? (
                <div className="mt-2 text-xs text-gray-500 space-y-1">
                  <div>References:</div>
                  <ul className="list-disc ml-4">
                    {m.citations.map((c, i) => (
                      <li key={i}>
                        [{c.source_type}] {c.title} p.{c.page_from}{c.page_to && c.page_to !== c.page_from ? `-${c.page_to}` : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      {error && <div className="text-sm text-red-600 mt-2">{error}</div>}
      <div className="mt-3">
        <PureMultimodalInput
          chatId="ask-ai"
          messages={uiMessages}
          attachments={attachments}
          setAttachments={setAttachments}
          onSendMessage={({ input: content }) => send(content)}
          onStopGenerating={stop}
          isGenerating={loading}
          canSend={true}
          selectedVisibilityType="private"
        />
      </div>
    </div>
  );
}