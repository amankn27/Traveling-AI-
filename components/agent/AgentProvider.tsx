'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sparkles, X } from 'lucide-react';
import { useAgentStore } from '@/store/agent-store';
import { AgentPanel } from './AgentPanel';

/**
 * Mounts the concierge: a floating launcher plus the expandable panel.
 *
 * Lives in the root layout so the agent survives client-side route changes and
 * can navigate between pages mid-plan.
 */
export function AgentProvider() {
  const open = useAgentStore((s) => s.open);
  const toggleAgent = useAgentStore((s) => s.toggleAgent);
  const closeAgent = useAgentStore((s) => s.closeAgent);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && useAgentStore.getState().open) {
        closeAgent();
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        toggleAgent();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closeAgent, toggleAgent]);

  return (
    <>
      <button
        type="button"
        onClick={toggleAgent}
        aria-expanded={open}
        aria-controls="agent-panel"
        aria-label={open ? 'Close the concierge' : 'Ask the concierge'}
        className="group fixed bottom-6 right-6 z-[60] flex h-14 w-14 items-center justify-center rounded-full text-ink shadow-[0_10px_40px_rgba(26,22,18,0.35)] transition-transform duration-300 hover:scale-105 focus-visible:scale-105 md:bottom-8 md:right-8"
        style={{ backgroundColor: '#C4A47A' }}
      >
        {open ? (
          <X size={20} strokeWidth={1.6} aria-hidden="true" />
        ) : (
          <Sparkles size={20} strokeWidth={1.6} aria-hidden="true" />
        )}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-full mr-3 hidden whitespace-nowrap rounded-full bg-espresso/95 px-3.5 py-2 font-sans text-[10px] font-medium uppercase tracking-[0.18em] text-cream opacity-0 transition-opacity duration-300 group-hover:opacity-100 md:block"
        >
          Concierge
        </span>
      </button>

      {open ? <AgentPanel router={router} pathname={pathname} /> : null}
    </>
  );
}
