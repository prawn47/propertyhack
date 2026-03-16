import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../layout/Header';
import Footer from '../layout/Footer';
import SeoHead from '../shared/SeoHead';
import Breadcrumbs from '../shared/Breadcrumbs';

const AboutPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-base-200 flex flex-col">
      <SeoHead
        title="About PropertyHack"
        description="PropertyHack delivers agenda-free property news across Australia, New Zealand, the UK, US, and Canada. Learn about our editorial approach and how we curate property market coverage."
        canonicalUrl="/about"
      />
      <Header />

      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'About' }]} />

        <article className="bg-base-100 rounded-2xl shadow-medium p-6 sm:p-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-brand-primary mb-6">
            About PropertyHack
          </h1>

          <div className="prose prose-lg max-w-none text-content">
            <p>
              PropertyHack is an independent property news platform that aggregates
              and summarises the most important property market stories from trusted sources
              across Australia, New Zealand, the United Kingdom, the United States, and Canada.
            </p>

            <h2 className="text-xl font-semibold text-brand-primary mt-8 mb-3">Our Mission</h2>
            <p>
              We believe property news should be accessible, agenda-free, and easy to digest.
              PropertyHack cuts through the noise to deliver the stories that matter — whether
              you&apos;re a homeowner, investor, first-home buyer, or just keeping an eye on
              the market.
            </p>

            <h2 className="text-xl font-semibold text-brand-primary mt-8 mb-3">How It Works</h2>
            <p>
              We collect property news from dozens of reputable sources in each market including
              major media outlets, industry publications, and government announcements. Each
              article is summarised using AI to give you the key facts quickly, with a link
              to the original source for the full story.
            </p>

            <h2 className="text-xl font-semibold text-brand-primary mt-8 mb-3">Editorial Standards</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>We do not create original reporting — we aggregate and summarise from published sources</li>
              <li>Every article links back to its original source for verification</li>
              <li>We do not accept paid placements or sponsored content in our news feed</li>
              <li>AI-generated summaries are clearly identified as summaries, not original content</li>
            </ul>

            <h2 className="text-xl font-semibold text-brand-primary mt-8 mb-3">Coverage</h2>
            <p>
              PropertyHack covers property market news across five markets: Australia, New Zealand,
              the UK, the US, and Canada. Our coverage includes market updates, price movements,
              interest rate impacts, government policy, auction results, rental market trends,
              and development news.
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-base-300">
            <Link
              to="/contact"
              className="text-brand-gold hover:underline font-medium"
            >
              Get in touch →
            </Link>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
};

export default AboutPage;
