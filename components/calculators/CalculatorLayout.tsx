import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Header from '../layout/Header';
import Footer from '../layout/Footer';

interface BreadcrumbItem {
  label: string;
  path?: string;
  href?: string;
}

interface CalculatorLayoutProps {
  title: string;
  subtitle: string;
  metaTitle?: string;
  metaDescription?: string;
  breadcrumbs: BreadcrumbItem[];
  jsonLd?: object;
  inputs: React.ReactNode;
  results: React.ReactNode;
  footer?: React.ReactNode;
  children?: React.ReactNode;
}

const CalculatorLayout: React.FC<CalculatorLayoutProps> = ({
  title,
  subtitle,
  metaTitle,
  metaDescription,
  breadcrumbs,
  jsonLd,
  inputs,
  results,
  footer,
  children,
}) => {
  return (
    <>
      {(metaTitle || metaDescription) && (
        <Helmet>
          {metaTitle && <title>{metaTitle}</title>}
          {metaDescription && <meta name="description" content={metaDescription} />}
          {jsonLd && (
            <script type="application/ld+json">
              {JSON.stringify(jsonLd)}
            </script>
          )}
        </Helmet>
      )}

      <div className="min-h-screen flex flex-col bg-base-200">
        <Header />

        <main className="flex-1">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* Breadcrumb */}
            <nav aria-label="Breadcrumb" className="mb-5">
              <ol className="flex items-center gap-1.5 text-sm text-content-secondary">
                {breadcrumbs.map((crumb, index) => (
                  <li key={index} className="flex items-center gap-1.5">
                    {index > 0 && (
                      <svg className="w-3.5 h-3.5 text-content-secondary/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                    {(crumb.path || crumb.href) ? (
                      <Link to={(crumb.path || crumb.href)!} className="hover:text-brand-gold transition-colors">
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className="text-content font-medium">{crumb.label}</span>
                    )}
                  </li>
                ))}
              </ol>
            </nav>

            {/* Page heading */}
            <div className="mb-6">
              <h1 className="text-2xl sm:text-3xl font-bold text-brand-primary">{title}</h1>
              <p className="mt-1.5 text-content-secondary">{subtitle}</p>
            </div>

            {/* Two-column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Inputs column */}
              <div className="bg-base-100 rounded-xl shadow-soft p-6 flex flex-col gap-5">
                {inputs}
              </div>

              {/* Results column */}
              <div className="flex flex-col gap-4">
                {results}
              </div>
            </div>

            {/* Footer section (e.g. yearly breakdown table) */}
            {footer && (
              <div className="mt-6 bg-base-100 rounded-xl shadow-soft overflow-hidden">
                {footer}
              </div>
            )}

            {children}
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default CalculatorLayout;
