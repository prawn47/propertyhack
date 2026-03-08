import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../layout/Header';
import Footer from '../layout/Footer';
import SeoHead from '../shared/SeoHead';
import Breadcrumbs from '../shared/Breadcrumbs';

const PrivacyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-base-200 flex flex-col">
      <SeoHead
        title="Privacy Policy — PropertyHack"
        description="Privacy policy for PropertyHack. Learn how we collect, use, and protect your personal information."
        canonicalUrl="/privacy"
      />
      <Header />

      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Privacy Policy' }]} />

        <article className="bg-base-100 rounded-2xl shadow-medium p-6 sm:p-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-brand-primary mb-6">
            Privacy Policy
          </h1>

          <div className="prose prose-lg max-w-none text-content">
            <p className="text-sm text-content/60">Last updated: March 2026</p>

            <p>
              PropertyHack (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) is committed to protecting your privacy.
              This Privacy Policy explains how we collect, use, disclose, and safeguard your
              information when you visit our website. PropertyHack is based in Sydney, Australia
              and operates in compliance with the Australian Privacy Act 1988 (Cth), the Australian
              Privacy Principles (APPs), and applicable international privacy laws including the
              EU General Data Protection Regulation (GDPR) and the UK GDPR.
            </p>

            <h2 className="text-xl font-semibold text-brand-primary mt-8 mb-3">1. Information We Collect</h2>

            <h3 className="text-lg font-medium text-brand-primary mt-4 mb-2">Information you provide</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>Account registration details (name, email address) if you create an account</li>
              <li>Information submitted through our contact form</li>
              <li>Any other information you voluntarily provide to us</li>
            </ul>

            <h3 className="text-lg font-medium text-brand-primary mt-4 mb-2">Information collected automatically</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>Device and browser information (type, operating system, language)</li>
              <li>IP address and approximate location</li>
              <li>Pages viewed, time spent, and navigation patterns</li>
              <li>Referring website or source</li>
            </ul>

            <h2 className="text-xl font-semibold text-brand-primary mt-8 mb-3">2. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Provide, operate, and maintain the Service</li>
              <li>Personalise content based on your location (e.g. showing local property news)</li>
              <li>Respond to enquiries and support requests</li>
              <li>Analyse usage patterns to improve the Service</li>
              <li>Send administrative communications related to your account</li>
              <li>Comply with legal obligations</li>
            </ul>

            <h2 className="text-xl font-semibold text-brand-primary mt-8 mb-3">3. Legal Basis for Processing (GDPR)</h2>
            <p>If you are located in the European Economic Area or the United Kingdom, our legal basis for processing your personal data includes:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Consent</strong> — where you have given clear consent for us to process your data</li>
              <li><strong>Legitimate interests</strong> — to operate and improve the Service</li>
              <li><strong>Contractual necessity</strong> — to provide the Service you have requested</li>
              <li><strong>Legal obligation</strong> — to comply with applicable laws</li>
            </ul>

            <h2 className="text-xl font-semibold text-brand-primary mt-8 mb-3">4. Cookies and Tracking</h2>
            <p>
              We use essential cookies to operate the Service (e.g. authentication tokens). We may
              use analytics tools to understand how visitors use the site. You can control cookies
              through your browser settings.
            </p>

            <h2 className="text-xl font-semibold text-brand-primary mt-8 mb-3">5. Sharing Your Information</h2>
            <p>We do not sell your personal information. We may share your data with:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Service providers</strong> — hosting, analytics, and email providers who assist in operating the Service, under confidentiality agreements</li>
              <li><strong>Legal authorities</strong> — when required by law, regulation, or legal process</li>
              <li><strong>Business transfers</strong> — in connection with a merger, acquisition, or sale of assets</li>
            </ul>

            <h2 className="text-xl font-semibold text-brand-primary mt-8 mb-3">6. Data Retention</h2>
            <p>
              We retain personal information only for as long as necessary to fulfil the purposes
              for which it was collected, or as required by law. Account data is retained while your
              account is active and for a reasonable period thereafter. You may request deletion of
              your data at any time.
            </p>

            <h2 className="text-xl font-semibold text-brand-primary mt-8 mb-3">7. Data Security</h2>
            <p>
              We implement appropriate technical and organisational measures to protect your
              personal information, including encryption in transit (HTTPS), secure password
              hashing, and access controls. However, no method of transmission over the internet
              is 100% secure.
            </p>

            <h2 className="text-xl font-semibold text-brand-primary mt-8 mb-3">8. International Data Transfers</h2>
            <p>
              Your information may be transferred to and processed in countries other than your
              country of residence. Where we transfer data outside of Australia, the EEA, or the UK,
              we ensure appropriate safeguards are in place in accordance with applicable data
              protection laws.
            </p>

            <h2 className="text-xl font-semibold text-brand-primary mt-8 mb-3">9. Your Rights</h2>
            <p>Depending on your location, you may have the right to:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Access the personal information we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Object to or restrict processing of your data</li>
              <li>Request data portability</li>
              <li>Withdraw consent at any time (where processing is based on consent)</li>
              <li>Lodge a complaint with your local data protection authority</li>
            </ul>
            <p>
              Australian residents may contact the Office of the Australian Information Commissioner
              (OAIC) at <a href="https://www.oaic.gov.au" className="text-brand-gold hover:underline" target="_blank" rel="noopener noreferrer">oaic.gov.au</a>.
              EU/UK residents may contact their local supervisory authority.
            </p>

            <h2 className="text-xl font-semibold text-brand-primary mt-8 mb-3">10. Children&apos;s Privacy</h2>
            <p>
              The Service is not directed at individuals under 18. We do not knowingly collect
              personal information from children. If we become aware that we have collected data
              from a child, we will take steps to delete it.
            </p>

            <h2 className="text-xl font-semibold text-brand-primary mt-8 mb-3">11. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Changes will be posted on this
              page with an updated revision date. We encourage you to review this page periodically.
            </p>

            <h2 className="text-xl font-semibold text-brand-primary mt-8 mb-3">12. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy or wish to exercise your privacy
              rights, contact us at{' '}
              <a href="mailto:hello@propertyhack.com" className="text-brand-gold hover:underline">
                hello@propertyhack.com
              </a>
            </p>
            <p className="mt-2">
              PropertyHack<br />
              Sydney, Australia
            </p>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
};

export default PrivacyPage;
