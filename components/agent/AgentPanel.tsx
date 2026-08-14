'use client';

import { useEffect, useRef, useState } from 'react';
import type { useRouter } from 'next/navigation';
import { ArrowUp, RotateCcw, Square } from 'lucide-react';
import { useAgentStore } from '@/store/agent-store';
import { AgentTrace } from './AgentTrace';

type Router = ReturnType<typeof useRouter>;

const SUGGESTIONS = [
  'Which journey is shortest?',
  'Somewhere cold, under 8 nights',
  'What’s similar to Kyoto?',
  'Take me to the journal',
];

const PHASE_LABEL: Record<string, string> = {
  planning: 'Planning',
  acting: 'Acting',
  observing: 'Re-planning',
  responding: 'Writing',
};

export function AgentPanel({ router, pathname }: { router: Router; pathname: string }) {
  const messages = useAgentStore((s) => s.messages);
  const phase = useAgentStore((s) => s.phase);
  const busy = useAgentStore((s) => s.busy);
  const send = useAgentStore((s) => s.send);
  const abort = useAgentStore((s) => s.abort);
  const reset = useAgentStore((s) => s.reset);

  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLElement>(null);

  // Take focus on open and hand it back to whatever had it on close.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    inputRef.current?.focus();
    return () => previouslyFocused?.focus?.();
  }, []);

  // Keep Tab inside the panel while it's open.
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const focusable = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable.length) return;

      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    panel.addEventListener('keydown', onKeyDown);
    return () => panel.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const submit = (text: string) => {
    const value = text.trim();
    if (!value || busy) return;
    setDraft('');
    void send(value, { navigate: (href) => router.push(href), pathname });
  };

  const showSuggestions = messages.length <= 1 && !busy;

  return (
    <section
      ref={panelRef}
      id="agent-panel"
      role="dialog"
      aria-modal="false"
      aria-label="Veloria concierge"
      className="agent-panel-in fixed bottom-24 right-4 z-[59] flex w-[min(400px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl shadow-[0_24px_70px_rgba(13,10,7,0.45)] md:bottom-28 md:right-8"
      style={{
        maxHeight: 'min(620px, calc(100vh - 9rem))',
        backgroundColor: '#13110E',
        border: '1px solid rgba(242,234,217,0.12)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: '1px solid rgba(242,234,217,0.08)' }}
      >
        <div>
          <p className="font-display text-[19px] text-cream">Concierge</p>
          <p className="mt-0.5 flex items-center gap-1.5 font-sans text-[9.5px] font-medium uppercase tracking-[0.2em] text-cream/40">
            {busy ? (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-gold-light" />
                {PHASE_LABEL[phase] ?? 'Working'}
              </>
            ) : (
              'Session memory active'
            )}
          </p>
        </div>

        <div className="flex items-center gap-1">
          {busy ? (
            <button
              type="button"
              onClick={abort}
              aria-label="Stop"
              className="flex h-8 w-8 items-center justify-center rounded-full text-cream/60 transition-colors hover:bg-cream/10 hover:text-cream"
            >
              <Square size={13} strokeWidth={2} aria-hidden="true" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={reset}
            aria-label="Clear the conversation"
            className="flex h-8 w-8 items-center justify-center rounded-full text-cream/60 transition-colors hover:bg-cream/10 hover:text-cream"
          >
            <RotateCcw size={13} strokeWidth={1.8} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Transcript */}
      <div
        ref={scrollRef}
        role="log"
        aria-live="polite"
        aria-relevant="additions text"
        aria-busy={busy}
        aria-label="Conversation"
        className="agent-scroll flex-1 space-y-4 overflow-y-auto px-5 py-5"
      >
        {messages.map((message) => {
          const isUser = message.role === 'user';
          return (
            <div key={message.id} className={isUser ? 'flex justify-end' : ''}>
              <div className={isUser ? 'max-w-[85%]' : 'w-full'}>
                <div
                  className="rounded-2xl px-4 py-3 font-sans text-[13px] leading-relaxed"
                  style={
                    isUser
                      ? { backgroundColor: 'rgba(196,164,122,0.16)', color: '#F2EAD9' }
                      : { backgroundColor: 'rgba(242,234,217,0.045)', color: 'rgba(242,234,217,0.88)' }
                  }
                >
                  {message.content ? (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  ) : message.streaming ? (
                    <span className="flex items-center gap-1 py-1" aria-label="Thinking">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="agent-think-dot h-1.5 w-1.5 rounded-full bg-gold-light"
                          style={{ animationDelay: `${i * 0.16}s` }}
                        />
                      ))}
                    </span>
                  ) : null}

                  {message.plan ? <AgentTrace plan={message.plan} /> : null}
                </div>
              </div>
            </div>
          );
        })}

        {showSuggestions ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => submit(suggestion)}
                className="rounded-full px-3.5 py-2 font-sans text-[11.5px] text-cream/70 transition-colors hover:bg-cream/10 hover:text-cream"
                style={{ border: '1px solid rgba(242,234,217,0.16)' }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(draft);
        }}
        className="flex items-end gap-2 px-4 py-3.5"
        style={{ borderTop: '1px solid rgba(242,234,217,0.08)' }}
      >
        <label htmlFor="agent-input" className="sr-only">
          Ask the concierge
        </label>
        <textarea
          id="agent-input"
          ref={inputRef}
          rows={1}
          value={draft}
          placeholder="Ask, or tell me where to take you…"
          onChange={(e) => {
            setDraft(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = `${Math.min(e.target.scrollHeight, 110)}px`;
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit(draft);
            }
          }}
          className="max-h-[110px] flex-1 resize-none rounded-xl bg-transparent px-3.5 py-2.5 font-sans text-[13px] text-cream outline-none placeholder:text-cream/35 focus:ring-1 focus:ring-gold/40"
          style={{ border: '1px solid rgba(242,234,217,0.14)' }}
        />
        <button
          type="submit"
          disabled={!draft.trim() || busy}
          aria-label="Send"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-ink transition-opacity disabled:cursor-not-allowed disabled:opacity-35"
          style={{ backgroundColor: '#C4A47A' }}
        >
          <ArrowUp size={17} strokeWidth={2.2} aria-hidden="true" />
        </button>
      </form>
    </section>
  );
}
