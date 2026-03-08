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

const CITIES_BY_COUNTRY: Record<string, string[]> = {
  AU: [
    'Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide',
    'Canberra', 'Hobart', 'Darwin', 'Gold Coast', 'Newcastle',
    'Wollongong', 'Sunshine Coast', 'Geelong', 'Townsville', 'Cairns',
  ],
  US: [
    'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix',
    'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose',
    'Austin', 'Jacksonville', 'Fort Worth', 'Columbus', 'Charlotte',
    'Indianapolis', 'San Francisco', 'Seattle', 'Denver', 'Nashville',
  ],
  UK: [
    'London', 'Birmingham', 'Manchester', 'Leeds', 'Glasgow',
    'Sheffield', 'Bradford', 'Edinburgh', 'Liverpool', 'Bristol',
    'Cardiff', 'Belfast', 'Leicester', 'Coventry', 'Nottingham',
  ],
  CA: [
    'Toronto', 'Montreal', 'Vancouver', 'Calgary', 'Edmonton',
    'Ottawa', 'Winnipeg', 'Quebec City', 'Hamilton', 'Kitchener',
  ],
};

const CITY_MAP: Record<string, string> = Object.fromEntries(
  Object.values(CITIES_BY_COUNTRY)
    .flat()
    .map((city) => [city.toLowerCase(), city])
);

const COUNTRY_CODE_MAP: Record<string, string> = {
  GB: 'UK',
};

export interface RawLocation {
  city?: string;
  regionName?: string;
  country?: string;
  countryCode?: string;
  lat?: number;
  lon?: number;
}

export function getCitiesForCountry(country: string): string[] | undefined {
  return CITIES_BY_COUNTRY[country];
}

export function normaliseCountryCode(code: string): string {
  return COUNTRY_CODE_MAP[code] ?? code;
}

export function mapToKnownLocation(raw: RawLocation, knownLocations: string[]): string | null {
  if (!knownLocations || knownLocations.length === 0) return null;

  const normalizedKnown = knownLocations.map((l) => l.toLowerCase());

  if (raw.city) {
    const cityLower = raw.city.toLowerCase();

    const mappedCity = CITY_MAP[cityLower];
    if (mappedCity) {
      const idx = normalizedKnown.indexOf(mappedCity.toLowerCase());
      if (idx !== -1) return knownLocations[idx];
    }

    const cityIdx = normalizedKnown.findIndex((l) => l.includes(cityLower) || cityLower.includes(l));
    if (cityIdx !== -1) return knownLocations[cityIdx];
  }

  if (raw.regionName) {
    const regionLower = raw.regionName.toLowerCase();

    const stateAbbrev = STATE_MAP[regionLower];
    if (stateAbbrev) {
      const idx = normalizedKnown.indexOf(stateAbbrev.toLowerCase());
      if (idx !== -1) return knownLocations[idx];
    }

    const regionIdx = normalizedKnown.findIndex((l) => l.includes(regionLower) || regionLower.includes(l));
    if (regionIdx !== -1) return knownLocations[regionIdx];
  }

  return null;
}
