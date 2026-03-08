import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../layout/Header';
import Footer from '../layout/Footer';
import SeoHead from '../shared/SeoHead';
import Breadcrumbs from '../shared/Breadcrumbs';

const TermsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-base-200 flex flex-col">
      <SeoHead
        title="Terms of Use — PropertyHack"
        description="Terms and conditions for using PropertyHack, an Australian property news aggregation platform."
        canonicalUrl="/terms"
      />
      <Header />

      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Terms of Use' }]} />

        <article className="bg-base-100 rounded-2xl shadow-medium p-6 sm:p-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-brand-primary mb-6">
            Terms of Use
          </h1>

          <div className="prose prose-lg max-w-none text-content">
            <p className="text-sm text-content/60">Last updated: March 2026</p>

            <p>
              These Terms of Use (&quot;Terms&quot;) govern your access to and use of the PropertyHack
              website and services (the &quot;Service&quot;), operated by PropertyHack, based in Sydney,
              Australia. By accessing the Service, you agree to be bound by these Terms.
            </p>

            <h2 className="text-xl font-semibold text-brand-primary mt-8 mb-3">1. About the Service</h2>
            <p>
              PropertyHack is a property news aggregation platform. We collect, summarise, and
              present property market news from third-party sources. We do not create original
              reporting. AI-generated summaries are provided for convenience and link back to
              original sources.
            </p>

            <h2 className="text-xl font-semibold text-brand-primary mt-8 mb-3">2. Eligibility</h2>
            <p>
              You must be at least 18 years old to use the Service. By using the Service, you
              represent that you meet this requirement.
            </p>

            <h2 className="text-xl font-semibold text-brand-primary mt-8 mb-3">3. Use of the Service</h2>
            <p>You agree to use the Service only for lawful purposes. You must not:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Use automated systems (bots, scrapers) to access the Service without permission</li>
              <li>Attempt to interfere with or disrupt the Service</li>
              <li>Reproduce, redistribute, or republish content from the Service without authorisation</li>
              <li>Use the Service in any way that violates applicable local, state, national, or international law</li>
            </ul>

            <h2 className="text-xl font-semibold text-brand-primary mt-8 mb-3">4. Intellectual Property</h2>
            <p>
              The PropertyHack name, logo, website design, and AI-generated summaries are the
              property of PropertyHack. Original news articles linked from the Service remain the
              intellectual property of their respective publishers.
            </p>

            <h2 className="text-xl font-semibold text-brand-primary mt-8 mb-3">5. Disclaimer</h2>
            <p>
              The Service is provided &quot;as is&quot; without warranties of any kind, either express or
              implied. PropertyHack does not guarantee the accuracy, completeness, or timeliness
              of any content. Content on the Service does not constitute financial, legal, or
              professional advice. You should seek independent professional advice before making
              property or financial decisions.
            </p>

            <h2 className="text-xl font-semibold text-brand-primary mt-8 mb-3">6. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, including the Australian Consumer Law,
              PropertyHack shall not be liable for any indirect, incidental, special, consequential,
              or punitive damages arising from your use of the Service.
            </p>

            <h2 className="text-xl font-semibold text-brand-primary mt-8 mb-3">7. Third-Party Links</h2>
            <p>
              The Service contains links to third-party websites. PropertyHack is not responsible
              for the content, accuracy, or practices of third-party sites.
            </p>

            <h2 className="text-xl font-semibold text-brand-primary mt-8 mb-3">8. Account Terms</h2>
            <p>
              If you create an account, you are responsible for maintaining the confidentiality of
              your login credentials and for all activities under your account. You must notify us
              immediately of any unauthorised use.
            </p>

            <h2 className="text-xl font-semibold text-brand-primary mt-8 mb-3">9. Termination</h2>
            <p>
              We may suspend or terminate your access to the Service at any time, without notice,
              for conduct that we determine violates these Terms or is harmful to other users or
              the Service.
            </p>

            <h2 className="text-xl font-semibold text-brand-primary mt-8 mb-3">10. Governing Law</h2>
            <p>
              These Terms are governed by the laws of New South Wales, Australia. Any disputes
              arising from these Terms shall be subject to the exclusive jurisdiction of the courts
              of New South Wales.
            </p>

            <h2 className="text-xl font-semibold text-brand-primary mt-8 mb-3">11. Changes to Terms</h2>
            <p>
              We may update these Terms from time to time. Changes will be posted on this page
              with an updated revision date. Continued use of the Service after changes constitutes
              acceptance of the revised Terms.
            </p>

            <h2 className="text-xl font-semibold text-brand-primary mt-8 mb-3">12. Contact</h2>
            <p>
              If you have questions about these Terms, contact us at{' '}
              <a href="mailto:hello@propertyhack.com" className="text-brand-gold hover:underline">
                hello@propertyhack.com
              </a>
            </p>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
};

export default TermsPage;
