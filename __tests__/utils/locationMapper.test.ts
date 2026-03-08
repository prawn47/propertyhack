import { describe, it, expect } from 'vitest';
import { mapToKnownLocation, getCitiesForCountry, normaliseCountryCode } from '../../utils/locationMapper';

const AU_KNOWN = ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'NSW', 'VIC', 'QLD'];
const US_KNOWN = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose', 'Austin', 'Jacksonville', 'Fort Worth', 'Columbus', 'Charlotte', 'Indianapolis', 'San Francisco', 'Seattle', 'Denver', 'Nashville'];
const UK_KNOWN = ['London', 'Birmingham', 'Manchester', 'Leeds', 'Glasgow', 'Sheffield', 'Bradford', 'Edinburgh', 'Liverpool', 'Bristol', 'Cardiff', 'Belfast', 'Leicester', 'Coventry', 'Nottingham'];
const CA_KNOWN = ['Toronto', 'Montreal', 'Vancouver', 'Calgary', 'Edmonton', 'Ottawa', 'Winnipeg', 'Quebec City', 'Hamilton', 'Kitchener'];

describe('getCitiesForCountry', () => {
  it('returns 15 AU cities', () => {
    const cities = getCitiesForCountry('AU');
    expect(cities).toBeDefined();
    expect(cities!.length).toBe(15);
    expect(cities).toContain('Sydney');
    expect(cities).toContain('Melbourne');
    expect(cities).toContain('Gold Coast');
  });

  it('returns 20 US cities', () => {
    const cities = getCitiesForCountry('US');
    expect(cities).toBeDefined();
    expect(cities!.length).toBe(20);
    expect(cities).toContain('New York');
    expect(cities).toContain('Los Angeles');
    expect(cities).toContain('Chicago');
  });

  it('returns 15 UK cities', () => {
    const cities = getCitiesForCountry('UK');
    expect(cities).toBeDefined();
    expect(cities!.length).toBe(15);
    expect(cities).toContain('London');
    expect(cities).toContain('Manchester');
    expect(cities).toContain('Edinburgh');
  });

  it('returns 10 CA cities', () => {
    const cities = getCitiesForCountry('CA');
    expect(cities).toBeDefined();
    expect(cities!.length).toBe(10);
    expect(cities).toContain('Toronto');
    expect(cities).toContain('Vancouver');
    expect(cities).toContain('Montreal');
  });

  it('returns undefined for unknown country code', () => {
    expect(getCitiesForCountry('XX')).toBeUndefined();
    expect(getCitiesForCountry('')).toBeUndefined();
    expect(getCitiesForCountry('ZZ')).toBeUndefined();
  });
});

describe('normaliseCountryCode', () => {
  it('maps GB to UK', () => {
    expect(normaliseCountryCode('GB')).toBe('UK');
  });

  it('returns other codes unchanged', () => {
    expect(normaliseCountryCode('AU')).toBe('AU');
    expect(normaliseCountryCode('US')).toBe('US');
    expect(normaliseCountryCode('CA')).toBe('CA');
    expect(normaliseCountryCode('FR')).toBe('FR');
  });
});

describe('mapToKnownLocation — AU cities', () => {
  it('returns null when knownLocations is empty', () => {
    expect(mapToKnownLocation({ city: 'Sydney' }, [])).toBeNull();
  });

  it('maps known AU cities', () => {
    expect(mapToKnownLocation({ city: 'Sydney' }, AU_KNOWN)).toBe('Sydney');
    expect(mapToKnownLocation({ city: 'melbourne' }, AU_KNOWN)).toBe('Melbourne');
    expect(mapToKnownLocation({ city: 'BRISBANE' }, AU_KNOWN)).toBe('Brisbane');
  });

  it('maps full AU state names to abbreviations', () => {
    expect(mapToKnownLocation({ regionName: 'New South Wales' }, AU_KNOWN)).toBe('NSW');
    expect(mapToKnownLocation({ regionName: 'Victoria' }, AU_KNOWN)).toBe('VIC');
    expect(mapToKnownLocation({ regionName: 'Queensland' }, AU_KNOWN)).toBe('QLD');
  });

  it('prefers city match over region match', () => {
    expect(mapToKnownLocation({ city: 'Perth', regionName: 'Western Australia' }, AU_KNOWN)).toBe('Perth');
  });
});

describe('mapToKnownLocation — US cities', () => {
  it('maps known US cities', () => {
    expect(mapToKnownLocation({ city: 'New York', countryCode: 'US' }, US_KNOWN)).toBe('New York');
    expect(mapToKnownLocation({ city: 'chicago', countryCode: 'US' }, US_KNOWN)).toBe('Chicago');
    expect(mapToKnownLocation({ city: 'San Francisco', countryCode: 'US' }, US_KNOWN)).toBe('San Francisco');
  });

  it('matches US city case-insensitively', () => {
    expect(mapToKnownLocation({ city: 'LOS ANGELES' }, US_KNOWN)).toBe('Los Angeles');
    expect(mapToKnownLocation({ city: 'houston' }, US_KNOWN)).toBe('Houston');
  });
});

describe('mapToKnownLocation — UK cities', () => {
  it('maps known UK cities', () => {
    expect(mapToKnownLocation({ city: 'London', countryCode: 'GB' }, UK_KNOWN)).toBe('London');
    expect(mapToKnownLocation({ city: 'manchester', countryCode: 'GB' }, UK_KNOWN)).toBe('Manchester');
    expect(mapToKnownLocation({ city: 'Edinburgh', countryCode: 'GB' }, UK_KNOWN)).toBe('Edinburgh');
  });

  it('matches UK city case-insensitively', () => {
    expect(mapToKnownLocation({ city: 'BIRMINGHAM' }, UK_KNOWN)).toBe('Birmingham');
  });
});

describe('mapToKnownLocation — CA cities', () => {
  it('maps known CA cities', () => {
    expect(mapToKnownLocation({ city: 'Toronto', countryCode: 'CA' }, CA_KNOWN)).toBe('Toronto');
    expect(mapToKnownLocation({ city: 'Vancouver', countryCode: 'CA' }, CA_KNOWN)).toBe('Vancouver');
    expect(mapToKnownLocation({ city: 'calgary', countryCode: 'CA' }, CA_KNOWN)).toBe('Calgary');
  });
});

describe('mapToKnownLocation — unknown cities', () => {
  it('returns null for unknown city', () => {
    expect(mapToKnownLocation({ city: 'Atlantis' }, AU_KNOWN)).toBeNull();
    expect(mapToKnownLocation({ city: 'Gotham' }, US_KNOWN)).toBeNull();
  });

  it('returns null when no city or regionName provided', () => {
    expect(mapToKnownLocation({ country: 'Australia' }, AU_KNOWN)).toBeNull();
    expect(mapToKnownLocation({ countryCode: 'US' }, US_KNOWN)).toBeNull();
  });

  it('returns null for city from different country list', () => {
    expect(mapToKnownLocation({ city: 'London' }, AU_KNOWN)).toBeNull();
    expect(mapToKnownLocation({ city: 'Sydney' }, UK_KNOWN)).toBeNull();
  });
});

describe('mapToKnownLocation — ip-api response format', () => {
  it('handles ip-api AU response', () => {
    const ipApiResponse = { city: 'Sydney', regionName: 'New South Wales', country: 'Australia', countryCode: 'AU', lat: -33.87, lon: 151.21 };
    expect(mapToKnownLocation(ipApiResponse, AU_KNOWN)).toBe('Sydney');
  });

  it('handles ip-api US response', () => {
    const ipApiResponse = { city: 'Seattle', regionName: 'Washington', country: 'United States', countryCode: 'US', lat: 47.61, lon: -122.33 };
    expect(mapToKnownLocation(ipApiResponse, US_KNOWN)).toBe('Seattle');
  });

  it('handles ip-api GB response (UK normalisation)', () => {
    const rawCountryCode = 'GB';
    const normalisedCode = normaliseCountryCode(rawCountryCode);
    expect(normalisedCode).toBe('UK');

    const ipApiResponse = { city: 'London', regionName: 'England', country: 'United Kingdom', countryCode: 'GB', lat: 51.51, lon: -0.13 };
    const cities = getCitiesForCountry(normalisedCode)!;
    expect(mapToKnownLocation(ipApiResponse, cities)).toBe('London');
  });

  it('handles ip-api CA response', () => {
    const ipApiResponse = { city: 'Toronto', regionName: 'Ontario', country: 'Canada', countryCode: 'CA', lat: 43.7, lon: -79.42 };
    expect(mapToKnownLocation(ipApiResponse, CA_KNOWN)).toBe('Toronto');
  });
});
