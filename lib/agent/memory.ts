'use client';

import type { SectionId } from '@/lib/site-data';
import type { MessageRole, SessionMemory, ToolArgs, ToolName } from '@/types/agent';

const STORAGE_KEY = 'veloria.agent.memory.v1';
const MAX_TURNS = 16;
const MAX_ENTITIES = 8;

function empty(): SessionMemory {
  return { turns: [], lastSection: null, entities: [], facts: {}, pending: null };
}

/**
 * Session-scoped memory.
 *
 * Deliberately `sessionStorage`, not `localStorage`: the assistant's context
 * should die with the tab, matching the "session memory" contract we show the
 * reader in the panel footer.
 */
class AgentMemory {
  private state: SessionMemory = empty();
  private hydrated = false;

  hydrate(): SessionMemory {
    if (this.hydrated || typeof window === 'undefined') return this.state;
    this.hydrated = true;
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (raw) this.state = { ...empty(), ...(JSON.parse(raw) as Partial<SessionMemory>) };
    } catch {
      this.state = empty();
    }
    return this.state;
  }

  private persist() {
    if (typeof window === 'undefined') return;
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      /* quota or privacy mode — memory simply stays in-process */
    }
  }

  snapshot(): SessionMemory {
    return this.hydrate();
  }

  addTurn(role: MessageRole, content: string) {
    this.hydrate();
    this.state.turns.push({ role, content });
    if (this.state.turns.length > MAX_TURNS) {
      this.state.turns = this.state.turns.slice(-MAX_TURNS);
    }
    this.persist();
  }

  setLastSection(sectionId: SectionId) {
    this.hydrate();
    this.state.lastSection = sectionId;
    this.persist();
  }

  rememberEntity(name: string) {
    this.hydrate();
    const next = [name, ...this.state.entities.filter((e) => e !== name)];
    this.state.entities = next.slice(0, MAX_ENTITIES);
    this.persist();
  }

  recordFact(key: string, value: string) {
    this.hydrate();
    this.state.facts[key] = value;
    this.persist();
  }

  getFact(key: string): string | undefined {
    return this.hydrate().facts[key];
  }

  setPending(pending: { tool: ToolName; args: ToolArgs; prompt: string } | null) {
    this.hydrate();
    this.state.pending = pending;
    this.persist();
  }

  getPending() {
    return this.hydrate().pending;
  }

  /** Compact context block handed to the planner (and to the LLM route). */
  context(): string {
    const s = this.hydrate();
    const parts: string[] = [];
    if (s.lastSection) parts.push(`Reader is currently at: ${s.lastSection}.`);
    if (s.entities.length) parts.push(`Recently discussed: ${s.entities.join(', ')}.`);
    const recent = s.turns.slice(-6).map((t) => `${t.role}: ${t.content}`);
    if (recent.length) parts.push(`Recent turns:\n${recent.join('\n')}`);
    return parts.join('\n');
  }

  clear() {
    this.state = empty();
    this.hydrated = true;
    this.persist();
  }
}

export const agentMemory = new AgentMemory();
