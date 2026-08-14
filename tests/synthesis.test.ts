import { describe, expect, it } from 'vitest';
import { templateReply } from '@/lib/agent/synthesis';
import type { Observation } from '@/types/agent';

const kyoto = {
  slug: 'kyoto',
  name: 'Kyoto',
  region: 'Japan',
  nights: 9,
  season: 'Late Autumn',
  climate: 'temperate',
  blurb: 'Hidden machiya stays.',
  tags: ['culture', 'food'],
};

const faroe = {
  slug: 'faroe-islands',
  name: 'Faroe Islands',
  region: 'North Atlantic',
  nights: 7,
  season: 'Summer Solstice',
  climate: 'cold',
  blurb: 'Cliffside cabins.',
  tags: ['hiking', 'food'],
};

const obs = (tool: Observation['tool'], data: unknown): Observation[] => [
  { tool, summary: '', data },
];

describe('templateReply', () => {
  it('answers a superlative with the actual winner', () => {
    const text = templateReply(
      obs('filterDestinations', { matches: [faroe], criteria: { extreme: 'shortest' } }),
    );
    expect(text).toContain('shortest');
    expect(text).toContain('Faroe Islands');
    expect(text).toContain('7 nights');
  });

  it('says plainly when nothing matched', () => {
    const text = templateReply(
      obs('filterDestinations', { matches: [], criteria: { climate: 'warm', maxNights: 3 } }),
    );
    expect(text).toMatch(/nothing in the atlas matches/i);
  });

  it('lists several matches', () => {
    const text = templateReply(
      obs('filterDestinations', { matches: [kyoto, faroe], criteria: { climate: 'cold' } }),
    );
    expect(text).toContain('2 journeys fit');
    expect(text).toContain('Kyoto');
    expect(text).toContain('Faroe Islands');
  });

  it('uses singular grammar for a single night', () => {
    const text = templateReply(
      obs('filterDestinations', { matches: [{ ...faroe, nights: 1 }], criteria: {} }),
    );
    expect(text).toContain('1 night');
    expect(text).not.toContain('1 nights');
  });

  it('renders a comparison of both journeys', () => {
    const text = templateReply(obs('compareDestinations', { comparison: [kyoto, faroe] }));
    expect(text).toContain('Kyoto and Faroe Islands');
    expect(text).toContain('Cliffside cabins.');
  });

  it('uses commas for three or more, not repeated "and"', () => {
    const third = { ...kyoto, slug: 'marrakech', name: 'Marrakech' };
    const text = templateReply(obs('compareDestinations', { comparison: [kyoto, faroe, third] }));
    expect(text).toContain('Kyoto, Faroe Islands and Marrakech');
    expect(text).not.toContain('and Faroe Islands and');
  });

  it('explains why a similar journey is similar', () => {
    const text = templateReply(
      obs('similarDestinations', { seed: kyoto, closest: faroe, sharedTags: ['food'], sameClimate: false }),
    );
    expect(text).toContain('Faroe Islands');
    expect(text).toContain('food');
  });

  it('describes a single journey', () => {
    const text = templateReply(obs('describeDestination', kyoto));
    expect(text).toContain('Kyoto — Japan, 9 nights');
  });

  it('reads a section back', () => {
    const text = templateReply(
      obs('readSection', { label: 'The Journal', synopsis: 'Three chapters.' }),
    );
    expect(text).toBe('The Journal: Three chapters.');
  });

  it('joins multiple observations', () => {
    const text = templateReply([
      { tool: 'describeDestination', summary: '', data: kyoto },
      { tool: 'readSection', summary: '', data: { label: 'The Journal', synopsis: 'Three chapters.' } },
    ]);
    expect(text).toContain('Kyoto');
    expect(text).toContain('The Journal');
  });

  it('returns empty string when there is nothing to say', () => {
    expect(templateReply([])).toBe('');
    expect(templateReply(obs('describeDestination', null))).toBe('');
  });
});
