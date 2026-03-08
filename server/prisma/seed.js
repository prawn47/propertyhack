const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding PropertyHack database...');

  const passwordHash = await bcrypt.hash('changeme123!', 12);
  await prisma.user.upsert({
    where: { email: 'admin@propertyhack.com' },
    update: {},
    create: {
      email: 'admin@propertyhack.com',
      passwordHash,
      displayName: 'Admin',
      superAdmin: true,
    },
  });
  console.log('Created admin user: admin@propertyhack.com');

  const markets = [
    { code: 'AU', name: 'Australia', currency: 'AUD', flagEmoji: '🇦🇺' },
    { code: 'US', name: 'United States', currency: 'USD', flagEmoji: '🇺🇸' },
    { code: 'UK', name: 'United Kingdom', currency: 'GBP', flagEmoji: '🇬🇧' },
    { code: 'CA', name: 'Canada', currency: 'CAD', flagEmoji: '🇨🇦' },
    { code: 'NZ', name: 'New Zealand', currency: 'NZD', flagEmoji: '🇳🇿' },
  ];

  for (const m of markets) {
    await prisma.market.upsert({
      where: { code: m.code },
      update: { flagEmoji: m.flagEmoji },
      create: { ...m, isActive: true },
    });
  }
  console.log('Created markets: AU, US, UK, CA, NZ');

  const baseCategories = [
    { name: 'Property Market', baseSlug: 'property-market', description: 'Overall property market trends and analysis' },
    { name: 'Residential', baseSlug: 'residential', description: 'Residential property news and sales' },
    { name: 'Commercial', baseSlug: 'commercial', description: 'Commercial property and development news' },
    { name: 'Investment', baseSlug: 'investment', description: 'Property investment strategies and tips' },
    { name: 'Development', baseSlug: 'development', description: 'New developments and construction news' },
    { name: 'Policy', baseSlug: 'policy', description: 'Government policy and regulatory changes' },
    { name: 'Finance', baseSlug: 'finance', description: 'Interest rates, mortgages and property finance' },
  ];

  const categoryMarkets = ['AU', 'US', 'UK', 'CA', 'NZ'];

  for (const market of categoryMarkets) {
    for (const cat of baseCategories) {
      const slug = market === 'AU' ? cat.baseSlug : `${cat.baseSlug}-${market.toLowerCase()}`;
      await prisma.articleCategory.upsert({
        where: { slug },
        update: {},
        create: { name: cat.name, slug, description: cat.description, market, isActive: true },
      });
    }
  }
  console.log('Created 35 article categories (7 per market: AU, US, UK, CA, NZ)');

  await prisma.ingestionSource.upsert({
    where: { id: 'seed-domain-rss' },
    update: {},
    create: {
      id: 'seed-domain-rss',
      name: 'Domain.com.au RSS',
      type: 'RSS',
      config: { feedUrl: 'https://www.domain.com.au/rss/news', maxItems: 50 },
      market: 'AU',
      category: 'property-market',
      schedule: '0 */30 * * * *',
      isActive: true,
    },
  });
  console.log('Created sample RSS source: Domain.com.au');

  // Backfill AU LocationSeo records with explicit country field
  await prisma.locationSeo.updateMany({
    where: { country: 'AU' },
    data: { country: 'AU' },
  });
  console.log('Backfilled AU LocationSeo records with country: AU');

  // US city LocationSeo records (US English)
  const usLocations = [
    {
      location: 'New York', slug: 'new-york', country: 'US',
      metaTitle: 'Property News New York, US | PropertyHack',
      metaDescription: 'Get the latest New York property news, home prices, and real estate market analysis. Stay informed with agenda-free coverage of the NYC housing market from PropertyHack.',
      h1Title: 'New York Property News',
      introContent: 'New York City remains one of the world\'s most dynamic real estate markets, with demand spanning luxury condos in Manhattan, townhouses in Brooklyn, and family homes in the outer boroughs. The NYC housing market is shaped by tight inventory, high mortgage rates, and a resilient rental sector. PropertyHack tracks the latest price movements, zoning changes, and neighborhood trends across all five boroughs. Whether you\'re buying, renting, or investing, stay ahead with the most current New York property market news.',
    },
    {
      location: 'Los Angeles', slug: 'los-angeles', country: 'US',
      metaTitle: 'Property News Los Angeles, US | PropertyHack',
      metaDescription: 'Follow the latest Los Angeles property news, home prices, and real estate market trends. From Hollywood Hills to the San Fernando Valley, PropertyHack covers it all.',
      h1Title: 'Los Angeles Property News',
      introContent: 'Los Angeles is one of the largest and most diverse real estate markets in the United States, encompassing everything from beachfront properties in Malibu to affordable starter homes in the Inland Empire. The LA housing market is influenced by tech industry growth, entertainment sector employment, and ongoing population shifts. PropertyHack delivers up-to-date coverage of home prices, new developments, and neighborhood trends across Greater Los Angeles. Stay informed on the market forces shaping California\'s property landscape.',
    },
    {
      location: 'Chicago', slug: 'chicago', country: 'US',
      metaTitle: 'Property News Chicago, US | PropertyHack',
      metaDescription: 'The latest Chicago property news, home prices, and real estate market updates. Covering neighborhoods from Lincoln Park to the South Side with PropertyHack.',
      h1Title: 'Chicago Property News',
      introContent: 'Chicago offers one of the most affordable large-city real estate markets in the United States, with diverse housing options ranging from lakefront condos to classic two-flats in historic neighborhoods. The Chicago housing market reflects the city\'s economic mix of finance, healthcare, and manufacturing industries. PropertyHack covers the latest price trends, development projects, and investment opportunities across Chicagoland. From the North Shore suburbs to the city\'s revitalizing South Side, track every shift in the Chicago property market.',
    },
    {
      location: 'Houston', slug: 'houston', country: 'US',
      metaTitle: 'Property News Houston, US | PropertyHack',
      metaDescription: 'Latest Houston property news, home prices, and Texas real estate market analysis. Stay updated on the Houston housing market with PropertyHack.',
      h1Title: 'Houston Property News',
      introContent: 'Houston\'s property market is one of the most active in the Sun Belt, driven by strong population growth, a booming energy sector, and no state income tax. The city\'s lack of traditional zoning laws creates a uniquely dynamic real estate environment with rapid development across all price points. PropertyHack tracks home prices, new construction, and neighborhood trends across Harris County and the Greater Houston area. Stay current with the market news that matters to Houston homebuyers and investors.',
    },
    {
      location: 'Phoenix', slug: 'phoenix', country: 'US',
      metaTitle: 'Property News Phoenix, US | PropertyHack',
      metaDescription: 'Follow Phoenix property news, home prices, and Arizona real estate market trends. PropertyHack covers the Greater Phoenix housing market from Scottsdale to Mesa.',
      h1Title: 'Phoenix Property News',
      introContent: 'Phoenix has been one of the fastest-growing real estate markets in the United States, attracting buyers from California and the Northeast seeking affordability and sunshine. The Greater Phoenix housing market spans diverse communities from luxury enclaves in Scottsdale to family-friendly suburbs in Chandler and Gilbert. PropertyHack delivers the latest updates on home prices, new master-planned communities, and market conditions across Maricopa County. Track Arizona\'s property market as it continues to evolve.',
    },
    {
      location: 'Philadelphia', slug: 'philadelphia', country: 'US',
      metaTitle: 'Property News Philadelphia, US | PropertyHack',
      metaDescription: 'Latest Philadelphia property news, home prices, and Pennsylvania real estate market analysis. PropertyHack covers the Philly housing market and surrounding suburbs.',
      h1Title: 'Philadelphia Property News',
      introContent: 'Philadelphia offers some of the most affordable housing among major East Coast cities, with a strong mix of historic rowhouses, new construction condos, and suburban family homes. The Philly real estate market benefits from its proximity to New York and Washington DC, making it attractive to remote workers and commuters alike. PropertyHack covers price trends, neighborhood revitalization, and investment activity across Philadelphia and the surrounding Pennsylvania suburbs. Stay informed on the developments shaping the City of Brotherly Love\'s housing landscape.',
    },
    {
      location: 'San Antonio', slug: 'san-antonio', country: 'US',
      metaTitle: 'Property News San Antonio, US | PropertyHack',
      metaDescription: 'San Antonio property news, home prices, and Texas real estate market updates. Covering one of America\'s fastest-growing cities with PropertyHack.',
      h1Title: 'San Antonio Property News',
      introContent: 'San Antonio is one of the most affordable large cities in Texas, offering strong value for homebuyers compared to Austin and Dallas. The city\'s diverse economy — anchored by military installations, healthcare, and tourism — provides a stable base for the local real estate market. PropertyHack tracks home prices, new subdivisions, and market trends across the San Antonio metro area. Whether you\'re a first-time buyer or a seasoned investor, stay ahead with the latest San Antonio property market news.',
    },
    {
      location: 'San Diego', slug: 'san-diego', country: 'US',
      metaTitle: 'Property News San Diego, US | PropertyHack',
      metaDescription: 'Latest San Diego property news, home prices, and Southern California real estate market analysis. PropertyHack covers the San Diego housing market from La Jolla to Chula Vista.',
      h1Title: 'San Diego Property News',
      introContent: 'San Diego\'s real estate market is defined by its desirable coastal climate, strong military and defense industry presence, and consistently high demand with limited housing supply. Home prices in San Diego County have remained elevated as buyers compete for properties in neighborhoods ranging from beach communities in Ocean Beach to suburban enclaves in Rancho Bernardo. PropertyHack delivers the latest San Diego property news, covering price movements, new developments, and market forecasts. Stay informed on one of California\'s most competitive housing markets.',
    },
    {
      location: 'Dallas', slug: 'dallas', country: 'US',
      metaTitle: 'Property News Dallas, US | PropertyHack',
      metaDescription: 'Dallas property news, home prices, and DFW real estate market updates. PropertyHack covers the Dallas-Fort Worth housing market and surrounding suburbs.',
      h1Title: 'Dallas Property News',
      introContent: 'The Dallas-Fort Worth metroplex is one of the fastest-growing real estate markets in the United States, fueled by corporate relocations, strong job growth, and a business-friendly Texas climate. From luxury high-rises in Uptown to master-planned communities in Frisco and McKinney, the DFW housing market offers options at every price point. PropertyHack tracks home prices, new construction activity, and investment trends across the entire DFW region. Follow the latest property news shaping one of America\'s most dynamic real estate markets.',
    },
    {
      location: 'San Francisco', slug: 'san-francisco', country: 'US',
      metaTitle: 'Property News San Francisco, US | PropertyHack',
      metaDescription: 'San Francisco property news, home prices, and Bay Area real estate market analysis. PropertyHack covers SF and the greater Silicon Valley housing market.',
      h1Title: 'San Francisco Property News',
      introContent: 'San Francisco remains one of the most expensive real estate markets in the world, shaped by Silicon Valley\'s tech economy, geographic constraints, and strict development regulations. The Bay Area housing market has seen significant shifts in recent years, with remote work trends influencing demand across different neighborhoods and surrounding suburbs. PropertyHack covers the latest SF property news, from price movements in Pacific Heights to new development projects in the Mission District. Stay current on the forces driving California\'s most complex housing market.',
    },
    {
      location: 'Seattle', slug: 'seattle', country: 'US',
      metaTitle: 'Property News Seattle, US | PropertyHack',
      metaDescription: 'Latest Seattle property news, home prices, and Pacific Northwest real estate market analysis. PropertyHack covers the Seattle housing market from Bellevue to Tacoma.',
      h1Title: 'Seattle Property News',
      introContent: 'Seattle\'s real estate market is driven by the city\'s dominant tech sector, with major employers like Amazon and Microsoft keeping demand high across the greater Puget Sound region. The Seattle housing market spans everything from urban condos in Capitol Hill to waterfront estates on the Eastside and family homes in the South Sound suburbs. PropertyHack delivers up-to-date coverage of price trends, development projects, and market conditions across King, Pierce, and Snohomish counties. Stay ahead of the Seattle property market with the latest news and analysis.',
    },
    {
      location: 'Denver', slug: 'denver', country: 'US',
      metaTitle: 'Property News Denver, US | PropertyHack',
      metaDescription: 'Denver property news, home prices, and Colorado real estate market updates. PropertyHack covers the Denver metro housing market from Boulder to Castle Rock.',
      h1Title: 'Denver Property News',
      introContent: 'Denver\'s real estate market has been one of the strongest in the Mountain West, fueled by population growth, outdoor lifestyle appeal, and a diversified economy spanning tech, healthcare, and energy. The Denver metro area offers a wide range of housing options from urban lofts in RiNo to spacious single-family homes in the foothills communities. PropertyHack tracks home prices, new construction, and investment trends across the Front Range region. Stay informed on Colorado\'s property market with comprehensive news coverage from PropertyHack.',
    },
    {
      location: 'Miami', slug: 'miami', country: 'US',
      metaTitle: 'Property News Miami, US | PropertyHack',
      metaDescription: 'Latest Miami property news, home prices, and South Florida real estate market analysis. PropertyHack covers the Miami housing market from Brickell to Coral Gables.',
      h1Title: 'Miami Property News',
      introContent: 'Miami\'s real estate market has surged in recent years, driven by a wave of domestic and international buyers attracted to South Florida\'s warm climate, tax advantages, and thriving business scene. From luxury condos in Brickell to waterfront estates in Coral Gables and family homes in Doral, the Miami metro offers diverse property opportunities. PropertyHack covers the latest Miami property news, tracking price movements, new luxury developments, and market trends across Miami-Dade and Broward counties. Stay current on one of America\'s most dynamic coastal real estate markets.',
    },
    {
      location: 'Atlanta', slug: 'atlanta', country: 'US',
      metaTitle: 'Property News Atlanta, US | PropertyHack',
      metaDescription: 'Atlanta property news, home prices, and Georgia real estate market updates. PropertyHack covers the Atlanta metro housing market from Buckhead to the suburbs.',
      h1Title: 'Atlanta Property News',
      introContent: 'Atlanta is one of the most affordable major metros in the Southeast, attracting buyers from the Northeast and West Coast seeking more housing value and a lower cost of living. The Atlanta housing market encompasses urban neighborhoods like Inman Park and Midtown, as well as booming suburban communities in Gwinnett, Cherokee, and Forsyth counties. PropertyHack tracks home prices, new development activity, and market trends across the Greater Atlanta area. Stay informed on the property news shaping one of America\'s fastest-growing cities.',
    },
    {
      location: 'Boston', slug: 'boston', country: 'US',
      metaTitle: 'Property News Boston, US | PropertyHack',
      metaDescription: 'Latest Boston property news, home prices, and Massachusetts real estate market analysis. PropertyHack covers the Boston housing market from Cambridge to the South Shore.',
      h1Title: 'Boston Property News',
      introContent: 'Boston\'s real estate market is one of the strongest and most competitive on the East Coast, underpinned by a world-class university ecosystem, major healthcare employers, and a thriving tech sector. Home prices in the greater Boston area have remained high as demand consistently outpaces supply, particularly in neighborhoods like Back Bay, Beacon Hill, and the Cambridge-Somerville corridor. PropertyHack covers the latest Boston property news, from price trends to new development projects across Massachusetts. Stay ahead with comprehensive coverage of one of America\'s premier housing markets.',
    },
    {
      location: 'Austin', slug: 'austin', country: 'US',
      metaTitle: 'Property News Austin, US | PropertyHack',
      metaDescription: 'Austin property news, home prices, and Central Texas real estate market updates. PropertyHack covers the Austin housing market from South Congress to the Hill Country.',
      h1Title: 'Austin Property News',
      introContent: 'Austin has experienced one of the most dramatic real estate booms of any American city, driven by a surge of tech company relocations, strong population growth, and Texas\'s business-friendly environment. The Austin housing market spans urban condos in the Domain and East Austin to sprawling ranch homes in the Hill Country suburbs of Round Rock and Cedar Park. PropertyHack delivers the latest Austin property news, tracking price corrections, new supply, and investment activity across the greater Travis County area. Follow the market as Austin continues to reshape the Texas real estate landscape.',
    },
    {
      location: 'Nashville', slug: 'nashville', country: 'US',
      metaTitle: 'Property News Nashville, US | PropertyHack',
      metaDescription: 'Nashville property news, home prices, and Tennessee real estate market updates. PropertyHack covers the Nashville housing market from Germantown to Brentwood.',
      h1Title: 'Nashville Property News',
      introContent: 'Nashville\'s real estate market has been one of the standout performers in the Southeast, fueled by a booming music and entertainment industry, significant corporate investment, and consistent population growth. The Nashville metro area offers a range of housing options from revitalized urban neighborhoods like Germantown and East Nashville to affluent suburban communities in Brentwood and Franklin. PropertyHack tracks the latest home prices, new development activity, and market trends across Middle Tennessee. Stay informed on the property market that\'s reshaping Music City.',
    },
    {
      location: 'Portland', slug: 'portland', country: 'US',
      metaTitle: 'Property News Portland, US | PropertyHack',
      metaDescription: 'Latest Portland property news, home prices, and Oregon real estate market analysis. PropertyHack covers the Portland metro housing market from the Pearl District to the suburbs.',
      h1Title: 'Portland Property News',
      introContent: 'Portland\'s real estate market has evolved significantly in recent years, with shifting demand patterns as remote work has expanded buyer options across the Pacific Northwest. The Portland metro area features a diverse mix of urban neighborhoods, historic bungalows in SE Portland, and family-friendly communities across Washington and Clackamas counties. PropertyHack covers the latest Portland property news, tracking home prices, rental market trends, and development activity across the greater metro. Stay current on Oregon\'s most active property market.',
    },
    {
      location: 'Minneapolis', slug: 'minneapolis', country: 'US',
      metaTitle: 'Property News Minneapolis, US | PropertyHack',
      metaDescription: 'Minneapolis property news, home prices, and Minnesota real estate market updates. PropertyHack covers the Twin Cities housing market from Minneapolis to St. Paul.',
      h1Title: 'Minneapolis Property News',
      introContent: 'The Minneapolis-Saint Paul metro area offers one of the most stable and affordable real estate markets among major American cities, supported by a diverse economy anchored in healthcare, finance, and retail sectors. The Twin Cities housing market features established urban neighborhoods, first-tier suburbs with strong school districts, and exurban communities offering larger lots at competitive prices. PropertyHack delivers up-to-date coverage of home prices, market trends, and development activity across the greater Twin Cities region. Stay informed on Minnesota\'s property market.',
    },
    {
      location: 'Detroit', slug: 'detroit', country: 'US',
      metaTitle: 'Property News Detroit, US | PropertyHack',
      metaDescription: 'Detroit property news, home prices, and Michigan real estate market updates. PropertyHack covers the Detroit metro housing market from Midtown to the suburbs.',
      h1Title: 'Detroit Property News',
      introContent: 'Detroit\'s real estate market has undergone a remarkable transformation over the past decade, with significant investment in the city\'s urban core alongside strong suburban markets across Oakland and Macomb counties. The Detroit metro offers some of the most affordable housing in any major American city, attracting both first-time buyers and investors seeking strong rental yields. PropertyHack tracks the latest home prices, renovation activity, and market trends across the greater Detroit area. Stay current on Michigan\'s evolving property market.',
    },
  ];

  for (const loc of usLocations) {
    await prisma.locationSeo.upsert({
      where: { slug: loc.slug },
      update: { country: loc.country, metaTitle: loc.metaTitle, metaDescription: loc.metaDescription, h1Title: loc.h1Title, introContent: loc.introContent },
      create: { location: loc.location, slug: loc.slug, country: loc.country, metaTitle: loc.metaTitle, metaDescription: loc.metaDescription, h1Title: loc.h1Title, introContent: loc.introContent, focusKeywords: [] },
    });
  }
  console.log('Created 20 US city LocationSeo records');

  // UK city LocationSeo records (British English)
  const ukLocations = [
    {
      location: 'London', slug: 'london', country: 'UK',
      metaTitle: 'Property News London, UK | PropertyHack',
      metaDescription: 'The latest London property news, house prices, and UK real estate market analysis. PropertyHack covers the London housing market from Zone 1 to the outer boroughs.',
      h1Title: 'London Property News',
      introContent: 'London\'s property market is one of the most complex and closely watched in the world, encompassing everything from prime Central London townhouses to new-build flats in outer boroughs undergoing regeneration. The capital\'s housing market is influenced by international investment, government housing policy, and the ongoing tension between supply constraints and demand from a growing population. PropertyHack delivers comprehensive coverage of London house prices, planning decisions, and neighbourhood trends across all 33 boroughs. Stay informed on the developments shaping the UK\'s most dynamic property market.',
    },
    {
      location: 'Manchester', slug: 'manchester', country: 'UK',
      metaTitle: 'Property News Manchester, UK | PropertyHack',
      metaDescription: 'Latest Manchester property news, house prices, and North West England real estate market analysis. PropertyHack covers the Manchester housing market from the city centre to Salford.',
      h1Title: 'Manchester Property News',
      introContent: 'Manchester has established itself as one of the UK\'s most dynamic property markets, driven by strong population growth, major regeneration projects, and a thriving digital and creative economy. The city centre flat market, leafy suburbs like Didsbury and Chorlton, and the rapidly evolving Salford Quays all contribute to a diverse housing landscape. PropertyHack tracks the latest Manchester house prices, development activity, and rental market trends across Greater Manchester. Stay up to date with property news from England\'s second city.',
    },
    {
      location: 'Birmingham', slug: 'birmingham', country: 'UK',
      metaTitle: 'Property News Birmingham, UK | PropertyHack',
      metaDescription: 'Birmingham property news, house prices, and West Midlands real estate market updates. PropertyHack covers the Birmingham housing market from the city centre to Solihull.',
      h1Title: 'Birmingham Property News',
      introContent: 'Birmingham\'s property market continues to attract significant investor interest, underpinned by major infrastructure investment, a young and growing population, and relatively affordable house prices compared to London. The West Midlands housing market spans Birmingham city centre\'s growing apartment sector, established family suburbs in Solihull and Sutton Coldfield, and regenerating communities across the Black Country. PropertyHack delivers the latest Birmingham property news, covering price trends, planning developments, and investment activity. Stay informed on the UK\'s second-largest city property market.',
    },
    {
      location: 'Leeds', slug: 'leeds', country: 'UK',
      metaTitle: 'Property News Leeds, UK | PropertyHack',
      metaDescription: 'Latest Leeds property news, house prices, and Yorkshire real estate market analysis. PropertyHack covers the Leeds housing market and wider West Yorkshire region.',
      h1Title: 'Leeds Property News',
      introContent: 'Leeds has emerged as one of the North of England\'s strongest property markets, powered by a thriving financial and professional services sector, a large student population, and significant city centre regeneration. The Leeds housing market offers a compelling mix of Victorian terraces in Headingley, contemporary city centre apartments, and family homes in surrounding commuter villages. PropertyHack tracks house prices, new development schemes, and rental yields across Leeds and West Yorkshire. Stay current on the property market news defining this northern powerhouse city.',
    },
    {
      location: 'Glasgow', slug: 'glasgow', country: 'UK',
      metaTitle: 'Property News Glasgow, UK | PropertyHack',
      metaDescription: 'Glasgow property news, house prices, and Scottish real estate market updates. PropertyHack covers the Glasgow housing market from the West End to the South Side.',
      h1Title: 'Glasgow Property News',
      introContent: 'Glasgow\'s property market offers exceptional value by UK standards, with a diverse housing stock ranging from grand Victorian terraces in the West End to tenement flats in popular areas like Shawlands and Partick. Scotland\'s largest city has seen sustained house price growth, driven by strong local employment, a thriving cultural scene, and continued investment in regeneration projects across the east end and waterfront. PropertyHack delivers up-to-date Glasgow property news, covering market trends, planning decisions, and neighbourhood analysis. Stay informed on Scotland\'s most active property market.',
    },
    {
      location: 'Edinburgh', slug: 'edinburgh', country: 'UK',
      metaTitle: 'Property News Edinburgh, UK | PropertyHack',
      metaDescription: 'Latest Edinburgh property news, house prices, and Scottish real estate market analysis. PropertyHack covers the Edinburgh housing market from the New Town to the suburbs.',
      h1Title: 'Edinburgh Property News',
      introContent: 'Edinburgh\'s property market is one of the most competitive in Scotland, characterised by strong demand, constrained supply in the city\'s protected Georgian New Town and Old Town areas, and a buoyant short-term rental market. The Scottish capital attracts buyers from across the UK and internationally, drawn by its world-class universities, financial services industry, and outstanding quality of life. PropertyHack tracks Edinburgh house prices, planning activity, and market trends across the city and surrounding Lothian commuter belt. Stay ahead with comprehensive coverage of Edinburgh\'s property market.',
    },
    {
      location: 'Bristol', slug: 'bristol', country: 'UK',
      metaTitle: 'Property News Bristol, UK | PropertyHack',
      metaDescription: 'Bristol property news, house prices, and South West England real estate market updates. PropertyHack covers the Bristol housing market from Clifton to Bedminster.',
      h1Title: 'Bristol Property News',
      introContent: 'Bristol has consistently ranked among the UK\'s most sought-after cities to live and invest, combining a strong creative and tech economy with a vibrant cultural scene and enviable quality of life. The Bristol housing market features everything from Georgian townhouses in Clifton to Victorian terraces in Easton and new-build developments along the waterfront. House prices in Bristol have outpaced the national average in recent years as demand from young professionals and families continues to exceed supply. PropertyHack covers the latest Bristol property news, including price trends, planning applications, and neighbourhood insights.',
    },
    {
      location: 'Liverpool', slug: 'liverpool', country: 'UK',
      metaTitle: 'Property News Liverpool, UK | PropertyHack',
      metaDescription: 'Latest Liverpool property news, house prices, and Merseyside real estate market analysis. PropertyHack covers the Liverpool housing market from the city centre to the suburbs.',
      h1Title: 'Liverpool Property News',
      introContent: 'Liverpool\'s property market offers some of the most attractive yields and lowest entry prices among major UK cities, making it a popular destination for buy-to-let investors from across the country. The city\'s housing stock is diverse, spanning Georgian terraces in Georgian Quarter, Victorian houses in Wavertree, and new-build apartment schemes in the Baltic Triangle and waterfront areas. PropertyHack delivers the latest Liverpool property news, tracking house prices, development activity, and rental market conditions across Merseyside. Stay informed on one of the UK\'s most accessible and evolving property markets.',
    },
    {
      location: 'Newcastle', slug: 'newcastle', country: 'UK',
      metaTitle: 'Property News Newcastle, UK | PropertyHack',
      metaDescription: 'Newcastle property news, house prices, and North East England real estate market updates. PropertyHack covers the Newcastle upon Tyne housing market and wider Tyneside region.',
      h1Title: 'Newcastle Property News',
      introContent: 'Newcastle upon Tyne\'s property market represents one of the best value propositions in the UK, with house prices significantly below the national average while the city offers a vibrant cultural scene, strong universities, and growing technology and digital sectors. The Newcastle housing market encompasses student-popular areas like Jesmond and Heaton, family suburbs in the wider Tyneside region, and a growing city centre apartment market. PropertyHack tracks the latest Newcastle house prices, regeneration projects, and market trends across the North East. Stay current on Tyneside\'s evolving property landscape.',
    },
    {
      location: 'Sheffield', slug: 'sheffield', country: 'UK',
      metaTitle: 'Property News Sheffield, UK | PropertyHack',
      metaDescription: 'Sheffield property news, house prices, and South Yorkshire real estate market analysis. PropertyHack covers the Sheffield housing market from Ecclesall Road to the suburbs.',
      h1Title: 'Sheffield Property News',
      introContent: 'Sheffield\'s property market has attracted growing attention from investors and buyers seeking affordability combined with a genuinely liveable city environment. The Steel City\'s housing stock is varied, from popular student areas like Broomhill and Crookes to family-friendly suburbs in the south-west of the city and regenerating communities in the Lower Don Valley. Sheffield benefits from two major universities, strong healthcare employment, and ongoing city centre investment. PropertyHack delivers the latest Sheffield property news, covering house prices, new developments, and market analysis across South Yorkshire.',
    },
    {
      location: 'Cardiff', slug: 'cardiff', country: 'UK',
      metaTitle: 'Property News Cardiff, UK | PropertyHack',
      metaDescription: 'Latest Cardiff property news, house prices, and Welsh real estate market analysis. PropertyHack covers the Cardiff housing market from the Bay to the northern suburbs.',
      h1Title: 'Cardiff Property News',
      introContent: 'Cardiff\'s property market has grown steadily as the Welsh capital has developed into a major UK city with a strong financial and public sector employment base. The Cardiff housing market spans Victorian terraces in popular suburbs like Pontcanna and Roath, waterfront apartments in Cardiff Bay, and new-build family homes in northern suburbs such as Llanishen and Rhiwbina. PropertyHack tracks house prices, planning decisions, and development activity across Cardiff and the wider South Wales region. Stay informed on the latest property news from Wales\'s capital city.',
    },
    {
      location: 'Belfast', slug: 'belfast', country: 'UK',
      metaTitle: 'Property News Belfast, UK | PropertyHack',
      metaDescription: 'Belfast property news, house prices, and Northern Ireland real estate market updates. PropertyHack covers the Belfast housing market from the city centre to the suburbs.',
      h1Title: 'Belfast Property News',
      introContent: 'Belfast\'s property market offers outstanding value by UK standards, with house prices significantly lower than comparable mainland cities and a diverse housing stock to suit all buyer types. The city has undergone significant regeneration since the peace process, with new office, retail, and residential development transforming the waterfront and city centre. Belfast\'s growing tech and financial services sectors are supporting sustained demand across the housing market. PropertyHack covers the latest Belfast property news, tracking price trends, new developments, and market conditions across Northern Ireland.',
    },
    {
      location: 'Nottingham', slug: 'nottingham', country: 'UK',
      metaTitle: 'Property News Nottingham, UK | PropertyHack',
      metaDescription: 'Nottingham property news, house prices, and East Midlands real estate market analysis. PropertyHack covers the Nottingham housing market from the Lace Market to the suburbs.',
      h1Title: 'Nottingham Property News',
      introContent: 'Nottingham\'s property market is shaped by its two major universities, strong NHS and public sector employment, and a growing reputation as a business destination in the East Midlands. The city\'s housing stock includes popular student areas like Lenton and Dunkirk, Victorian suburbs in West Bridgford, and new-build developments across the wider Nottinghamshire area. PropertyHack tracks Nottingham house prices, rental market trends, and development activity across the city and surrounding region. Stay current on property news from the East Midlands\' most active market.',
    },
    {
      location: 'Cambridge', slug: 'cambridge', country: 'UK',
      metaTitle: 'Property News Cambridge, UK | PropertyHack',
      metaDescription: 'Latest Cambridge property news, house prices, and Cambridgeshire real estate market analysis. PropertyHack covers the Cambridge housing market and the wider tech cluster.',
      h1Title: 'Cambridge Property News',
      introContent: 'Cambridge\'s property market is among the most expensive outside London, driven by the global reputation of its university, the dense concentration of biotech and technology companies along the Cambridge Cluster, and constrained land supply within the city\'s green belt. The housing market spans Victorian terraces in the city\'s residential areas, new-build homes on major development sites to the north and south, and villages in the surrounding Cambridgeshire countryside. PropertyHack delivers the latest Cambridge property news, covering house prices, planning decisions, and investment trends. Stay ahead with comprehensive coverage of this unique UK market.',
    },
    {
      location: 'Oxford', slug: 'oxford', country: 'UK',
      metaTitle: 'Property News Oxford, UK | PropertyHack',
      metaDescription: 'Oxford property news, house prices, and Oxfordshire real estate market updates. PropertyHack covers the Oxford housing market and surrounding county commuter belt.',
      h1Title: 'Oxford Property News',
      introContent: 'Oxford\'s property market rivals Cambridge as one of the most expensive outside London, underpinned by the University of Oxford, a cluster of high-growth life sciences and technology businesses, and exceptional connectivity to London via fast rail services. The city\'s strict planning constraints have kept housing supply tight, maintaining consistent upward pressure on prices across the Oxfordshire market. PropertyHack tracks house prices, development applications, and market trends across Oxford and the wider county area. Stay informed on one of the UK\'s most distinctive and competitive property markets.',
    },
  ];

  for (const loc of ukLocations) {
    await prisma.locationSeo.upsert({
      where: { slug: loc.slug },
      update: { country: loc.country, metaTitle: loc.metaTitle, metaDescription: loc.metaDescription, h1Title: loc.h1Title, introContent: loc.introContent },
      create: { location: loc.location, slug: loc.slug, country: loc.country, metaTitle: loc.metaTitle, metaDescription: loc.metaDescription, h1Title: loc.h1Title, introContent: loc.introContent, focusKeywords: [] },
    });
  }
  console.log('Created 15 UK city LocationSeo records');

  // CA city LocationSeo records (US English)
  const caLocations = [
    {
      location: 'Toronto', slug: 'toronto', country: 'CA',
      metaTitle: 'Property News Toronto, CA | PropertyHack',
      metaDescription: 'Latest Toronto property news, home prices, and Canadian real estate market analysis. PropertyHack covers the Toronto housing market from downtown to the GTA suburbs.',
      h1Title: 'Toronto Property News',
      introContent: 'Toronto\'s real estate market is one of the most closely watched in North America, characterized by persistently high demand, limited housing supply, and ongoing debates about affordability and densification. The Greater Toronto Area housing market spans downtown condos and luxury detached homes to affordable starter homes in outer suburbs like Brampton, Mississauga, and Markham. PropertyHack delivers comprehensive coverage of Toronto home prices, new development approvals, and market trends across the GTA. Stay informed on the property news shaping Canada\'s largest city.',
    },
    {
      location: 'Vancouver', slug: 'vancouver', country: 'CA',
      metaTitle: 'Property News Vancouver, CA | PropertyHack',
      metaDescription: 'Vancouver property news, home prices, and British Columbia real estate market updates. PropertyHack covers the Greater Vancouver housing market from downtown to the Fraser Valley.',
      h1Title: 'Vancouver Property News',
      introContent: 'Vancouver\'s real estate market consistently ranks among the least affordable in North America, shaped by geographic constraints, strong international demand, and limited land supply within the Lower Mainland. The Greater Vancouver housing market encompasses everything from luxury penthouses in Coal Harbour to family townhomes in Surrey and detached properties in the Fraser Valley. PropertyHack tracks the latest Vancouver home prices, zoning changes, and investment trends across Metro Vancouver. Stay current on the market forces shaping British Columbia\'s most active property market.',
    },
    {
      location: 'Montreal', slug: 'montreal', country: 'CA',
      metaTitle: 'Property News Montreal, CA | PropertyHack',
      metaDescription: 'Latest Montreal property news, home prices, and Quebec real estate market analysis. PropertyHack covers the Montreal housing market from the Plateau to the suburbs.',
      h1Title: 'Montreal Property News',
      introContent: 'Montreal offers the most affordable real estate of Canada\'s major cities, combining a vibrant urban lifestyle with home prices that remain accessible compared to Toronto and Vancouver. The Montreal housing market features a diverse mix of classic Plateau-style duplexes and triplexes, downtown condos, and suburban single-family homes across the Island of Montreal and off-island communities. PropertyHack covers the latest Montreal property news, tracking home prices, market trends, and development activity across the Greater Montreal region. Stay informed on one of Canada\'s most dynamic and affordable property markets.',
    },
    {
      location: 'Calgary', slug: 'calgary', country: 'CA',
      metaTitle: 'Property News Calgary, CA | PropertyHack',
      metaDescription: 'Calgary property news, home prices, and Alberta real estate market updates. PropertyHack covers the Calgary housing market from the inner city to the suburbs.',
      h1Title: 'Calgary Property News',
      introContent: 'Calgary\'s real estate market has been one of the strongest performers in Canada in recent years, driven by strong population growth, competitive home prices relative to Toronto and Vancouver, and Alberta\'s booming energy sector. The Calgary housing market offers excellent value with a wide range of single-family homes, townhomes, and condos across established inner-city neighborhoods and modern suburban communities in the north and south. PropertyHack delivers the latest Calgary property news, tracking home prices, new community development, and market conditions across the Calgary region. Stay ahead on Alberta\'s most active property market.',
    },
    {
      location: 'Edmonton', slug: 'edmonton', country: 'CA',
      metaTitle: 'Property News Edmonton, CA | PropertyHack',
      metaDescription: 'Edmonton property news, home prices, and Alberta real estate market analysis. PropertyHack covers the Edmonton housing market and surrounding region.',
      h1Title: 'Edmonton Property News',
      introContent: 'Edmonton\'s property market offers some of the best housing affordability among major Canadian cities, with competitive home prices that attract buyers from more expensive markets across the country. The Edmonton housing market is supported by a strong public sector, oil and gas industry employment, and a growing technology sector. PropertyHack tracks Edmonton home prices, new subdivision development, and market trends across the Capital Region. Stay current on property news from Alberta\'s capital city.',
    },
    {
      location: 'Ottawa', slug: 'ottawa', country: 'CA',
      metaTitle: 'Property News Ottawa, CA | PropertyHack',
      metaDescription: 'Latest Ottawa property news, home prices, and Ontario real estate market analysis. PropertyHack covers the Ottawa housing market from Kanata to Barrhaven.',
      h1Title: 'Ottawa Property News',
      introContent: 'Ottawa\'s real estate market is underpinned by one of Canada\'s most stable employment bases, with the federal public service providing consistent demand for housing across all price points. The Ottawa housing market features established neighborhoods in Centretown and the Glebe, family communities in Barrhaven and Kanata, and luxury properties in Rockcliffe Park. PropertyHack delivers the latest Ottawa property news, covering home prices, new development activity, and market trends across the National Capital Region. Stay informed on property market conditions in Canada\'s capital city.',
    },
    {
      location: 'Winnipeg', slug: 'winnipeg', country: 'CA',
      metaTitle: 'Property News Winnipeg, CA | PropertyHack',
      metaDescription: 'Winnipeg property news, home prices, and Manitoba real estate market updates. PropertyHack covers the Winnipeg housing market from River Heights to the suburbs.',
      h1Title: 'Winnipeg Property News',
      introContent: 'Winnipeg consistently ranks among the most affordable housing markets of any major Canadian city, offering buyers strong value with a diverse range of single-family homes, condos, and investment properties. The Winnipeg real estate market is supported by a stable, diversified economy encompassing agriculture, manufacturing, finance, and government employment. PropertyHack tracks Winnipeg home prices, neighborhood trends, and market activity across the city and surrounding Manitoba region. Stay current on property news from the heart of Canada\'s prairies.',
    },
    {
      location: 'Quebec City', slug: 'quebec-city', country: 'CA',
      metaTitle: 'Property News Quebec City, CA | PropertyHack',
      metaDescription: 'Latest Quebec City property news, home prices, and Quebec real estate market analysis. PropertyHack covers the Quebec City housing market from Old Quebec to the suburbs.',
      h1Title: 'Quebec City Property News',
      introContent: 'Quebec City\'s property market offers exceptional affordability compared to other major Canadian cities, combined with the unique charm of North America\'s only walled city and a stable economy anchored by government, healthcare, and tourism. The housing market encompasses historic properties in the Old City, established residential neighborhoods in Sainte-Foy and Charlesbourg, and new suburban developments on the city\'s outskirts. PropertyHack covers the latest Quebec City property news, tracking home prices, market conditions, and development activity across the Quebec City metropolitan area. Stay informed on this distinctive and accessible Canadian property market.',
    },
    {
      location: 'Hamilton', slug: 'hamilton', country: 'CA',
      metaTitle: 'Property News Hamilton, CA | PropertyHack',
      metaDescription: 'Hamilton property news, home prices, and Ontario real estate market updates. PropertyHack covers the Hamilton housing market as the city grows beyond Toronto\'s shadow.',
      h1Title: 'Hamilton Property News',
      introContent: 'Hamilton has emerged as one of Ontario\'s most sought-after real estate markets, as buyers priced out of Toronto seek more affordable options with good transit connectivity to the GTA. The Steel City\'s housing market features Victorian homes in the lower city, family neighborhoods on the Mountain, and new developments in outlying communities like Stoney Creek and Binbrook. PropertyHack delivers the latest Hamilton property news, tracking home prices, development activity, and the city\'s ongoing transformation. Stay current on one of Ontario\'s most dynamic and fast-changing property markets.',
    },
    {
      location: 'Victoria', slug: 'victoria', country: 'CA',
      metaTitle: 'Property News Victoria, CA | PropertyHack',
      metaDescription: 'Latest Victoria property news, home prices, and British Columbia real estate market analysis. PropertyHack covers the Greater Victoria housing market on Vancouver Island.',
      h1Title: 'Victoria Property News',
      introContent: 'Victoria\'s real estate market has seen sustained demand from retirees, remote workers, and buyers seeking a more relaxed West Coast lifestyle on Vancouver Island. The Greater Victoria housing market spans heritage homes in James Bay and Oak Bay, family neighborhoods in Saanich, and new condo developments in the downtown core. Limited land supply and strong in-migration have kept Victoria home prices elevated relative to most Canadian cities. PropertyHack tracks the latest Victoria property news, covering market trends, new listings activity, and development across the Capital Regional District.',
    },
  ];

  for (const loc of caLocations) {
    await prisma.locationSeo.upsert({
      where: { slug: loc.slug },
      update: { country: loc.country, metaTitle: loc.metaTitle, metaDescription: loc.metaDescription, h1Title: loc.h1Title, introContent: loc.introContent },
      create: { location: loc.location, slug: loc.slug, country: loc.country, metaTitle: loc.metaTitle, metaDescription: loc.metaDescription, h1Title: loc.h1Title, introContent: loc.introContent, focusKeywords: [] },
    });
  }
  console.log('Created 10 CA city LocationSeo records');

  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
