const STATE_MAP: Record<string, string> = {
  'new south wales': 'NSW',
  'victoria': 'VIC',
  'queensland': 'QLD',
  'western australia': 'WA',
  'south australia': 'SA',
  'tasmania': 'TAS',
  'australian capital territory': 'ACT',
  'northern territory': 'NT',
};

const CITY_MAP: Record<string, string> = {
  'sydney': 'Sydney',
  'melbourne': 'Melbourne',
  'brisbane': 'Brisbane',
  'perth': 'Perth',
  'adelaide': 'Adelaide',
  'canberra': 'Canberra',
  'hobart': 'Hobart',
  'darwin': 'Darwin',
  'gold coast': 'Gold Coast',
  'newcastle': 'Newcastle',
  'wollongong': 'Wollongong',
  'sunshine coast': 'Sunshine Coast',
  'geelong': 'Geelong',
  'townsville': 'Townsville',
  'cairns': 'Cairns',
};

export interface RawLocation {
  city?: string;
  regionName?: string;
  country?: string;
  lat?: number;
  lon?: number;
}

export function mapToKnownLocation(raw: RawLocation, knownLocations: string[]): string | null {
  if (!knownLocations || knownLocations.length === 0) return null;

  const normalizedKnown = knownLocations.map((l) => l.toLowerCase());

  if (raw.city) {
    const cityLower = raw.city.toLowerCase();

    // Try exact city match first
    const mappedCity = CITY_MAP[cityLower];
    if (mappedCity) {
      const idx = normalizedKnown.indexOf(mappedCity.toLowerCase());
      if (idx !== -1) return knownLocations[idx];
    }

    // Try partial match against known locations
    const cityIdx = normalizedKnown.findIndex((l) => l.includes(cityLower) || cityLower.includes(l));
    if (cityIdx !== -1) return knownLocations[cityIdx];
  }

  if (raw.regionName) {
    const regionLower = raw.regionName.toLowerCase();

    // Map full state name to abbreviation
    const stateAbbrev = STATE_MAP[regionLower];
    if (stateAbbrev) {
      const idx = normalizedKnown.indexOf(stateAbbrev.toLowerCase());
      if (idx !== -1) return knownLocations[idx];
    }

    // Try partial match
    const regionIdx = normalizedKnown.findIndex((l) => l.includes(regionLower) || regionLower.includes(l));
    if (regionIdx !== -1) return knownLocations[regionIdx];
  }

  return null;
}
