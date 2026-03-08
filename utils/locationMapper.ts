const AU_STATE_MAP: Record<string, string> = {
  'new south wales': 'NSW',
  'victoria': 'VIC',
  'queensland': 'QLD',
  'western australia': 'WA',
  'south australia': 'SA',
  'tasmania': 'TAS',
  'australian capital territory': 'ACT',
  'northern territory': 'NT',
};

export interface CityEntry {
  display: string;
  region: string;
  slug: string;
}

export type CityMap = Record<string, CityEntry>;

const AU_CITIES: CityMap = {
  'sydney': { display: 'Sydney', region: 'NSW', slug: 'sydney' },
  'melbourne': { display: 'Melbourne', region: 'VIC', slug: 'melbourne' },
  'brisbane': { display: 'Brisbane', region: 'QLD', slug: 'brisbane' },
  'perth': { display: 'Perth', region: 'WA', slug: 'perth' },
  'adelaide': { display: 'Adelaide', region: 'SA', slug: 'adelaide' },
  'canberra': { display: 'Canberra', region: 'ACT', slug: 'canberra' },
  'hobart': { display: 'Hobart', region: 'TAS', slug: 'hobart' },
  'darwin': { display: 'Darwin', region: 'NT', slug: 'darwin' },
  'gold coast': { display: 'Gold Coast', region: 'QLD', slug: 'gold-coast' },
  'newcastle': { display: 'Newcastle', region: 'NSW', slug: 'newcastle' },
  'wollongong': { display: 'Wollongong', region: 'NSW', slug: 'wollongong' },
  'sunshine coast': { display: 'Sunshine Coast', region: 'QLD', slug: 'sunshine-coast' },
  'geelong': { display: 'Geelong', region: 'VIC', slug: 'geelong' },
  'townsville': { display: 'Townsville', region: 'QLD', slug: 'townsville' },
  'cairns': { display: 'Cairns', region: 'QLD', slug: 'cairns' },
};

const US_CITIES: CityMap = {
  'new york': { display: 'New York', region: 'NY', slug: 'new-york' },
  'los angeles': { display: 'Los Angeles', region: 'CA', slug: 'los-angeles' },
  'chicago': { display: 'Chicago', region: 'IL', slug: 'chicago' },
  'houston': { display: 'Houston', region: 'TX', slug: 'houston' },
  'phoenix': { display: 'Phoenix', region: 'AZ', slug: 'phoenix' },
  'philadelphia': { display: 'Philadelphia', region: 'PA', slug: 'philadelphia' },
  'san antonio': { display: 'San Antonio', region: 'TX', slug: 'san-antonio' },
  'san diego': { display: 'San Diego', region: 'CA', slug: 'san-diego' },
  'dallas': { display: 'Dallas', region: 'TX', slug: 'dallas' },
  'san francisco': { display: 'San Francisco', region: 'CA', slug: 'san-francisco' },
  'austin': { display: 'Austin', region: 'TX', slug: 'austin' },
  'seattle': { display: 'Seattle', region: 'WA', slug: 'seattle' },
  'denver': { display: 'Denver', region: 'CO', slug: 'denver' },
  'boston': { display: 'Boston', region: 'MA', slug: 'boston' },
  'miami': { display: 'Miami', region: 'FL', slug: 'miami' },
  'atlanta': { display: 'Atlanta', region: 'GA', slug: 'atlanta' },
  'minneapolis': { display: 'Minneapolis', region: 'MN', slug: 'minneapolis' },
  'portland': { display: 'Portland', region: 'OR', slug: 'portland' },
  'las vegas': { display: 'Las Vegas', region: 'NV', slug: 'las-vegas' },
  'nashville': { display: 'Nashville', region: 'TN', slug: 'nashville' },
};

const UK_CITIES: CityMap = {
  'london': { display: 'London', region: 'England', slug: 'london' },
  'manchester': { display: 'Manchester', region: 'England', slug: 'manchester' },
  'birmingham': { display: 'Birmingham', region: 'England', slug: 'birmingham' },
  'leeds': { display: 'Leeds', region: 'England', slug: 'leeds' },
  'glasgow': { display: 'Glasgow', region: 'Scotland', slug: 'glasgow' },
  'liverpool': { display: 'Liverpool', region: 'England', slug: 'liverpool' },
  'edinburgh': { display: 'Edinburgh', region: 'Scotland', slug: 'edinburgh' },
  'bristol': { display: 'Bristol', region: 'England', slug: 'bristol' },
  'sheffield': { display: 'Sheffield', region: 'England', slug: 'sheffield' },
  'nottingham': { display: 'Nottingham', region: 'England', slug: 'nottingham' },
  'cardiff': { display: 'Cardiff', region: 'Wales', slug: 'cardiff' },
  'leicester': { display: 'Leicester', region: 'England', slug: 'leicester' },
  'coventry': { display: 'Coventry', region: 'England', slug: 'coventry' },
  'cambridge': { display: 'Cambridge', region: 'England', slug: 'cambridge' },
  'oxford': { display: 'Oxford', region: 'England', slug: 'oxford' },
};

const CA_CITIES: CityMap = {
  'toronto': { display: 'Toronto', region: 'ON', slug: 'toronto' },
  'vancouver': { display: 'Vancouver', region: 'BC', slug: 'vancouver' },
  'montreal': { display: 'Montreal', region: 'QC', slug: 'montreal' },
  'calgary': { display: 'Calgary', region: 'AB', slug: 'calgary' },
  'edmonton': { display: 'Edmonton', region: 'AB', slug: 'edmonton' },
  'ottawa': { display: 'Ottawa', region: 'ON', slug: 'ottawa' },
  'winnipeg': { display: 'Winnipeg', region: 'MB', slug: 'winnipeg' },
  'quebec city': { display: 'Quebec City', region: 'QC', slug: 'quebec-city' },
  'hamilton': { display: 'Hamilton', region: 'ON', slug: 'hamilton' },
  'kitchener': { display: 'Kitchener', region: 'ON', slug: 'kitchener' },
};

const ALL_CITIES: Record<string, CityMap> = {
  AU: AU_CITIES,
  US: US_CITIES,
  UK: UK_CITIES,
  CA: CA_CITIES,
};

export function getCitiesForCountry(country: string): CityEntry[] {
  const map = ALL_CITIES[country.toUpperCase()] || AU_CITIES;
  return Object.values(map);
}

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

  const countryCode = raw.country ? raw.country.toUpperCase() : 'AU';
  const cityMap = ALL_CITIES[countryCode] || AU_CITIES;

  if (raw.city) {
    const cityLower = raw.city.toLowerCase();

    const entry = cityMap[cityLower];
    if (entry) {
      const idx = normalizedKnown.indexOf(entry.display.toLowerCase());
      if (idx !== -1) return knownLocations[idx];
    }

    const cityIdx = normalizedKnown.findIndex((l) => l.includes(cityLower) || cityLower.includes(l));
    if (cityIdx !== -1) return knownLocations[cityIdx];
  }

  if (raw.regionName) {
    const regionLower = raw.regionName.toLowerCase();

    const stateAbbrev = AU_STATE_MAP[regionLower];
    if (stateAbbrev) {
      const idx = normalizedKnown.indexOf(stateAbbrev.toLowerCase());
      if (idx !== -1) return knownLocations[idx];
    }

    const regionIdx = normalizedKnown.findIndex((l) => l.includes(regionLower) || regionLower.includes(l));
    if (regionIdx !== -1) return knownLocations[regionIdx];
  }

  return null;
}
