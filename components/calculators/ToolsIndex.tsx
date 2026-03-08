import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Header from '../layout/Header';
import Footer from '../layout/Footer';
import SeoHead from '../shared/SeoHead';
import Breadcrumbs from '../shared/Breadcrumbs';
import { useCountryDetection } from '../../hooks/useCountryDetection';

const SITE_URL = 'https://propertyhack.com.au';

const calculators = [
  {
    slug: 'mortgage-calculator',
    name: 'Mortgage Calculator',
    description: 'Calculate your mortgage repayments across different loan terms, rates, and payment frequencies.',
    countries: null as string[] | null,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
  },
  {
    slug: 'stamp-duty-calculator',
    name: 'Stamp Duty Calculator',
    description: 'Estimate stamp duty costs for every Australian state and territory, including first home buyer concessions.',
    countries: ['AU'],
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185zM9.75 9h.008v.008H9.75V9zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 4.5h.008v.008h-.008V13.5zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
      </svg>
    ),
  },
  {
    slug: 'rental-yield-calculator',
    name: 'Rental Yield Calculator',
    description: 'Analyse your investment property\'s gross and net rental yield with detailed expense tracking.',
    countries: null as string[] | null,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
  {
    slug: 'borrowing-power-calculator',
    name: 'Borrowing Power Calculator',
    description: 'Find out how much you could borrow based on your income, expenses, and existing debts.',
    countries: ['AU'],
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    slug: 'us/transfer-tax-calculator',
    name: 'US Transfer Tax Calculator',
    description: 'Estimate transfer taxes, mortgage recording tax, and closing costs for property purchases across all 50 US states.',
    countries: ['US'],
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185zM9.75 9h.008v.008H9.75V9zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 4.5h.008v.008h-.008V13.5zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
      </svg>
    ),
  },
  {
    slug: 'rent-vs-buy-calculator',
    name: 'Rent vs Buy Calculator',
    description: 'Compare the long-term financial outcome of renting and investing versus buying a home.',
    countries: null as string[] | null,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971z" />
      </svg>
    ),
  },
];

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'PropertyHack Property Calculators',
  url: `${SITE_URL}/tools`,
  description: 'Free property calculators — mortgage repayments, stamp duty, rental yield, borrowing power, rent vs buy. Make smarter property decisions.',
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Web',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'AUD',
  },
  publisher: {
    '@type': 'Organization',
    name: 'PropertyHack',
    url: SITE_URL,
  },
};

const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
    { '@type': 'ListItem', position: 2, name: 'Property Calculators', item: `${SITE_URL}/tools` },
  ],
};

const ToolsIndex: React.FC = () => {
  const { country, loading: countryLoading } = useCountryDetection();
  const [showAll, setShowAll] = useState(false);

  const filteredCalculators = useMemo(() => {
    if (showAll || !country || countryLoading) return calculators;
    return calculators.filter((calc) => !calc.countries || calc.countries.includes(country));
  }, [country, countryLoading, showAll]);

  const hasHidden = filteredCalculators.length < calculators.length;

  return (
    <div className="min-h-screen bg-base-200 flex flex-col">
      <SeoHead
        title="Property Calculators Australia"
        description="Free property calculators — mortgage repayments, stamp duty, rental yield, borrowing power, rent vs buy. Make smarter property decisions."
        canonicalUrl="/tools"
        jsonLd={[jsonLd, breadcrumbJsonLd]}
      />
      <Header />

      <main className="flex-1 w-full">
        {/* Hero */}
        <div className="bg-brand-primary text-white py-12 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl sm:text-4xl font-bold mb-3">Property Calculators</h1>
            <p className="text-lg text-white/75 max-w-2xl mx-auto">
              Free tools to help you make smarter property decisions
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Property Calculators' }]} />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCalculators.map((calc) => (
              <Link
                key={calc.slug}
                to={`/tools/${calc.slug}`}
                className="group bg-base-100 rounded-2xl shadow-sm p-6 flex flex-col gap-4 transition-all duration-200 hover:shadow-lg hover:border-brand-gold border border-transparent"
              >
                <div className="text-brand-gold">
                  {calc.icon}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-brand-primary mb-2 group-hover:text-brand-gold transition-colors">
                    {calc.name}
                  </h2>
                  <p className="text-sm text-content-secondary leading-relaxed">
                    {calc.description}
                  </p>
                </div>
                <div className="mt-auto pt-2">
                  <span className="text-sm font-medium text-brand-gold group-hover:underline">
                    Open calculator →
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {hasHidden && (
            <div className="text-center mt-6">
              <button
                onClick={() => setShowAll(true)}
                className="text-sm text-content-secondary hover:text-brand-gold transition-colors"
              >
                Show all calculators ({calculators.length})
              </button>
            </div>
          )}
          {showAll && (
            <div className="text-center mt-6">
              <button
                onClick={() => setShowAll(false)}
                className="text-sm text-content-secondary hover:text-brand-gold transition-colors"
              >
                Show calculators for my region
              </button>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ToolsIndex;
