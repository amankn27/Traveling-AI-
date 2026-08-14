'use client';

import { create } from 'zustand';
import { executeTurn } from '@/lib/agent/core';
import { agentMemory } from '@/lib/agent/memory';
import type {
  AgentMessage,
  AgentPhase,
  Plan,
  StepStatus,
  ToolContext,
  ToolResult,
} from '@/types/agent';

let seq = 0;
const nextId = () => `m-${Date.now().toString(36)}-${(seq++).toString(36)}`;

const WELCOME: AgentMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    'I’m the Veloria concierge. I can move you through the page, pull up any of our journeys, or find one that fits what you’re after. Where shall we begin?',
  createdAt: 0,
};

const TRANSCRIPT_KEY = 'veloria.agent.transcript.v1';
const MAX_PERSISTED = 40;

/**
 * The transcript is persisted alongside the agent's memory so a reload doesn't
 * leave the assistant "remembering" a conversation the reader can no longer see.
 */
function loadTranscript(): AgentMessage[] {
  if (typeof window === 'undefined') return [WELCOME];
  try {
    const raw = window.sessionStorage.getItem(TRANSCRIPT_KEY);
    if (!raw) return [WELCOME];
    const parsed = JSON.parse(raw) as AgentMessage[];
    if (!Array.isArray(parsed) || !parsed.length) return [WELCOME];
    // A message caught mid-stream at unload is no longer streaming.
    return parsed.map((m) => ({ ...m, streaming: false }));
  } catch {
    return [WELCOME];
  }
}

function saveTranscript(messages: AgentMessage[]) {
  if (typeof window === 'undefined') return;
  try {
    // Plans are execution state, not conversation — replaying a stale trace
    // after reload would imply work that is no longer running.
    const trimmed = messages.slice(-MAX_PERSISTED).map((m) => ({ ...m, plan: undefined }));
    window.sessionStorage.setItem(TRANSCRIPT_KEY, JSON.stringify(trimmed));
  } catch {
    /* quota or privacy mode — the transcript simply stays in memory */
  }
}

interface AgentState {
  open: boolean;
  messages: AgentMessage[];
  plan: Plan | null;
  phase: AgentPhase;
  error: string | null;
  /** Guard so a second send can't interleave with a running turn. */
  busy: boolean;

  openAgent: () => void;
  closeAgent: () => void;
  toggleAgent: () => void;
  send: (text: string, ctx: Omit<ToolContext, 'signal'>) => Promise<void>;
  abort: () => void;
  reset: () => void;
}

let controller: AbortController | null = null;

export const useAgentStore = create<AgentState>((set, get) => ({
  open: false,
  messages: loadTranscript(),
  plan: null,
  phase: 'idle',
  error: null,
  busy: false,

  openAgent: () => set({ open: true }),
  closeAgent: () => set({ open: false }),
  toggleAgent: () => set((s) => ({ open: !s.open })),

  abort: () => {
    controller?.abort();
    controller = null;
    set((s) => ({
      busy: false,
      phase: 'idle',
      messages: s.messages.map((m) => (m.streaming ? { ...m, streaming: false } : m)),
    }));
  },

  reset: () => {
    controller?.abort();
    controller = null;
    agentMemory.clear();
    saveTranscript([WELCOME]);
    set({ messages: [WELCOME], plan: null, phase: 'idle', error: null, busy: false });
  },

  send: async (text, partialCtx) => {
    const trimmed = text.trim();
    if (!trimmed || get().busy) return;

    controller?.abort();
    controller = new AbortController();
    const { signal } = controller;

    const userMessage: AgentMessage = {
      id: nextId(),
      role: 'user',
      content: trimmed,
      createdAt: Date.now(),
    };
    const assistantId = nextId();
    const assistantMessage: AgentMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      createdAt: Date.now(),
      streaming: true,
    };

    set((s) => ({
      messages: [...s.messages, userMessage, assistantMessage],
      plan: null,
      error: null,
      busy: true,
    }));

    const patchAssistant = (patch: Partial<AgentMessage>) =>
      set((s) => ({
        messages: s.messages.map((m) => (m.id === assistantId ? { ...m, ...patch } : m)),
      }));

    await executeTurn({
      text: trimmed,
      ctx: { ...partialCtx, signal },
      callbacks: {
        onPhase: (phase: AgentPhase) => set({ phase }),
        onPlan: (plan: Plan) => {
          set({ plan });
          patchAssistant({ plan });
        },
        onStep: (stepId: string, status: StepStatus, result?: ToolResult) =>
          set((s) => {
            if (!s.plan) return s;
            const plan: Plan = {
              ...s.plan,
              steps: s.plan.steps.map((st) =>
                st.id === stepId ? { ...st, status, ...(result ? { result } : {}) } : st,
              ),
            };
            return {
              plan,
              messages: s.messages.map((m) => (m.id === assistantId ? { ...m, plan } : m)),
            };
          }),
        onToken: (chunk: string) =>
          set((s) => ({
            messages: s.messages.map((m) =>
              m.id === assistantId ? { ...m, content: m.content + chunk } : m,
            ),
          })),
        onDone: (finalText: string) => {
          patchAssistant({ content: finalText, streaming: false });
          set({ busy: false, phase: 'idle' });
          saveTranscript(get().messages);
          controller = null;
        },
        onError: (message: string) => {
          patchAssistant({
            content: 'I ran into a problem carrying that out. Try rephrasing?',
            streaming: false,
          });
          set({ error: message, busy: false, phase: 'idle' });
          controller = null;
        },
      },
    });
  },
}));
