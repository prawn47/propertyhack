export interface CityEntry {
  display: string;
  region: string;
  slug: string;
}

export type CityMap = Record<string, CityEntry>;

export interface MappedLocation {
  city: string;
  region: string;
  country: string;
  slug: string;
}

export interface RawLocation {
  city?: string;
  regionName?: string;
  country?: string;
  countryCode?: string;
  lat?: number;
  lon?: number;
}

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

const US_STATE_MAP: Record<string, string> = {
  'new york': 'NY',
  'california': 'CA',
  'illinois': 'IL',
  'texas': 'TX',
  'arizona': 'AZ',
  'pennsylvania': 'PA',
  'washington': 'WA',
  'colorado': 'CO',
  'florida': 'FL',
  'georgia': 'GA',
  'massachusetts': 'MA',
  'tennessee': 'TN',
  'oregon': 'OR',
  'minnesota': 'MN',
  'michigan': 'MI',
};

const UK_REGION_MAP: Record<string, string> = {
  'england': 'England',
  'scotland': 'Scotland',
  'wales': 'Wales',
  'northern ireland': 'Northern Ireland',
};

const CA_PROVINCE_MAP: Record<string, string> = {
  'ontario': 'ON',
  'british columbia': 'BC',
  'quebec': 'QC',
  'alberta': 'AB',
  'manitoba': 'MB',
};

const NZ_REGION_MAP: Record<string, string> = {
  'auckland': 'Auckland',
  'wellington': 'Wellington',
  'canterbury': 'Canterbury',
  'waikato': 'Waikato',
  'bay of plenty': 'Bay of Plenty',
  'otago': 'Otago',
  "hawke's bay": "Hawke's Bay",
  'tasman': 'Tasman',
  'taranaki': 'Taranaki',
};

export const STATE_MAP = AU_STATE_MAP;

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
  'seattle': { display: 'Seattle', region: 'WA', slug: 'seattle' },
  'denver': { display: 'Denver', region: 'CO', slug: 'denver' },
  'miami': { display: 'Miami', region: 'FL', slug: 'miami' },
  'atlanta': { display: 'Atlanta', region: 'GA', slug: 'atlanta' },
  'boston': { display: 'Boston', region: 'MA', slug: 'boston' },
  'austin': { display: 'Austin', region: 'TX', slug: 'austin' },
  'nashville': { display: 'Nashville', region: 'TN', slug: 'nashville' },
  'portland': { display: 'Portland', region: 'OR', slug: 'portland' },
  'minneapolis': { display: 'Minneapolis', region: 'MN', slug: 'minneapolis' },
  'detroit': { display: 'Detroit', region: 'MI', slug: 'detroit' },
};

const UK_CITIES: CityMap = {
  'london': { display: 'London', region: 'England', slug: 'london' },
  'manchester': { display: 'Manchester', region: 'England', slug: 'manchester' },
  'birmingham': { display: 'Birmingham', region: 'England', slug: 'birmingham' },
  'leeds': { display: 'Leeds', region: 'England', slug: 'leeds' },
  'glasgow': { display: 'Glasgow', region: 'Scotland', slug: 'glasgow' },
  'edinburgh': { display: 'Edinburgh', region: 'Scotland', slug: 'edinburgh' },
  'bristol': { display: 'Bristol', region: 'England', slug: 'bristol' },
  'liverpool': { display: 'Liverpool', region: 'England', slug: 'liverpool' },
  'newcastle upon tyne': { display: 'Newcastle', region: 'England', slug: 'newcastle' },
  'sheffield': { display: 'Sheffield', region: 'England', slug: 'sheffield' },
  'cardiff': { display: 'Cardiff', region: 'Wales', slug: 'cardiff' },
  'belfast': { display: 'Belfast', region: 'Northern Ireland', slug: 'belfast' },
  'nottingham': { display: 'Nottingham', region: 'England', slug: 'nottingham' },
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
  'victoria': { display: 'Victoria', region: 'BC', slug: 'victoria' },
};

const NZ_CITIES: CityMap = {
  'auckland': { display: 'Auckland', region: 'Auckland', slug: 'auckland' },
  'wellington': { display: 'Wellington', region: 'Wellington', slug: 'wellington' },
  'christchurch': { display: 'Christchurch', region: 'Canterbury', slug: 'christchurch' },
  'hamilton': { display: 'Hamilton', region: 'Waikato', slug: 'hamilton' },
  'tauranga': { display: 'Tauranga', region: 'Bay of Plenty', slug: 'tauranga' },
  'dunedin': { display: 'Dunedin', region: 'Otago', slug: 'dunedin' },
  'queenstown': { display: 'Queenstown', region: 'Otago', slug: 'queenstown' },
  'napier': { display: 'Napier', region: "Hawke's Bay", slug: 'napier' },
  'nelson': { display: 'Nelson', region: 'Tasman', slug: 'nelson' },
  'new plymouth': { display: 'New Plymouth', region: 'Taranaki', slug: 'new-plymouth' },
};

export const ALL_CITIES: Record<string, CityMap> = {
  AU: AU_CITIES,
  US: US_CITIES,
  UK: UK_CITIES,
  CA: CA_CITIES,
  NZ: NZ_CITIES,
};

const COUNTRY_CODE_MAP: Record<string, string> = {
  AU: 'AU',
  US: 'US',
  GB: 'UK',
  UK: 'UK',
  CA: 'CA',
  NZ: 'NZ',
};

export function getCitiesForCountry(country: string): CityMap {
  const normalised = COUNTRY_CODE_MAP[country.toUpperCase()] ?? country.toUpperCase();
  return ALL_CITIES[normalised] ?? {};
}

export function mapToKnownLocation(raw: RawLocation): MappedLocation | null {
  const rawCountryCode = (raw.countryCode ?? raw.country ?? '').toUpperCase();
  const countryKey = COUNTRY_CODE_MAP[rawCountryCode];

  if (!countryKey) return null;

  const cityMap = ALL_CITIES[countryKey];
  if (!cityMap) return null;

  if (raw.city) {
    const cityLower = raw.city.toLowerCase();
    const entry = cityMap[cityLower];
    if (entry) {
      return { city: entry.display, region: entry.region, country: countryKey, slug: entry.slug };
    }

    // Try partial match
    for (const [key, entry] of Object.entries(cityMap)) {
      if (key.includes(cityLower) || cityLower.includes(key)) {
        return { city: entry.display, region: entry.region, country: countryKey, slug: entry.slug };
      }
    }
  }

  if (raw.regionName && countryKey === 'AU') {
    const regionLower = raw.regionName.toLowerCase();
    const stateAbbrev = AU_STATE_MAP[regionLower];
    if (stateAbbrev) {
      for (const entry of Object.values(AU_CITIES)) {
        if (entry.region === stateAbbrev) {
          return { city: entry.display, region: entry.region, country: countryKey, slug: entry.slug };
        }
      }
    }
  }

  if (raw.regionName && countryKey === 'US') {
    const regionLower = raw.regionName.toLowerCase();
    const stateAbbrev = US_STATE_MAP[regionLower] ?? raw.regionName.toUpperCase();
    for (const entry of Object.values(US_CITIES)) {
      if (entry.region === stateAbbrev) {
        return { city: entry.display, region: entry.region, country: countryKey, slug: entry.slug };
      }
    }
  }

  if (raw.regionName && countryKey === 'UK') {
    const regionLower = raw.regionName.toLowerCase();
    const regionName = UK_REGION_MAP[regionLower];
    if (regionName) {
      for (const entry of Object.values(UK_CITIES)) {
        if (entry.region === regionName) {
          return { city: entry.display, region: entry.region, country: countryKey, slug: entry.slug };
        }
      }
    }
  }

  if (raw.regionName && countryKey === 'CA') {
    const regionLower = raw.regionName.toLowerCase();
    const provinceAbbrev = CA_PROVINCE_MAP[regionLower] ?? raw.regionName.toUpperCase();
    for (const entry of Object.values(CA_CITIES)) {
      if (entry.region === provinceAbbrev) {
        return { city: entry.display, region: entry.region, country: countryKey, slug: entry.slug };
      }
    }
  }

  if (raw.regionName && countryKey === 'NZ') {
    const regionLower = raw.regionName.toLowerCase();
    const regionName = NZ_REGION_MAP[regionLower];
    if (regionName) {
      for (const entry of Object.values(NZ_CITIES)) {
        if (entry.region === regionName) {
          return { city: entry.display, region: entry.region, country: countryKey, slug: entry.slug };
        }
      }
    }
  }

  return null;
}
