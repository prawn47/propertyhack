const VALID_COUNTRIES = ['AU', 'US', 'UK', 'CA', 'NZ'];

const REGIONS = {
  AU: {
    'new south wales': 'NSW',
    'victoria': 'VIC',
    'queensland': 'QLD',
    'western australia': 'WA',
    'south australia': 'SA',
    'tasmania': 'TAS',
    'australian capital territory': 'ACT',
    'northern territory': 'NT',
  },
  US: {
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
  },
  UK: {
    'england': 'England',
    'scotland': 'Scotland',
    'wales': 'Wales',
    'northern ireland': 'Northern Ireland',
  },
  CA: {
    'ontario': 'ON',
    'british columbia': 'BC',
    'quebec': 'QC',
    'alberta': 'AB',
    'manitoba': 'MB',
  },
  NZ: {
    'auckland': 'Auckland',
    'wellington': 'Wellington',
    'canterbury': 'Canterbury',
    'waikato': 'Waikato',
    'bay of plenty': 'Bay of Plenty',
    'otago': 'Otago',
    "hawke's bay": "Hawke's Bay",
    'tasman': 'Tasman',
    'taranaki': 'Taranaki',
  },
};

function getRegionCodes(country) {
  const regions = REGIONS[country];
  if (!regions) return [];
  return Object.values(regions);
}

function isValidRegion(country, regionCode) {
  return getRegionCodes(country).includes(regionCode);
}

module.exports = { VALID_COUNTRIES, REGIONS, getRegionCodes, isValidRegion };
