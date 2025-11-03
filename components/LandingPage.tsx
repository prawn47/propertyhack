import React, { useState } from 'react';

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
  onPrivacy?: () => void;
  onTerms?: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onLogin, onPrivacy, onTerms }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setMobileMenuOpen(false);
  };

  return (
    <div className="bg-white font-sans min-h-screen">
      {/* Navigation */}
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

            {/* Desktop Navigation */}
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-8">
                <button 
                  onClick={() => scrollToSection('features')} 
                  className="text-gray-600 hover:text-brand-primary px-3 py-2 text-sm font-medium transition-colors"
                >
                  Features
                </button>
                <button 
                  onClick={() => scrollToSection('how-it-works')} 
                  className="text-gray-600 hover:text-brand-primary px-3 py-2 text-sm font-medium transition-colors"
                >
                  How It Works
                </button>
                <button 
                  onClick={() => scrollToSection('pricing')} 
                  className="text-gray-600 hover:text-brand-primary px-3 py-2 text-sm font-medium transition-colors"
                >
                  Pricing
                </button>
                <button 
                  onClick={onLogin}
                  className="text-gray-600 hover:text-brand-primary px-3 py-2 text-sm font-medium transition-colors"
                >
                  Login
                </button>
                <button 
                  onClick={onGetStarted}
                  className="bg-brand-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-secondary transition-colors"
                >
                  Start Free Trial
                </button>
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-gray-600 hover:text-brand-primary"
              >
                {mobileMenuOpen ? (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden">
              <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t border-gray-100">
                <button 
                  onClick={() => scrollToSection('features')} 
                  className="text-gray-600 hover:text-brand-primary block px-3 py-2 text-base font-medium w-full text-left"
                >
                  Features
                </button>
                <button 
                  onClick={() => scrollToSection('how-it-works')} 
                  className="text-gray-600 hover:text-brand-primary block px-3 py-2 text-base font-medium w-full text-left"
                >
                  How It Works
                </button>
                <button 
                  onClick={() => scrollToSection('pricing')} 
                  className="text-gray-600 hover:text-brand-primary block px-3 py-2 text-base font-medium w-full text-left"
                >
                  Pricing
                </button>
                <button 
                  onClick={onLogin}
                  className="text-gray-600 hover:text-brand-primary block px-3 py-2 text-base font-medium w-full text-left"
                >
                  Login
                </button>
                <button 
                  onClick={onGetStarted}
                  className="bg-brand-primary text-white block px-3 py-2 rounded-lg text-base font-medium hover:bg-brand-secondary transition-colors text-center w-full"
                >
                  Start Free Trial
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[#1DB68D] via-[#159A75] to-[#0F7D5D] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Turn Quick Ideas Into<br />
              <span className="text-green-200">Polished LinkedIn Posts</span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-green-100 max-w-3xl mx-auto">
              Reply to our daily prompts via email or SMS, and get AI-crafted LinkedIn posts that match your voice and tone. Post directly or edit first.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button 
                onClick={onGetStarted}
                className="bg-white text-[#1DB68D] px-8 py-3 rounded-lg font-semibold text-lg hover:bg-gray-50 transition-colors shadow-lg"
              >
                Start 30-Day Free Trial
              </button>
              <button 
                className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold text-lg hover:bg-white hover:text-[#1DB68D] transition-colors bg-transparent"
                onClick={() => scrollToSection('how-it-works')}
              >
                Watch Demo
              </button>
            </div>
            <p className="text-green-200 text-sm mt-4">No credit card required • 3 minutes setup</p>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-gray-600 text-sm font-medium mb-8">Trusted by 2,500+ professionals from:</p>
            <div className="flex justify-center items-center space-x-12 opacity-60 flex-wrap gap-4">
              <div className="text-gray-400 font-semibold text-lg">Microsoft</div>
              <div className="text-gray-400 font-semibold text-lg">Google</div>
              <div className="text-gray-400 font-semibold text-lg">Apple</div>
              <div className="text-gray-400 font-semibold text-lg">Meta</div>
              <div className="text-gray-400 font-semibold text-lg">Amazon</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything you need for consistent LinkedIn presence
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              From idea to published post in under 60 seconds. Our AI learns your voice and creates content that sounds authentically you.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="border border-gray-100 rounded-lg p-8 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Email & SMS Prompts</h3>
              <p className="text-gray-600">Receive daily prompts via your preferred channel. Simply reply with your quick thoughts or ideas.</p>
            </div>

            {/* Feature 2 */}
            <div className="border border-gray-100 rounded-lg p-8 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">AI Content Generation</h3>
              <p className="text-gray-600">Advanced AI transforms your ideas into polished posts that match your industry, tone, and personal brand.</p>
            </div>

            {/* Feature 3 */}
            <div className="border border-gray-100 rounded-lg p-8 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Voice Personalization</h3>
              <p className="text-gray-600">Upload writing samples so our AI learns your unique voice, ensuring every post sounds authentically you.</p>
            </div>

            {/* Feature 4 */}
            <div className="border border-gray-100 rounded-lg p-8 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Draft Editor</h3>
              <p className="text-gray-600">Review and refine your posts in our beautiful mobile-optimized editor before publishing to LinkedIn.</p>
            </div>

            {/* Feature 5 */}
            <div className="border border-gray-100 rounded-lg p-8 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">AI Image Generation</h3>
              <p className="text-gray-600">Create eye-catching visuals with DALL-E integration, or upload your own images for maximum impact.</p>
            </div>

            {/* Feature 6 */}
            <div className="border border-gray-100 rounded-lg p-8 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">One-Click Publishing</h3>
              <p className="text-gray-600">Seamlessly publish directly to LinkedIn with our secure OAuth integration. No copy-pasting required.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              From idea to LinkedIn post in 3 simple steps
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Set up once, then just reply to our prompts. We handle the rest.
            </p>
          </div>

          <div className="relative">
            <div className="hidden md:block absolute top-20 left-1/2 transform -translate-x-1/2 w-full h-1 bg-gradient-to-r from-[#1DB68D] via-blue-600 to-purple-600 opacity-20"></div>
            
            <div className="grid md:grid-cols-3 gap-12 relative">
              {/* Step 1 */}
              <div className="text-center">
                <div className="w-16 h-16 bg-brand-primary rounded-full flex items-center justify-center mx-auto mb-6 relative z-10">
                  <span className="text-white font-bold text-xl">1</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Setup Your Voice</h3>
                <p className="text-gray-600">Tell us about your industry, tone, and upload a few writing samples. Our AI learns your unique style in minutes.</p>
              </div>

              {/* Step 2 */}
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 relative z-10">
                  <span className="text-white font-bold text-xl">2</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Reply to Prompts</h3>
                <p className="text-gray-600">Receive daily prompts via email or SMS. Just reply with your quick thoughts - a sentence or two is enough.</p>
              </div>

              {/* Step 3 */}
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 relative z-10">
                  <span className="text-white font-bold text-xl">3</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Edit & Publish</h3>
                <p className="text-gray-600">Get a polished draft via email. Edit if needed, then publish directly to LinkedIn with one click.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              What our users are saying
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Testimonial 1 */}
            <div className="bg-white border border-gray-200 rounded-lg p-8">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gray-300 rounded-full mr-4 flex items-center justify-center">
                  <span className="text-gray-600 font-semibold">SC</span>
                </div>
                <div>
                  <div className="font-semibold text-gray-900">Sarah Chen</div>
                  <div className="text-sm text-gray-600">Product Manager, Google</div>
                </div>
              </div>
              <div className="flex mb-3">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-gray-600 italic">"QUORD transformed my LinkedIn presence. I went from posting once a month to 3x per week, and my engagement has tripled. The AI really captures my voice."</p>
            </div>

            {/* Testimonial 2 */}
            <div className="bg-white border border-gray-200 rounded-lg p-8">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gray-300 rounded-full mr-4 flex items-center justify-center">
                  <span className="text-gray-600 font-semibold">MJ</span>
                </div>
                <div>
                  <div className="font-semibold text-gray-900">Marcus Johnson</div>
                  <div className="text-sm text-gray-600">Engineering Lead, Microsoft</div>
                </div>
              </div>
              <div className="flex mb-3">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-gray-600 italic">"As someone who hates social media, QUORD makes it painless. I just reply to prompts during my commute and get professional posts. Game-changer."</p>
            </div>

            {/* Testimonial 3 */}
            <div className="bg-white border border-gray-200 rounded-lg p-8">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gray-300 rounded-full mr-4 flex items-center justify-center">
                  <span className="text-gray-600 font-semibold">ER</span>
                </div>
                <div>
                  <div className="font-semibold text-gray-900">Elena Rodriguez</div>
                  <div className="text-sm text-gray-600">Startup Founder</div>
                </div>
              </div>
              <div className="flex mb-3">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-gray-600 italic">"The time savings are incredible. What used to take me 30 minutes per post now takes 2 minutes. I can focus on building my business instead of crafting content."</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-xl text-gray-600">Start free, upgrade when you're ready. Cancel anytime.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free Plan */}
            <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Free Trial</h3>
              <div className="text-3xl font-bold text-gray-900 mb-1">$0</div>
              <div className="text-gray-600 text-sm mb-6">30 days</div>
              <button 
                onClick={onGetStarted}
                className="w-full border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 mb-8"
              >
                Start Free Trial
              </button>
              <ul className="space-y-3 text-left">
                <li className="flex items-center">
                  <svg className="w-5 h-5 text-brand-primary mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-600">Up to 10 posts</span>
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 text-brand-primary mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-600">Email & SMS prompts</span>
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 text-brand-primary mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-600">AI content generation</span>
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 text-brand-primary mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-600">LinkedIn publishing</span>
                </li>
              </ul>
            </div>

            {/* Pro Plan */}
            <div className="bg-brand-primary text-white relative transform scale-105 shadow-xl rounded-lg">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-yellow-400 text-gray-900 px-4 py-1 rounded-full text-sm font-semibold">
                Most Popular
              </div>
              <div className="p-8 text-center">
                <h3 className="text-xl font-semibold mb-2">Professional</h3>
                <div className="text-3xl font-bold mb-1">$49</div>
                <div className="text-green-200 text-sm mb-6">per month</div>
                <button 
                  onClick={onGetStarted}
                  className="w-full bg-white text-brand-primary hover:bg-gray-50 mb-8 px-4 py-2 rounded-lg"
                >
                  Start Professional
                </button>
                <ul className="space-y-3 text-left">
                  <li className="flex items-center">
                    <svg className="w-5 h-5 text-green-200 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Unlimited posts</span>
                  </li>
                  <li className="flex items-center">
                    <svg className="w-5 h-5 text-green-200 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>AI image generation</span>
                  </li>
                  <li className="flex items-center">
                    <svg className="w-5 h-5 text-green-200 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Voice personalization</span>
                  </li>
                  <li className="flex items-center">
                    <svg className="w-5 h-5 text-green-200 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Priority support</span>
                  </li>
                  <li className="flex items-center">
                    <svg className="w-5 h-5 text-green-200 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Advanced analytics</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Enterprise</h3>
              <div className="text-2xl font-bold text-gray-900 mb-1">Custom</div>
              <div className="text-gray-600 text-sm mb-6">Talk to sales</div>
              <a
                href="mailto:hello@quord.ai?subject=Enterprise%20Inquiry"
                className="w-full bg-brand-primary text-white hover:bg-brand-secondary mb-8 px-4 py-2 rounded-lg inline-block"
              >
                Contact Sales
              </a>
              <ul className="space-y-3 text-left">
                <li className="flex items-center">
                  <svg className="w-5 h-5 text-brand-primary mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-600">Everything in Pro</span>
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 text-brand-primary mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-600">Team collaboration</span>
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 text-brand-primary mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-600">Custom branding</span>
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 text-brand-primary mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-600">SSO integration</span>
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 text-brand-primary mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-600">Dedicated support</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-br from-[#1DB68D] via-[#159A75] to-[#0F7D5D] text-white py-20">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to transform your LinkedIn presence?
          </h2>
          <p className="text-xl text-green-100 mb-8">
            Join 2,500+ professionals who use QUORD to maintain consistent, engaging LinkedIn content without the time investment.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={onGetStarted}
              className="bg-white text-[#1DB68D] px-8 py-3 rounded-lg font-semibold text-lg hover:bg-gray-50 transition-colors shadow-lg"
            >
              Start 30-Day Free Trial
            </button>
            <button 
              className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold text-lg hover:bg-white hover:text-[#1DB68D] transition-colors bg-transparent"
              onClick={() => scrollToSection('how-it-works')}
            >
              Book a Demo
            </button>
          </div>
          <p className="text-green-200 text-sm mt-4">Setup takes less than 3 minutes • No credit card required</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">Q</span>
              </div>
              <span className="text-xl font-bold text-gray-900">QUORD.ai</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <button 
                onClick={onPrivacy}
                className="hover:text-gray-700"
              >
                Privacy Policy
              </button>
              <button 
                onClick={onTerms}
                className="hover:text-gray-700"
              >
                Terms & Conditions
              </button>
              <a className="hover:text-gray-700" href="mailto:hello@quord.ai">Contact</a>
            </div>
          </div>
          <div className="mt-4 text-center text-sm text-gray-500">
            © {new Date().getFullYear()} QUORD.ai. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
