import React from 'react';

interface PrivacyPolicyProps {
  onBack: () => void;
}

const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <nav className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">Q</span>
                </div>
                <span className="ml-2 text-xl font-semibold text-gray-900">QUORD.ai</span>
              </div>
            </div>
            <button
              onClick={onBack}
              className="text-gray-600 hover:text-brand-primary px-3 py-2 text-sm font-medium transition-colors"
            >
              ← Back
            </button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Privacy Policy</h1>
        <p className="text-sm text-gray-600 mb-8">Last Updated: November 2, 2025</p>

        <div className="prose prose-lg max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
            <p className="text-gray-700 mb-4">
              Welcome to QUORD.ai ("we," "our," or "us"). We are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our LinkedIn content assistant service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Information We Collect</h2>
            
            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">2.1 Information You Provide</h3>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Account information (email address, password)</li>
              <li>Profile information (name, industry, job title)</li>
              <li>LinkedIn account credentials (OAuth tokens)</li>
              <li>Writing samples and preferences</li>
              <li>Content you create or draft through our service</li>
              <li>Communication preferences and settings</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">2.2 Automatically Collected Information</h3>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Usage data and analytics</li>
              <li>Device information and IP addresses</li>
              <li>Browser type and operating system</li>
              <li>Cookies and similar tracking technologies</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. How We Use Your Information</h2>
            <p className="text-gray-700 mb-4">We use the information we collect to:</p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Provide, maintain, and improve our services</li>
              <li>Generate AI-powered content based on your preferences</li>
              <li>Post content to LinkedIn on your behalf (with your authorization)</li>
              <li>Send you daily prompts via email or SMS</li>
              <li>Personalize your experience and learn your writing style</li>
              <li>Communicate with you about service updates and features</li>
              <li>Analyze usage patterns to improve our platform</li>
              <li>Protect against fraud and ensure platform security</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. AI and Content Generation</h2>
            <p className="text-gray-700 mb-4">
              Our service uses artificial intelligence (Google Gemini API and OpenAI) to generate content. Your inputs, writing samples, and preferences are used to train our AI models to match your voice and style. We do not share your specific content with third parties except as necessary to provide the AI generation service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. LinkedIn Integration</h2>
            <p className="text-gray-700 mb-4">
              When you connect your LinkedIn account, we receive an OAuth access token that allows us to post content on your behalf. We only use this access to perform actions you explicitly request, such as publishing or scheduling posts. We do not access or store your LinkedIn connections, messages, or other private data beyond what is necessary to post content.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Information Sharing and Disclosure</h2>
            <p className="text-gray-700 mb-4">We may share your information with:</p>
            
            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">6.1 Service Providers</h3>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Cloud hosting services (for data storage and processing)</li>
              <li>AI providers (Google Gemini, OpenAI for content generation)</li>
              <li>Email service providers (for sending prompts and notifications)</li>
              <li>SMS service providers (for text message prompts)</li>
              <li>Analytics providers (to understand service usage)</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">6.2 Legal Requirements</h3>
            <p className="text-gray-700">
              We may disclose your information if required by law or in response to valid legal requests from authorities.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">6.3 Business Transfers</h3>
            <p className="text-gray-700">
              In the event of a merger, acquisition, or sale of assets, your information may be transferred to the acquiring entity.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Data Security</h2>
            <p className="text-gray-700 mb-4">
              We implement industry-standard security measures to protect your information, including:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Encryption of data in transit and at rest</li>
              <li>Secure authentication using JWT tokens</li>
              <li>Regular security audits and updates</li>
              <li>Access controls and monitoring</li>
            </ul>
            <p className="text-gray-700 mt-4">
              However, no method of transmission over the internet is 100% secure. While we strive to protect your information, we cannot guarantee absolute security.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Data Retention</h2>
            <p className="text-gray-700">
              We retain your personal information for as long as your account is active or as needed to provide you services. You may request deletion of your account and associated data at any time by contacting us at hello@quord.ai.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Your Rights</h2>
            <p className="text-gray-700 mb-4">Depending on your location, you may have the following rights:</p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li><strong>Access:</strong> Request access to your personal information</li>
              <li><strong>Correction:</strong> Request correction of inaccurate information</li>
              <li><strong>Deletion:</strong> Request deletion of your personal information</li>
              <li><strong>Portability:</strong> Request a copy of your data in a portable format</li>
              <li><strong>Objection:</strong> Object to certain processing of your data</li>
              <li><strong>Withdrawal:</strong> Withdraw consent for data processing</li>
            </ul>
            <p className="text-gray-700 mt-4">
              To exercise these rights, please contact us at hello@quord.ai.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Cookies and Tracking</h2>
            <p className="text-gray-700 mb-4">
              We use cookies and similar tracking technologies to enhance your experience, analyze usage, and maintain your session. You can control cookies through your browser settings, but disabling them may limit your ability to use certain features of our service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Children's Privacy</h2>
            <p className="text-gray-700">
              Our service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If you believe we have collected information from a child under 13, please contact us immediately.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. International Data Transfers</h2>
            <p className="text-gray-700">
              Your information may be transferred to and processed in countries other than your country of residence. We ensure appropriate safeguards are in place to protect your information in accordance with this Privacy Policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Changes to This Policy</h2>
            <p className="text-gray-700">
              We may update this Privacy Policy from time to time. We will notify you of significant changes by posting the new policy on this page and updating the "Last Updated" date. Your continued use of the service after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">14. Contact Us</h2>
            <p className="text-gray-700 mb-4">
              If you have questions or concerns about this Privacy Policy or our data practices, please contact us:
            </p>
            <ul className="list-none text-gray-700 space-y-2">
              <li><strong>Email:</strong> hello@quord.ai</li>
              <li><strong>Website:</strong> https://quord.ai</li>
            </ul>
          </section>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-sm text-gray-500">
            © {new Date().getFullYear()} QUORD.ai. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PrivacyPolicy;
