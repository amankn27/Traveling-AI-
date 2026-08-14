'use client';

import type { SectionId } from '@/lib/site-data';
import type {
  AgentPhase,
  Observation,
  Plan,
  PlanStep,
  StepStatus,
  ToolArgsMap,
  ToolContext,
  ToolName,
  ToolResult,
} from '@/types/agent';
import { agentMemory } from './memory';
import { planLocally, planWithModel } from './planner';
import { isSectionId } from './registry';
import { synthesiseWithModel, templateReply } from './synthesis';
import { runTool } from './tools';

const MAX_STEPS = 6;
const MAX_REPLANS = 1;

/** Tools whose results the final reply is written from. */
const KNOWLEDGE_TOOLS: ReadonlySet<ToolName> = new Set<ToolName>([
  'readSection',
  'listDestinations',
  'describeDestination',
  'filterDestinations',
  'compareDestinations',
  'similarDestinations',
]);

export interface TurnCallbacks {
  onPhase: (phase: AgentPhase) => void;
  onPlan: (plan: Plan) => void;
  onStep: (stepId: string, status: StepStatus, result?: ToolResult) => void;
  /** Emits the assistant's prose one chunk at a time. */
  onToken: (chunk: string) => void;
  onDone: (finalText: string) => void;
  onError: (message: string) => void;
}

export interface TurnOptions {
  text: string;
  ctx: ToolContext;
  callbacks: TurnCallbacks;
  /** Set false to skip every model round-trip. */
  useModel?: boolean;
}

function reducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/** Types prose out at a readable pace (local replies only — model output already streams). */
async function stream(text: string, onToken: (c: string) => void, signal: AbortSignal) {
  if (reducedMotion()) {
    onToken(text);
    return;
  }
  const tokens = text.match(/\S+\s*|\s+/g) ?? [text];
  for (const token of tokens) {
    if (signal.aborted) return;
    onToken(token);
    await new Promise((r) => setTimeout(r, 14 + Math.random() * 22));
  }
}

/**
 * Observer: decides whether a completed step invalidates the rest of the plan.
 * A failed *knowledge* lookup is fatal (we'd be answering from nothing); a failed
 * *presentation* step is cosmetic and the plan carries on.
 */
function isFatal(step: PlanStep, result: ToolResult): boolean {
  if (result.ok) return false;
  const cosmetic: ToolName[] = [
    'highlightElement',
    'triggerAnimation',
    'setTheme',
    'openPanel',
    'closePanel',
    'scrollToSection',
  ];
  return !cosmetic.includes(step.tool);
}

export async function executeTurn({
  text,
  ctx,
  callbacks,
  useModel = true,
}: TurnOptions): Promise<void> {
  const { onPhase, onPlan, onStep, onToken, onDone, onError } = callbacks;
  const { signal } = ctx;

  agentMemory.addTurn('user', text);

  try {
    /* ---------------------------------------------------------------- */
    /*  PLAN                                                            */
    /* ---------------------------------------------------------------- */
    onPhase('planning');

    const snapshot = agentMemory.snapshot();
    const plannerInput = {
      text,
      lastSection: snapshot.lastSection,
      entities: snapshot.entities,
      pending: agentMemory.getPending(),
    };

    let plan = planLocally(plannerInput);

    if (useModel) {
      const remote = await planWithModel(plannerInput, agentMemory.context(), signal);
      if (remote) plan = remote;
    }

    if (signal.aborted) return;
    plan.steps = plan.steps.slice(0, MAX_STEPS);
    onPlan(plan);

    /* ---------------------------------------------------------------- */
    /*  ACT → OBSERVE (→ REFINE)                                        */
    /* ---------------------------------------------------------------- */
    let replans = 0;
    let cannedText = '';
    const observations: Observation[] = [];

    for (let i = 0; i < plan.steps.length; i += 1) {
      const current = plan.steps[i];
      if (!current || signal.aborted) break;

      onPhase(current.tool === 'respond' ? 'responding' : 'acting');
      onStep(current.id, 'running');

      const result = await runTool(current.tool, current.args as ToolArgsMap[ToolName], ctx);
      if (signal.aborted) return;

      onStep(current.id, result.ok ? 'done' : 'failed', result);
      current.status = result.ok ? 'done' : 'failed';
      current.result = result;

      if (result.ok) {
        /* — record what we learned ---------------------------------- */
        if (KNOWLEDGE_TOOLS.has(current.tool)) {
          observations.push({ tool: current.tool, summary: result.summary, data: result.data });
        }

        if (current.tool === 'scrollToSection') {
          const id = (current.args as ToolArgsMap['scrollToSection']).sectionId;
          if (isSectionId(id)) agentMemory.setLastSection(id as SectionId);
        }

        if (current.tool === 'describeDestination') {
          const { slug } = current.args as ToolArgsMap['describeDestination'];
          agentMemory.rememberEntity(slug);
          agentMemory.recordFact(`destination:${slug}`, result.summary);
        }

        // Anything the search surfaced is now "what we were just talking about".
        const data = result.data as Record<string, unknown> | undefined;
        const surfaced = [
          ...(((data?.matches ?? []) as { slug?: string }[]) ?? []),
          ...(((data?.comparison ?? []) as { slug?: string }[]) ?? []),
          ...(data?.closest ? [data.closest as { slug?: string }] : []),
        ];
        for (const item of surfaced.reverse()) {
          if (item?.slug) agentMemory.rememberEntity(item.slug);
        }

        if (current.tool === 'subscribeNewsletter') {
          const args = current.args as ToolArgsMap['subscribeNewsletter'];
          agentMemory.setPending(
            args.confirmed
              ? null
              : {
                  tool: 'subscribeNewsletter',
                  args,
                  prompt: 'Shall I put that address in the Quiet Letter form?',
                },
          );
        }
      }

      /* — a scripted reply (greeting, help, confirmation) ------------ */
      if (current.tool === 'respond' && result.ok) {
        cannedText = (current.args as ToolArgsMap['respond']).text;
        continue;
      }

      /* — OBSERVE: recover from a fatal failure ---------------------- */
      if (isFatal(current, result) && replans < MAX_REPLANS) {
        replans += 1;
        onPhase('observing');

        const recovery = planLocally({
          ...plannerInput,
          text: `${text} (previous attempt failed: ${result.error ?? 'unknown'})`,
          pending: null,
        });

        for (let j = i + 1; j < plan.steps.length; j += 1) {
          const s = plan.steps[j];
          if (s) s.status = 'skipped';
        }
        plan = {
          ...plan,
          steps: [...plan.steps.slice(0, i + 1), ...recovery.steps],
          revision: plan.revision + 1,
        };
        onPlan(plan);
      } else if (isFatal(current, result)) {
        const apology = `I couldn’t finish that — ${result.error ?? 'the page didn’t respond'}.`;
        await stream(apology, onToken, signal);
        agentMemory.addTurn('assistant', apology);
        onPhase('idle');
        onDone(apology);
        return;
      }
    }

    if (signal.aborted) return;

    /* ---------------------------------------------------------------- */
    /*  SYNTHESISE — write the reply from what actually came back       */
    /* ---------------------------------------------------------------- */
    onPhase('responding');
    let finalText = '';

    if (observations.length) {
      if (useModel) {
        const streamed = await synthesiseWithModel(
          text,
          observations,
          agentMemory.context(),
          signal,
          onToken,
        );
        if (streamed) finalText = streamed;
      }

      if (!finalText) {
        finalText = templateReply(observations);
        if (finalText) await stream(finalText, onToken, signal);
      }
    }

    // Scripted replies stand in when there was nothing to look up, and trail
    // synthesised prose when a plan both acted and had something to say.
    if (cannedText && !finalText) {
      finalText = cannedText;
      await stream(finalText, onToken, signal);
    } else if (cannedText && finalText) {
      await stream(`\n\n${cannedText}`, onToken, signal);
      finalText = `${finalText}\n\n${cannedText}`;
    }

    if (!finalText) {
      finalText = 'Done.';
      await stream(finalText, onToken, signal);
    }

    if (signal.aborted) return;

    agentMemory.addTurn('assistant', finalText);
    onPhase('idle');
    onDone(finalText);
  } catch (err) {
    if (signal.aborted) return;
    onPhase('idle');
    onError(err instanceof Error ? err.message : 'Something went wrong.');
  }
}
