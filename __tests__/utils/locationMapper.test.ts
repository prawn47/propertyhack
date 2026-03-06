import { describe, it, expect } from 'vitest';
import { mapToKnownLocation } from '../../utils/locationMapper';

const KNOWN = ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'NSW', 'VIC', 'QLD'];

describe('mapToKnownLocation', () => {
  it('returns null when knownLocations is empty', () => {
    expect(mapToKnownLocation({ city: 'Sydney' }, [])).toBeNull();
  });

  it('maps a known Australian city to its canonical form', () => {
    expect(mapToKnownLocation({ city: 'Sydney' }, KNOWN)).toBe('Sydney');
    expect(mapToKnownLocation({ city: 'melbourne' }, KNOWN)).toBe('Melbourne');
    expect(mapToKnownLocation({ city: 'BRISBANE' }, KNOWN)).toBe('Brisbane');
  });

  it('maps full state names to abbreviations', () => {
    expect(mapToKnownLocation({ regionName: 'New South Wales' }, KNOWN)).toBe('NSW');
    expect(mapToKnownLocation({ regionName: 'Victoria' }, KNOWN)).toBe('VIC');
    expect(mapToKnownLocation({ regionName: 'Queensland' }, KNOWN)).toBe('QLD');
  });

  it('returns null for unknown locations', () => {
    expect(mapToKnownLocation({ city: 'London', country: 'UK' }, KNOWN)).toBeNull();
    expect(mapToKnownLocation({ regionName: 'Bavaria' }, KNOWN)).toBeNull();
  });

  it('returns null when no city or regionName provided', () => {
    expect(mapToKnownLocation({ country: 'Australia' }, KNOWN)).toBeNull();
  });

  it('prefers city match over region match', () => {
    expect(mapToKnownLocation({ city: 'Perth', regionName: 'Western Australia' }, KNOWN)).toBe('Perth');
  });
});
