import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Header from '../layout/Header';
import Footer from '../layout/Footer';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface CalculatorLayoutProps {
  title: string;
  subtitle: string;
  metaTitle: string;
  metaDescription: string;
  jsonLd?: object;
  breadcrumbs: BreadcrumbItem[];
  inputPanel: React.ReactNode;
  resultPanel: React.ReactNode;
  belowFold?: React.ReactNode;
}

const CalculatorLayout: React.FC<CalculatorLayoutProps> = ({
  title,
  subtitle,
  metaTitle,
  metaDescription,
  jsonLd,
  breadcrumbs,
  inputPanel,
  resultPanel,
  belowFold,
}) => {
  return (
    <>
      <Helmet>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDescription} />
        {jsonLd && (
          <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
        )}
      </Helmet>

      <div className="min-h-screen flex flex-col bg-base-200">
        <Header />

        <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-6">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="mb-4">
            <ol className="flex items-center gap-2 text-sm text-content-secondary">
              {breadcrumbs.map((crumb, i) => (
                <li key={i} className="flex items-center gap-2">
                  {i > 0 && (
                    <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                  {crumb.href ? (
                    <Link to={crumb.href} className="hover:text-brand-gold transition-colors">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-content" aria-current="page">{crumb.label}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>

          {/* Page heading */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-brand-primary">{title}</h1>
            <p className="text-sm text-content-secondary mt-1">{subtitle}</p>
          </div>

          {/* Two-column layout: inputs | results */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <div className="bg-base-100 rounded-xl border border-base-300 p-6 flex flex-col gap-4">
              {inputPanel}
            </div>
            <div className="flex flex-col gap-4">
              {resultPanel}
            </div>
          </div>

          {/* Below fold (tables, extra charts, etc.) */}
          {belowFold && (
            <div className="mt-6">
              {belowFold}
            </div>
          )}
        </main>

        <Footer />
      </div>
    </>
  );
};

export default CalculatorLayout;
