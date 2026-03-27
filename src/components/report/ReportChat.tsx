'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const STARTER_QUESTIONS = [
  "What's the cheapest way to validate this idea?",
  "Who is my biggest competitor and why?",
  "What would you change about the GTM plan?",
  "What's the single biggest risk I should address first?",
  "How should I price my product based on the data?",
  "Is this idea worth pursuing or should I pivot?",
];

export function ReportChat({ reportId }: { reportId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isStreaming) return;

    const userMsg: ChatMessage = { role: 'user', content: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsStreaming(true);

    // Add empty assistant message for streaming
    const assistantMsg: ChatMessage = { role: 'assistant', content: '' };
    setMessages(prev => [...prev, assistantMsg]);

    try {
      const res = await fetch(`/api/report/${reportId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          history: messages.slice(-10),
        }),
      });

      if (!res.ok) throw new Error('Chat request failed');

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No stream reader');

      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '));

        for (const line of lines) {
          const data = line.slice(6);
          if (data === '[DONE]') break;

          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              fullContent += parsed.content;
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: 'assistant',
                  content: fullContent,
                };
                return updated;
              });
            }
          } catch {
            // Skip malformed chunks
          }
        }
      }
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
        };
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-accent text-bg flex items-center justify-center shadow-[0_4px_24px_rgba(200,242,100,0.25)] hover:shadow-[0_8px_32px_rgba(200,242,100,0.35)] transition-all hover:scale-105 no-print"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z" />
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[420px] h-[600px] bg-surface border border-border rounded-2xl shadow-[0_8px_48px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden no-print">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-surface-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-sm">💬</div>
          <div>
            <h3 className="text-[13px] font-medium text-text">Report Analyst</h3>
            <p className="text-[10px] text-muted font-mono">AI-powered Q&A on your report</p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="w-7 h-7 rounded-md hover:bg-surface-3 flex items-center justify-center text-muted hover:text-text transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-[12px] text-muted text-center mb-4">
              Ask anything about your intelligence report
            </p>
            <div className="grid grid-cols-1 gap-2">
              {STARTER_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(q)}
                  className="text-left text-[12px] text-muted-2 bg-surface-2 border border-border rounded-xl px-3.5 py-2.5 hover:border-accent/30 hover:text-text transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              'max-w-[90%] rounded-2xl px-4 py-3 text-[13px] leading-relaxed',
              msg.role === 'user'
                ? 'ml-auto bg-accent/10 text-text border border-accent/20'
                : 'mr-auto bg-surface-2 text-text border border-border'
            )}
          >
            {msg.role === 'assistant' ? (
              <div className="whitespace-pre-wrap">
                {msg.content || (
                  <span className="inline-flex items-center gap-1 text-muted">
                    <span className="animate-pulse">●</span>
                    <span className="animate-pulse" style={{ animationDelay: '0.2s' }}>●</span>
                    <span className="animate-pulse" style={{ animationDelay: '0.4s' }}>●</span>
                  </span>
                )}
              </div>
            ) : (
              msg.content
            )}
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border bg-surface-2">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
            placeholder={isStreaming ? 'Analyzing...' : 'Ask about your report...'}
            disabled={isStreaming}
            className="flex-1 bg-surface border border-border-accent rounded-xl py-2.5 px-3.5 text-[13px] text-text outline-none placeholder:text-muted focus:border-accent/40 transition-colors disabled:opacity-50"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={isStreaming || !input.trim()}
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0',
              input.trim() && !isStreaming
                ? 'bg-accent text-bg hover:shadow-[0_4px_16px_rgba(200,242,100,0.2)]'
                : 'bg-surface-3 text-muted cursor-not-allowed'
            )}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m22 2-7 20-4-9-9-4z" />
              <path d="m22 2-11 11" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
