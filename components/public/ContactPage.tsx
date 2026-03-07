import React from 'react';
import Header from '../layout/Header';
import Footer from '../layout/Footer';
import SeoHead from '../shared/SeoHead';
import Breadcrumbs from '../shared/Breadcrumbs';

const ContactPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-base-200 flex flex-col">
      <SeoHead
        title="Contact PropertyHack"
        description="Get in touch with PropertyHack for questions about our Australian property news coverage."
        canonicalUrl="/contact"
      />
      <Header />

      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Contact' }]} />

        <article className="bg-base-100 rounded-2xl shadow-medium p-6 sm:p-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-brand-primary mb-6">
            Contact Us
          </h1>

          <div className="prose prose-lg max-w-none text-content">
            <p>
              Have a question, suggestion, or want to report an issue with PropertyHack?
              We&apos;d love to hear from you.
            </p>

            <h2 className="text-xl font-semibold text-brand-primary mt-8 mb-3">Get In Touch</h2>
            <p>
              Email us at{' '}
              <a
                href="mailto:hello@propertyhack.com.au"
                className="text-brand-gold hover:underline"
              >
                hello@propertyhack.com.au
              </a>
            </p>

            <h2 className="text-xl font-semibold text-brand-primary mt-8 mb-3">For News Sources</h2>
            <p>
              If you&apos;re a property news publisher and would like your content included
              in PropertyHack, please reach out. We&apos;re always looking to expand our
              coverage across Australian markets.
            </p>

            <h2 className="text-xl font-semibold text-brand-primary mt-8 mb-3">Report an Issue</h2>
            <p>
              Found incorrect information or a broken link? Let us know and we&apos;ll
              address it promptly.
            </p>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
};

export default ContactPage;
