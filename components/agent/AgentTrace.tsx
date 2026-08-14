'use client';

import { Check, ChevronRight, CircleDashed, Loader2, SkipForward, X } from 'lucide-react';
import { TOOL_LABELS } from '@/lib/agent/tools';
import type { Plan, StepStatus } from '@/types/agent';

const ICONS: Record<StepStatus, React.ReactNode> = {
  pending: <CircleDashed size={12} strokeWidth={1.8} aria-hidden="true" />,
  running: <Loader2 size={12} strokeWidth={1.8} className="animate-spin" aria-hidden="true" />,
  done: <Check size={12} strokeWidth={2.2} aria-hidden="true" />,
  failed: <X size={12} strokeWidth={2.2} aria-hidden="true" />,
  skipped: <SkipForward size={12} strokeWidth={1.8} aria-hidden="true" />,
};

const COLORS: Record<StepStatus, string> = {
  pending: 'rgba(242,234,217,0.35)',
  running: '#E8C997',
  done: '#9BCFA3',
  failed: '#E08A7A',
  skipped: 'rgba(242,234,217,0.25)',
};

/**
 * The plan, rendered as it executes: one row per tool call, with live status.
 * This is the agent's reasoning made legible rather than a spinner.
 */
export function AgentTrace({ plan }: { plan: Plan }) {
  const actionable = plan.steps.filter((s) => s.tool !== 'respond');
  if (!actionable.length) return null;

  return (
    <div
      className="mt-3 rounded-xl px-3.5 py-3"
      style={{ background: 'rgba(242,234,217,0.05)', border: '1px solid rgba(242,234,217,0.08)' }}
    >
      <p className="mb-2.5 flex items-center gap-1.5 font-sans text-[9px] font-medium uppercase tracking-[0.22em] text-cream/40">
        Plan
        {plan.revision > 0 ? (
          <span className="text-gold-light">· revised {plan.revision}×</span>
        ) : null}
      </p>

      <ol className="space-y-2">
        {actionable.map((step) => (
          <li key={step.id} className="flex items-start gap-2.5">
            <span
              className="mt-[3px] flex h-4 w-4 shrink-0 items-center justify-center"
              style={{ color: COLORS[step.status] }}
            >
              {ICONS[step.status]}
            </span>
            <span className="min-w-0 flex-1">
              <span
                className="font-sans text-[11.5px] leading-snug"
                style={{
                  color: step.status === 'skipped' ? 'rgba(242,234,217,0.3)' : 'rgba(242,234,217,0.8)',
                  textDecoration: step.status === 'skipped' ? 'line-through' : undefined,
                }}
              >
                {step.title}
              </span>
              <span className="ml-1.5 font-sans text-[9px] uppercase tracking-[0.14em] text-cream/30">
                {TOOL_LABELS[step.tool]}
              </span>
              {step.status === 'failed' && step.result?.error ? (
                <span className="mt-1 flex items-center gap-1 font-sans text-[10.5px] text-[#E08A7A]">
                  <ChevronRight size={10} aria-hidden="true" />
                  {step.result.error}
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
