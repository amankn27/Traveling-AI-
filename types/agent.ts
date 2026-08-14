import type { SectionId } from '@/lib/site-data';

/* -------------------------------------------------------------------------- */
/*  Tools                                                                     */
/* -------------------------------------------------------------------------- */

/** Every tool the agent may invoke. Adding a name here is the only way in. */
export type ToolName =
  | 'scrollToSection'
  | 'highlightElement'
  | 'navigate'
  | 'openPanel'
  | 'closePanel'
  | 'setTheme'
  | 'triggerAnimation'
  | 'readSection'
  | 'listDestinations'
  | 'describeDestination'
  | 'filterDestinations'
  | 'compareDestinations'
  | 'similarDestinations'
  | 'enterExploreMode'
  | 'subscribeNewsletter'
  | 'respond';

export interface ToolArgsMap {
  scrollToSection: { sectionId: SectionId };
  highlightElement: { target: string; durationMs?: number };
  navigate: { href: string };
  openPanel: { panel: 'menu' | 'agent' };
  closePanel: { panel: 'menu' | 'agent' };
  setTheme: { theme: 'light' | 'dark' | 'toggle' };
  triggerAnimation: { name: 'kenBurns' | 'shimmer' | 'chapterReveal' | 'statCount' };
  readSection: { sectionId: SectionId };
  listDestinations: Record<string, never>;
  describeDestination: { slug: string };
  filterDestinations: {
    region?: string;
    climate?: 'cold' | 'temperate' | 'warm';
    maxNights?: number;
    minNights?: number;
    month?: string;
    tag?: string;
    /** Pick the single shortest or longest match. */
    extreme?: 'shortest' | 'longest';
  };
  compareDestinations: { slugs: string[] };
  similarDestinations: { slug: string };
  enterExploreMode: { active: boolean };
  subscribeNewsletter: { email: string; confirmed: boolean };
  respond: { text: string };
}

export type ToolArgs<N extends ToolName = ToolName> = ToolArgsMap[N];

export interface ToolResult {
  ok: boolean;
  /** Short line shown in the trace and fed back to the observer. */
  summary: string;
  /** Structured payload for tools that return knowledge. */
  data?: unknown;
  error?: string;
}

export interface ToolDefinition<N extends ToolName = ToolName> {
  name: N;
  description: string;
  /** True when the tool changes something outside the page (needs confirmation). */
  requiresConfirmation?: boolean;
  run: (args: ToolArgsMap[N], ctx: ToolContext) => Promise<ToolResult>;
}

export interface ToolContext {
  signal: AbortSignal;
  navigate: (href: string) => void;
  pathname: string;
}

/* -------------------------------------------------------------------------- */
/*  Plan                                                                      */
/* -------------------------------------------------------------------------- */

export type StepStatus = 'pending' | 'running' | 'done' | 'failed' | 'skipped';

export interface PlanStep {
  id: string;
  /** Human-readable intent, shown in the trace before the tool fires. */
  title: string;
  tool: ToolName;
  args: ToolArgs;
  status: StepStatus;
  result?: ToolResult;
}

export interface Plan {
  id: string;
  goal: string;
  steps: PlanStep[];
  /** Incremented when the observer forces a re-plan. */
  revision: number;
}

/**
 * What a knowledge tool actually returned. The reply is synthesised from these
 * *after* execution, so the agent can say things it didn't know when it planned.
 */
export interface Observation {
  tool: ToolName;
  summary: string;
  data?: unknown;
}

/* -------------------------------------------------------------------------- */
/*  Conversation                                                              */
/* -------------------------------------------------------------------------- */

export type MessageRole = 'user' | 'assistant' | 'system';

export interface AgentMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: number;
  /** Set while the assistant message is still streaming in. */
  streaming?: boolean;
  /** The plan this message executed, if any. */
  plan?: Plan;
}

/* -------------------------------------------------------------------------- */
/*  Memory                                                                    */
/* -------------------------------------------------------------------------- */

export interface SessionMemory {
  /** Compact rolling transcript used for context. */
  turns: { role: MessageRole; content: string }[];
  /** Last section the agent moved the user to. */
  lastSection: SectionId | null;
  /** Destinations / chapters the user has referred to, most recent first. */
  entities: string[];
  /** Cached tool knowledge results, keyed `tool:argsHash`. */
  facts: Record<string, string>;
  /** Pending confirmation the agent is waiting on. */
  pending: { tool: ToolName; args: ToolArgs; prompt: string } | null;
}

export type AgentPhase = 'idle' | 'planning' | 'acting' | 'observing' | 'responding';
