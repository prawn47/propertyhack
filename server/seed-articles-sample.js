const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const sampleArticles = [
  {
    title: "Sydney Property Prices Surge 8% in Q4 2024",
    slug: "sydney-property-prices-surge-8-percent-q4-2024",
    summary: "Sydney's property market has experienced a remarkable 8% growth in the final quarter of 2024, driven by strong buyer demand and limited housing supply. The median house price now sits at $1.45 million, marking the strongest quarterly growth since 2021. Inner-city suburbs led the charge, with prices in areas like Surry Hills and Newtown climbing by double digits. Experts attribute the surge to renewed confidence in the market, lower interest rates, and the influx of interstate buyers seeking opportunities in Australia's largest city.",
    content: null,
    sourceUrl: "https://www.domain.com.au/news/sydney-prices-surge-q4",
    sourceName: "Domain",
    sourceLogoUrl: "https://www.domain.com.au/favicon.ico",
    metaDescription: "Sydney property prices jump 8% in Q4 2024 as buyer demand outstrips supply. Median house price reaches $1.45M with inner-city suburbs leading growth.",
    focusKeywords: JSON.stringify(["sydney property prices", "property market growth", "australian real estate", "housing demand", "property investment"]),
    ogImage: null,
    imageUrl: "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9",
    imageAltText: "Sydney harbour with modern residential buildings showcasing property market growth",
    market: "AU",
    status: "published",
    publishedAt: new Date("2024-11-10T09:00:00Z"),
    viewCount: 0,
    featured: true,
  },
  {
    title: "Melbourne Rental Crisis: Vacancy Rates Hit Record Low",
    slug: "melbourne-rental-crisis-vacancy-rates-record-low",
    summary: "Melbourne's rental market is facing unprecedented pressure as vacancy rates drop to a historic low of 1.2%, creating intense competition among tenants. The shortage has pushed median weekly rents up 12% year-on-year, now averaging $550 for a two-bedroom apartment. Property managers report receiving 50+ applications for single properties within hours of listing. The crisis is particularly acute in inner suburbs, where the combination of population growth and limited new rental stock has created a perfect storm for renters.",
    content: null,
    sourceUrl: "https://www.realestate.com.au/news/melbourne-rental-crisis",
    sourceName: "REA Group",
    sourceLogoUrl: "https://www.realestate.com.au/favicon.ico",
    metaDescription: "Melbourne rental vacancy rates plunge to 1.2% as weekly rents surge 12%. Tenants face fierce competition with 50+ applications per property.",
    focusKeywords: JSON.stringify(["melbourne rental market", "vacancy rates", "rental crisis", "australian property", "rental prices"]),
    ogImage: null,
    imageUrl: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00",
    imageAltText: "Melbourne city skyline with apartment buildings highlighting rental market conditions",
    market: "AU",
    status: "published",
    publishedAt: new Date("2024-11-12T08:30:00Z"),
    viewCount: 0,
    featured: true,
  },
  {
    title: "First Home Buyers Flock to Brisbane as Affordability Improves",
    slug: "first-home-buyers-brisbane-affordability-improves",
    summary: "Brisbane is emerging as Australia's most attractive market for first-home buyers, with median house prices at $750,000 offering better value than Sydney or Melbourne. The Queensland capital has seen a 23% increase in first-home buyer activity this quarter, supported by state government grants and lower entry prices. Suburbs like Logan and Ipswich are particularly popular, offering modern homes within 30km of the CBD. Real estate agents report first-home buyers now represent 35% of all purchases, up from 22% last year.",
    content: null,
    sourceUrl: "https://www.propertyobserver.com.au/brisbane-first-home-buyers",
    sourceName: "Property Observer",
    sourceLogoUrl: null,
    metaDescription: "Brisbane attracts first-home buyers with $750K median price and 23% activity increase. Logan and Ipswich suburbs lead affordable property options.",
    focusKeywords: JSON.stringify(["first home buyers", "brisbane property market", "affordable housing", "property affordability", "queensland real estate"]),
    ogImage: null,
    imageUrl: "https://images.unsplash.com/photo-1582407947304-fd86f028f716",
    imageAltText: "Brisbane residential suburb showcasing affordable first home buyer opportunities",
    market: "AU",
    status: "published",
    publishedAt: new Date("2024-11-11T10:00:00Z"),
    viewCount: 0,
    featured: false,
  },
  {
    title: "Perth Property Boom Continues: Prices Up 15% Year-on-Year",
    slug: "perth-property-boom-continues-prices-up-15-percent",
    summary: "Perth's property market is experiencing its strongest growth cycle in over a decade, with house prices climbing 15% in the past year. The median house price has reached $625,000, still offering value compared to eastern capitals. Mining sector recovery and interstate migration are driving demand, with suburbs like Scarborough and Mount Lawley seeing bidding wars return. Rental yields of 4-5% are attracting investors, while owner-occupiers are drawn by lifestyle factors and relative affordability.",
    content: null,
    sourceUrl: "https://www.reiwa.com.au/perth-market-update",
    sourceName: "REIWA",
    sourceLogoUrl: null,
    metaDescription: "Perth property prices soar 15% annually as mining boom and migration drive demand. Median house price reaches $625K with strong rental yields.",
    focusKeywords: JSON.stringify(["perth property market", "western australia real estate", "property boom", "mining sector", "property investment"]),
    ogImage: null,
    imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4",
    imageAltText: "Perth beachfront properties showcasing booming Western Australian property market",
    market: "AU",
    status: "published",
    publishedAt: new Date("2024-11-09T07:00:00Z"),
    viewCount: 0,
    featured: false,
  },
  {
    title: "Adelaide Emerges as Top Market for Renovation Returns",
    slug: "adelaide-top-market-renovation-returns",
    summary: "Adelaide homeowners are achieving the highest renovation returns in Australia, with strategic upgrades delivering 150-200% return on investment. Kitchen and bathroom renovations are proving particularly lucrative, adding $60,000-$80,000 to property values for investments of $30,000-$40,000. The city's lower base prices make it ideal for value-add strategies, with suburbs like Prospect and Norwood leading the charge. Real estate experts predict continued strong returns as Adelaide's market matures.",
    content: null,
    sourceUrl: "https://www.adelaidenow.com.au/property/renovation-returns",
    sourceName: "Adelaide Now",
    sourceLogoUrl: null,
    metaDescription: "Adelaide delivers Australia's best renovation returns at 150-200% ROI. Kitchen and bathroom upgrades add $60K-$80K value for $30K-$40K investment.",
    focusKeywords: JSON.stringify(["property renovation", "adelaide real estate", "renovation returns", "property value", "home improvement"]),
    ogImage: null,
    imageUrl: "https://images.unsplash.com/photo-1484154218962-a197022b5858",
    imageAltText: "Modern renovated kitchen in Adelaide showcasing high renovation returns",
    market: "AU",
    status: "published",
    publishedAt: new Date("2024-11-13T11:00:00Z"),
    viewCount: 0,
    featured: false,
  },
  {
    title: "Regional NSW Towns See 20% Price Growth as Tree-Change Trend Continues",
    slug: "regional-nsw-towns-20-percent-growth-tree-change",
    summary: "Regional New South Wales is experiencing a sustained property boom, with towns like Orange, Bathurst, and Byron Bay recording 20% annual price growth. The work-from-home revolution has made regional living viable for professionals, driving unprecedented demand. Median house prices in these areas now range from $550,000 to $850,000, still offering value compared to Sydney. Local infrastructure improvements and lifestyle appeal are cementing regional NSW as a long-term investment hotspot.",
    content: null,
    sourceUrl: "https://www.domain.com.au/news/regional-nsw-boom",
    sourceName: "Domain",
    sourceLogoUrl: "https://www.domain.com.au/favicon.ico",
    metaDescription: "Regional NSW property prices surge 20% as tree-change trend accelerates. Orange, Bathurst, Byron Bay lead with $550K-$850K median prices.",
    focusKeywords: JSON.stringify(["regional property", "tree change", "nsw real estate", "work from home", "regional investment"]),
    ogImage: null,
    imageUrl: "https://images.unsplash.com/photo-1464146072230-91cabc968266",
    imageAltText: "Scenic regional NSW countryside property showcasing tree-change lifestyle opportunities",
    market: "AU",
    status: "published",
    publishedAt: new Date("2024-11-08T06:00:00Z"),
    viewCount: 0,
    featured: false,
  },
  {
    title: "Luxury Property Market Defies Expectations with Record Sales",
    slug: "luxury-property-market-record-sales",
    summary: "Australia's luxury property market is defying broader economic concerns, with sales above $10 million up 35% this year. Sydney's eastern suburbs and Melbourne's Toorak lead the charge, with waterfront properties commanding premium prices. International buyers, particularly from Asia, are returning in numbers not seen since 2019. The super-prime segment ($20M+) has been especially strong, with several properties breaking suburb records. Agents cite wealth accumulation during the pandemic and pent-up demand as key drivers.",
    content: null,
    sourceUrl: "https://www.afr.com/property/luxury-market-record-sales",
    sourceName: "Financial Review",
    sourceLogoUrl: null,
    metaDescription: "Luxury property sales above $10M surge 35% as international buyers return. Sydney and Melbourne waterfront properties command record prices.",
    focusKeywords: JSON.stringify(["luxury property", "prestige real estate", "high-end property", "international buyers", "property investment"]),
    ogImage: null,
    imageUrl: "https://images.unsplash.com/photo-1613490493576-7fde63acd811",
    imageAltText: "Luxury waterfront property in Sydney showcasing prestige real estate market",
    market: "AU",
    status: "published",
    publishedAt: new Date("2024-11-07T08:00:00Z"),
    viewCount: 0,
    featured: false,
  },
  {
    title: "Interest Rate Predictions: What Experts Say About 2025 Property Market",
    slug: "interest-rate-predictions-2025-property-market",
    summary: "Leading economists predict the Reserve Bank will cut interest rates twice in early 2025, providing relief to mortgage holders and potentially reigniting property demand. Current forecasts suggest rates could fall to 3.85% by mid-year, down from the current 4.35%. This would reduce monthly repayments by approximately $300 on a $700,000 loan. Property analysts are divided on the impact, with some predicting renewed price growth while others warn of sustained high living costs dampening buyer enthusiasm.",
    content: null,
    sourceUrl: "https://www.abc.net.au/news/interest-rates-property-2025",
    sourceName: "ABC News",
    sourceLogoUrl: null,
    metaDescription: "Economists forecast two RBA rate cuts in early 2025 to 3.85%, potentially saving $300 monthly on $700K loans and impacting property market.",
    focusKeywords: JSON.stringify(["interest rates", "rba", "property market forecast", "mortgage rates", "2025 property predictions"]),
    ogImage: null,
    imageUrl: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e",
    imageAltText: "Australian Reserve Bank building representing interest rate decisions affecting property market",
    market: "AU",
    status: "published",
    publishedAt: new Date("2024-11-14T09:00:00Z"),
    viewCount: 0,
    featured: true,
  },
  {
    title: "Build-to-Rent Developments Transform Australian Rental Landscape",
    slug: "build-to-rent-developments-transform-rental-landscape",
    summary: "Purpose-built rental developments are reshaping Australia's rental market, with $15 billion worth of projects under construction nationwide. These developments offer long-term leases, professional management, and resort-style amenities, appealing to renters seeking stability. Melbourne and Sydney are leading the charge, with major projects in Parramatta, Zetland, and Docklands. Industry experts predict build-to-rent will account for 15% of new apartment supply by 2030, fundamentally changing Australia's rental culture.",
    content: null,
    sourceUrl: "https://www.propertyobserver.com.au/build-to-rent-boom",
    sourceName: "Property Observer",
    sourceLogoUrl: null,
    metaDescription: "Build-to-rent developments worth $15B reshape Australian rental market. Long-term leases and amenities attract stability-seeking renters.",
    focusKeywords: JSON.stringify(["build to rent", "rental developments", "property investment", "rental market", "apartment living"]),
    ogImage: null,
    imageUrl: "https://images.unsplash.com/photo-1560518883-ce09059eeffa",
    imageAltText: "Modern build-to-rent apartment development showcasing new rental living standards",
    market: "AU",
    status: "published",
    publishedAt: new Date("2024-11-06T10:00:00Z"),
    viewCount: 0,
    featured: false,
  },
  {
    title: "Sustainability Features Add 15% Premium to Property Values",
    slug: "sustainability-features-add-15-percent-premium",
    summary: "Australian buyers are willing to pay significant premiums for sustainable homes, with properties featuring solar panels, water recycling, and high energy ratings commanding up to 15% more than comparable homes. The trend is strongest among millennial buyers, who prioritize environmental credentials alongside traditional features. Suburbs with high concentrations of sustainable homes, like Freemantle in Perth and Brunswick in Melbourne, are outperforming their local markets. Experts predict sustainability will become a baseline expectation rather than a premium feature within five years.",
    content: null,
    sourceUrl: "https://www.domain.com.au/news/sustainable-homes-premium",
    sourceName: "Domain",
    sourceLogoUrl: "https://www.domain.com.au/favicon.ico",
    metaDescription: "Sustainable homes command 15% premium as buyers prioritize solar, water recycling, and energy ratings. Millennial buyers drive green property trend.",
    focusKeywords: JSON.stringify(["sustainable homes", "green property", "energy efficiency", "solar panels", "property value"]),
    ogImage: null,
    imageUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c",
    imageAltText: "Modern sustainable home with solar panels showcasing premium green property features",
    market: "AU",
    status: "published",
    publishedAt: new Date("2024-11-05T07:30:00Z"),
    viewCount: 0,
    featured: false,
  },
];

async function main() {
  console.log('🌱 Seeding sample AU property articles...');
  
  // Get or create admin user
  let adminUser = await prisma.user.findFirst({
    where: { superAdmin: true }
  });
  
  if (!adminUser) {
    console.log('Creating admin user...');
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    adminUser = await prisma.user.create({
      data: {
        email: 'admin@propertyhack.com',
        passwordHash: hashedPassword,
        emailVerified: true,
        superAdmin: true,
        role: 'super_admin',
        displayName: 'Admin User',
      },
    });
    console.log('✅ Admin user created');
  }
  
  // Create articles
  for (const articleData of sampleArticles) {
    const article = await prisma.article.create({
      data: {
        ...articleData,
        authorId: adminUser.id,
      },
    });
    console.log(`✅ Created: ${article.title}`);
  }
  
  console.log('\n🎉 Seed completed! Created 10 sample articles.');
  console.log(`\nAdmin login:
  Email: admin@propertyhack.com
  Password: admin123
  `);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
