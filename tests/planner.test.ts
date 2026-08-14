import { describe, expect, it } from 'vitest';
import {
  extractCriteria,
  planLocally,
  resolveReference,
  sanitiseRemotePlan,
  type PlannerInput,
} from '@/lib/agent/planner';
import type { ToolName } from '@/types/agent';

const base: PlannerInput = { text: '', lastSection: null, entities: [], pending: null };
const plan = (text: string, over: Partial<PlannerInput> = {}) =>
  planLocally({ ...base, ...over, text });
const tools = (text: string, over: Partial<PlannerInput> = {}): ToolName[] =>
  plan(text, over).steps.map((s) => s.tool);

describe('reference resolution', () => {
  it('prefers an explicitly named journey over memory', () => {
    expect(resolveReference('tell me about Kyoto', ['patagonia'], null)).toMatchObject({
      slug: 'kyoto',
      viaMemory: false,
    });
  });

  it('resolves a pronoun to the most recent entity', () => {
    expect(resolveReference('how many nights is it?', ['patagonia'], null)).toMatchObject({
      slug: 'patagonia',
      viaMemory: true,
    });
  });

  it('resolves an ordinal to the right journey', () => {
    expect(resolveReference('show me the second one', [], null).slug).toBe('faroe-islands');
  });

  it('does not treat a region covering several journeys as one journey', () => {
    // India holds Goa, Mumbai, Udaipur and Kerala — "India" is a search.
    expect(resolveReference('somewhere in India', [], null).slug).toBeUndefined();
  });

  it('falls back to the last section when nothing else is known', () => {
    expect(resolveReference('tell me more about that', [], 'journal')).toMatchObject({
      section: 'journal',
      viaMemory: true,
    });
  });

  it('matches on a region that holds exactly one journey', () => {
    expect(resolveReference('what about Chile?', [], null).slug).toBe('patagonia');
  });

  it('resolves the new destinations by name', () => {
    expect(resolveReference('tell me about Goa', [], null).slug).toBe('goa');
    expect(resolveReference('how about Udaipur?', [], null).slug).toBe('udaipur');
    expect(resolveReference('what is Santorini like?', [], null).slug).toBe('santorini');
  });

  it('returns nothing for an unrelated utterance', () => {
    expect(resolveReference('hello there friend', [], null).slug).toBeUndefined();
  });
});

describe('criteria extraction', () => {
  it('reads climate', () => {
    expect(extractCriteria('somewhere cold')).toMatchObject({ climate: 'cold' });
    expect(extractCriteria('somewhere hot and sunny')).toMatchObject({ climate: 'warm' });
  });

  it('reads an upper bound exclusively', () => {
    expect(extractCriteria('under 8 nights')).toMatchObject({ maxNights: 7 });
  });

  it('reads a lower bound, treating "at least" as inclusive', () => {
    expect(extractCriteria('at least 10 nights')).toMatchObject({ minNights: 10 });
    expect(extractCriteria('more than 10 nights')).toMatchObject({ minNights: 11 });
  });

  it('maps vague length words', () => {
    expect(extractCriteria('a short trip')).toMatchObject({ maxNights: 8 });
  });

  it('reads month and theme', () => {
    expect(extractCriteria('travelling in november')).toMatchObject({ month: 'november' });
    expect(extractCriteria('somewhere with hiking')).toMatchObject({ tag: 'hiking' });
  });

  it('reads region', () => {
    expect(extractCriteria('somewhere in India')).toMatchObject({ region: 'India' });
    expect(extractCriteria('a journey in Greece')).toMatchObject({ region: 'Greece' });
  });

  it('treats "may" as a month only with a date preposition', () => {
    expect(extractCriteria('in may')).toMatchObject({ month: 'may' });
    // Otherwise it's a verb: "may" here must not become a travel month.
    expect(extractCriteria('which journey may suit me?')?.month).toBeUndefined();
  });

  it('reads superlatives', () => {
    expect(extractCriteria('which is shortest?')).toMatchObject({ extreme: 'shortest' });
  });

  it('returns null when there is nothing to constrain', () => {
    expect(extractCriteria('take me to the journal')).toBeNull();
  });
});

describe('planning', () => {
  it('does not pre-write a reply for lookups — synthesis handles it', () => {
    expect(tools('which journey is shortest?')).not.toContain('respond');
    expect(tools('tell me about Patagonia')).not.toContain('respond');
  });

  it('still uses a scripted reply where there is nothing to look up', () => {
    expect(tools('hello')).toEqual(['respond']);
    expect(tools('what can you do?')).toEqual(['respond']);
  });

  it('searches the atlas for attribute queries', () => {
    expect(tools('somewhere cold under 8 nights')).toContain('filterDestinations');
  });

  it('searches by region rather than picking one journey', () => {
    const steps = plan('show me destinations in India').steps;
    const filter = steps.find((s) => s.tool === 'filterDestinations');
    expect(filter?.args).toMatchObject({ region: 'India' });
    expect(steps.map((s) => s.tool)).not.toContain('describeDestination');
  });

  it('compares when two journeys are named', () => {
    expect(tools('compare Kyoto and Marrakech')).toContain('compareDestinations');
  });

  it('finds similar journeys', () => {
    expect(tools('what is similar to Kyoto?')).toContain('similarDestinations');
  });

  it('compares against the remembered journey when only one is named', () => {
    const steps = plan('compare it with Kyoto', { entities: ['patagonia'] }).steps;
    const compare = steps.find((s) => s.tool === 'compareDestinations');
    // Must be the pair, not a dump of the whole atlas.
    expect(compare?.args).toMatchObject({ slugs: ['kyoto', 'patagonia'] });
  });

  it('takes only the most recent entity, even with a full memory', () => {
    // After a few turns every journey is remembered; a pairwise compare must
    // still be a pair.
    const steps = plan('compare it with Kyoto', {
      entities: ['patagonia', 'marrakech', 'faroe-islands', 'kyoto'],
    }).steps;
    const compare = steps.find((s) => s.tool === 'compareDestinations');
    expect(compare?.args).toMatchObject({ slugs: ['kyoto', 'patagonia'] });
  });

  it('compares everything only when asked to', () => {
    const steps = plan('compare all the journeys').steps;
    const compare = steps.find((s) => s.tool === 'compareDestinations');
    expect((compare?.args as { slugs: string[] }).slugs).toHaveLength(4);
  });

  it('does not invent a comparison when there is nothing to compare against', () => {
    expect(tools('compare')).not.toContain('compareDestinations');
  });

  it('uses memory to answer a bare follow-up', () => {
    const steps = plan('how many nights is that?', { entities: ['patagonia'] }).steps;
    const describe = steps.find((s) => s.tool === 'describeDestination');
    expect(describe?.args).toMatchObject({ slug: 'patagonia' });
  });

  it('brings a named journey into view, not just describes it', () => {
    const t = tools('tell me about Patagonia');
    expect(t).toContain('scrollToSection');
    expect(t).toContain('highlightElement');
  });

  it('falls back when it understands nothing', () => {
    expect(tools('asdfghjkl qwerty')).toEqual(['respond']);
  });
});

describe('newsletter confirmation gate', () => {
  const withEmail = 'subscribe me with wanderer@example.com';

  it('stages the address unconfirmed and asks first', () => {
    const steps = plan(withEmail).steps;
    const subscribe = steps.find((s) => s.tool === 'subscribeNewsletter');
    expect(subscribe?.args).toMatchObject({ email: 'wanderer@example.com', confirmed: false });
    expect(steps.at(-1)?.tool).toBe('respond');
  });

  it('only confirms once the reader agrees', () => {
    const pending = {
      tool: 'subscribeNewsletter' as ToolName,
      args: { email: 'wanderer@example.com', confirmed: false },
      prompt: 'Shall I?',
    };
    const steps = plan('yes', { pending }).steps;
    expect(steps[0]?.tool).toBe('subscribeNewsletter');
    expect(steps[0]?.args).toMatchObject({ confirmed: true });
  });

  it('abandons the action on a refusal', () => {
    const pending = {
      tool: 'subscribeNewsletter' as ToolName,
      args: { email: 'wanderer@example.com', confirmed: false },
      prompt: 'Shall I?',
    };
    expect(tools('no', { pending })).toEqual(['respond']);
  });
});

describe('remote plan sanitising', () => {
  it('drops unknown tools', () => {
    const result = sanitiseRemotePlan('x', [
      { tool: 'deleteEverything', args: {} },
      { tool: 'listDestinations', args: {} },
    ]);
    expect(result?.steps.map((s) => s.tool)).toEqual(['listDestinations']);
  });

  it('drops steps aimed at unknown sections or targets', () => {
    expect(sanitiseRemotePlan('x', [{ tool: 'scrollToSection', args: { sectionId: 'evil' } }])).toBeNull();
    expect(sanitiseRemotePlan('x', [{ tool: 'highlightElement', args: { target: 'body' } }])).toBeNull();
  });

  it('never lets the model pre-confirm an outbound action', () => {
    const result = sanitiseRemotePlan('x', [
      { tool: 'subscribeNewsletter', args: { email: 'a@b.co', confirmed: true } },
    ]);
    expect(result?.steps[0]?.args).toMatchObject({ confirmed: false });
  });

  it('rejects a plan with nothing usable left', () => {
    expect(sanitiseRemotePlan('x', [{ tool: 'nope', args: {} }])).toBeNull();
    expect(sanitiseRemotePlan('x', 'not-an-array')).toBeNull();
  });
});
