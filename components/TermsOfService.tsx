import React from 'react';

interface TermsOfServiceProps {
  onBack: () => void;
}

const TermsOfService: React.FC<TermsOfServiceProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <nav className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">PH</span>
                </div>
                <span className="ml-2 text-xl font-semibold text-gray-900">PropertyHack</span>
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
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Terms of Service</h1>
        <p className="text-sm text-gray-600 mb-8">Last Updated: November 2, 2025</p>

        <div className="prose prose-lg max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Agreement to Terms</h2>
            <p className="text-gray-700 mb-4">
              By accessing or using PropertyHack ("Service," "we," "our," or "us"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not access or use the Service.
            </p>
            <p className="text-gray-700">
              These Terms constitute a legally binding agreement between you and PropertyHack. We reserve the right to modify these Terms at any time, and your continued use of the Service constitutes acceptance of any changes.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Description of Service</h2>
            <p className="text-gray-700 mb-4">
              PropertyHack is a LinkedIn content assistant that uses artificial intelligence to help users create, manage, and publish professional content. Our Service includes:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>AI-powered content generation</li>
              <li>Daily prompts delivered via email or SMS</li>
              <li>Content drafting and editing tools</li>
              <li>LinkedIn integration for direct publishing</li>
              <li>Scheduled post management</li>
              <li>Voice and tone personalization</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Account Registration and Security</h2>
            
            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">3.1 Account Creation</h3>
            <p className="text-gray-700 mb-4">
              To use the Service, you must create an account by providing accurate and complete information. You must be at least 13 years old to create an account.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">3.2 Account Security</h3>
            <p className="text-gray-700 mb-4">
              You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Use a strong, unique password</li>
              <li>Not share your account credentials with others</li>
              <li>Notify us immediately of any unauthorized access</li>
              <li>Log out of your account when using shared devices</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Acceptable Use</h2>
            <p className="text-gray-700 mb-4">You agree not to use the Service to:</p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Violate any laws or regulations</li>
              <li>Infringe on the intellectual property rights of others</li>
              <li>Generate or publish harmful, offensive, or illegal content</li>
              <li>Spread misinformation or engage in fraudulent activities</li>
              <li>Spam, harass, or abuse other users or third parties</li>
              <li>Attempt to gain unauthorized access to our systems or networks</li>
              <li>Use automated systems (bots) to access the Service without permission</li>
              <li>Reverse engineer, decompile, or disassemble any part of the Service</li>
              <li>Violate LinkedIn's terms of service or community guidelines</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. LinkedIn Integration</h2>
            <p className="text-gray-700 mb-4">
              When you connect your LinkedIn account to our Service, you authorize us to post content on your behalf. You acknowledge that:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>You remain responsible for all content posted to your LinkedIn profile</li>
              <li>You must comply with LinkedIn's terms of service and policies</li>
              <li>We are not responsible for LinkedIn's actions, including account restrictions or suspensions</li>
              <li>You can revoke our access to your LinkedIn account at any time through LinkedIn's settings</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. AI-Generated Content</h2>
            
            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">6.1 Content Ownership</h3>
            <p className="text-gray-700 mb-4">
              You retain all rights to the content you create using our Service. However, you grant us a worldwide, non-exclusive license to use, process, and store your content solely for the purpose of providing the Service.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">6.2 AI Limitations</h3>
            <p className="text-gray-700 mb-4">
              AI-generated content is provided "as is" without warranties. You acknowledge that:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>AI may occasionally generate inaccurate or inappropriate content</li>
              <li>You are responsible for reviewing and approving all content before publishing</li>
              <li>We are not liable for any consequences resulting from AI-generated content</li>
              <li>AI models may have limitations and biases</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Subscription and Payments</h2>
            
            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">7.1 Free Trial</h3>
            <p className="text-gray-700 mb-4">
              New users receive a 30-day free trial with limited features. No credit card is required for the trial period.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">7.2 Paid Subscriptions</h3>
            <p className="text-gray-700 mb-4">
              Paid subscription plans are billed on a monthly or annual basis. By subscribing, you authorize us to charge your payment method:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Subscription fees are non-refundable except as required by law</li>
              <li>Prices are subject to change with 30 days' notice</li>
              <li>Subscriptions automatically renew unless canceled</li>
              <li>You can cancel your subscription at any time through your account settings</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">7.3 Cancellation</h3>
            <p className="text-gray-700">
              You may cancel your subscription at any time. Upon cancellation, you will retain access to paid features until the end of your current billing period. No refunds will be provided for partial subscription periods.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Intellectual Property</h2>
            
            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">8.1 Our Intellectual Property</h3>
            <p className="text-gray-700 mb-4">
              The Service, including its design, features, code, and content (excluding user-generated content), is owned by PropertyHack and protected by intellectual property laws. You may not:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Copy, modify, or distribute our proprietary content</li>
              <li>Use our trademarks or branding without permission</li>
              <li>Create derivative works based on the Service</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">8.2 User Content</h3>
            <p className="text-gray-700">
              You represent and warrant that you have all necessary rights to the content you upload or create using the Service, and that your content does not infringe on third-party rights.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Disclaimers and Limitations of Liability</h2>
            
            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">9.1 Service "As Is"</h3>
            <p className="text-gray-700 mb-4">
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">9.2 Limitation of Liability</h3>
            <p className="text-gray-700 mb-4">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, PropertyHack.AI SHALL NOT BE LIABLE FOR:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Any indirect, incidental, special, consequential, or punitive damages</li>
              <li>Loss of profits, data, or business opportunities</li>
              <li>Service interruptions or errors</li>
              <li>Actions taken by third parties (including LinkedIn)</li>
              <li>AI-generated content or user decisions based on such content</li>
            </ul>
            <p className="text-gray-700 mt-4">
              Our total liability for all claims related to the Service shall not exceed the amount you paid us in the 12 months preceding the claim.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Indemnification</h2>
            <p className="text-gray-700">
              You agree to indemnify, defend, and hold harmless PropertyHack and its officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses (including legal fees) arising from:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2 mt-4">
              <li>Your use of the Service</li>
              <li>Your violation of these Terms</li>
              <li>Your content or its publication on LinkedIn or other platforms</li>
              <li>Your violation of any third-party rights</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Termination</h2>
            
            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">11.1 Termination by You</h3>
            <p className="text-gray-700 mb-4">
              You may terminate your account at any time by contacting us at hello@propertyhack.com or through your account settings.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">11.2 Termination by Us</h3>
            <p className="text-gray-700 mb-4">
              We may suspend or terminate your account at any time, with or without notice, if:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>You violate these Terms</li>
              <li>Your use of the Service poses a security or legal risk</li>
              <li>Your account has been inactive for an extended period</li>
              <li>We discontinue the Service</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">11.3 Effect of Termination</h3>
            <p className="text-gray-700">
              Upon termination, your right to use the Service will immediately cease. We may delete your account and data in accordance with our data retention policies. Provisions of these Terms that by their nature should survive termination will survive, including ownership provisions, disclaimers, and limitations of liability.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Privacy</h2>
            <p className="text-gray-700">
              Your use of the Service is subject to our Privacy Policy, which is incorporated into these Terms by reference. Please review our Privacy Policy to understand how we collect, use, and protect your information.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Dispute Resolution</h2>
            
            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">13.1 Informal Resolution</h3>
            <p className="text-gray-700 mb-4">
              If you have a dispute with us, please contact us at hello@propertyhack.com to attempt to resolve it informally before pursuing legal action.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">13.2 Governing Law</h3>
            <p className="text-gray-700 mb-4">
              These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which PropertyHack operates, without regard to conflict of law principles.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">13.3 Arbitration</h3>
            <p className="text-gray-700">
              Any disputes arising from these Terms or the Service shall be resolved through binding arbitration rather than in court, except that you may assert claims in small claims court if they qualify.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">14. General Provisions</h2>
            
            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">14.1 Entire Agreement</h3>
            <p className="text-gray-700 mb-4">
              These Terms, together with our Privacy Policy, constitute the entire agreement between you and PropertyHack regarding the Service.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">14.2 Severability</h3>
            <p className="text-gray-700 mb-4">
              If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions will remain in full force and effect.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">14.3 Waiver</h3>
            <p className="text-gray-700 mb-4">
              Our failure to enforce any right or provision of these Terms will not constitute a waiver of such right or provision.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">14.4 Assignment</h3>
            <p className="text-gray-700">
              You may not assign or transfer these Terms or your account without our written consent. We may assign these Terms without restriction.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">15. Changes to Terms</h2>
            <p className="text-gray-700">
              We reserve the right to modify these Terms at any time. We will notify you of material changes by posting the updated Terms on this page and updating the "Last Updated" date. Your continued use of the Service after changes constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">16. Contact Information</h2>
            <p className="text-gray-700 mb-4">
              If you have questions about these Terms, please contact us:
            </p>
            <ul className="list-none text-gray-700 space-y-2">
              <li><strong>Email:</strong> hello@propertyhack.com</li>
              <li><strong>Website:</strong> https://propertyhack.com</li>
            </ul>
          </section>

          <section className="mb-8 border-t pt-8">
            <p className="text-gray-600 italic">
              By using PropertyHack, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
            </p>
          </section>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-sm text-gray-500">
            © {new Date().getFullYear()} PropertyHack. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default TermsOfService;
