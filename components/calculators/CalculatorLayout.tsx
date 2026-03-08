import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../layout/Header';
import Footer from '../layout/Footer';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface CalculatorLayoutProps {
  title: string;
  subtitle: string;
  breadcrumbs: BreadcrumbItem[];
  inputs: React.ReactNode;
  results: React.ReactNode;
  footer?: React.ReactNode;
  children?: React.ReactNode;
}

const CalculatorLayout: React.FC<CalculatorLayoutProps> = ({
  title,
  subtitle,
  breadcrumbs,
  inputs,
  results,
  footer,
  children,
}) => {
  return (
    <div className="min-h-screen flex flex-col bg-base-200">
      <Header />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6 md:py-10">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6">
          <ol className="flex items-center gap-1.5 text-sm text-content-secondary">
            {breadcrumbs.map((crumb, idx) => (
              <li key={idx} className="flex items-center gap-1.5">
                {idx > 0 && (
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
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-brand-primary mb-2">{title}</h1>
          <p className="text-content-secondary">{subtitle}</p>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Left: inputs */}
          <div className="bg-base-100 rounded-2xl border border-base-300 p-6 flex flex-col gap-5">
            {inputs}
          </div>

          {/* Right: results */}
          <div className="flex flex-col gap-5">
            {results}
          </div>
        </div>

        {/* Optional footer content (e.g. expandable table) */}
        {footer && (
          <div className="mt-8">
            {footer}
          </div>
        )}

        {children}
      </main>

      <Footer />
    </div>
  );
};

export default CalculatorLayout;
