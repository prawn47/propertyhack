import React, { useState, useEffect } from 'react';
import { useCountry } from '../../contexts/CountryContext';

const REGION_OPTIONS: Record<string, { code: string; label: string }[]> = {
  AU: [
    { code: 'NSW', label: 'New South Wales' },
    { code: 'VIC', label: 'Victoria' },
    { code: 'QLD', label: 'Queensland' },
    { code: 'WA', label: 'Western Australia' },
    { code: 'SA', label: 'South Australia' },
    { code: 'TAS', label: 'Tasmania' },
    { code: 'ACT', label: 'ACT' },
    { code: 'NT', label: 'Northern Territory' },
  ],
  US: [
    { code: 'NY', label: 'New York' },
    { code: 'CA', label: 'California' },
    { code: 'IL', label: 'Illinois' },
    { code: 'TX', label: 'Texas' },
    { code: 'AZ', label: 'Arizona' },
    { code: 'PA', label: 'Pennsylvania' },
    { code: 'WA', label: 'Washington' },
    { code: 'CO', label: 'Colorado' },
    { code: 'FL', label: 'Florida' },
    { code: 'GA', label: 'Georgia' },
    { code: 'MA', label: 'Massachusetts' },
    { code: 'TN', label: 'Tennessee' },
    { code: 'OR', label: 'Oregon' },
    { code: 'MN', label: 'Minnesota' },
    { code: 'MI', label: 'Michigan' },
  ],
  UK: [
    { code: 'England', label: 'England' },
    { code: 'Scotland', label: 'Scotland' },
    { code: 'Wales', label: 'Wales' },
    { code: 'Northern Ireland', label: 'Northern Ireland' },
  ],
  CA: [
    { code: 'ON', label: 'Ontario' },
    { code: 'BC', label: 'British Columbia' },
    { code: 'QC', label: 'Quebec' },
    { code: 'AB', label: 'Alberta' },
    { code: 'MB', label: 'Manitoba' },
  ],
  NZ: [
    { code: 'Auckland', label: 'Auckland' },
    { code: 'Wellington', label: 'Wellington' },
    { code: 'Canterbury', label: 'Canterbury' },
    { code: 'Waikato', label: 'Waikato' },
    { code: 'Bay of Plenty', label: 'Bay of Plenty' },
    { code: 'Otago', label: 'Otago' },
    { code: "Hawke's Bay", label: "Hawke's Bay" },
    { code: 'Tasman', label: 'Tasman' },
    { code: 'Taranaki', label: 'Taranaki' },
  ],
};

const COUNTRY_OPTIONS = [
  { code: 'AU', label: 'Australia' },
  { code: 'US', label: 'United States' },
  { code: 'UK', label: 'United Kingdom' },
  { code: 'CA', label: 'Canada' },
  { code: 'NZ', label: 'New Zealand' },
];

interface Props {
  variant?: 'inline' | 'footer' | 'card';
}

const SubscribeForm: React.FC<Props> = ({ variant = 'inline' }) => {
  const { country: detectedCountry } = useCountry();

  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState('');
  const [region, setRegion] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const supported = COUNTRY_OPTIONS.find(c => c.code === detectedCountry);
    if (supported) {
      setCountry(supported.code);
      setRegion('');
    }
  }, [detectedCountry]);

  const handleCountryChange = (newCountry: string) => {
    setCountry(newCountry);
    setRegion('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, firstName, country, region }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? 'Subscription failed. Please try again.');
      }
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Subscription failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const regions = REGION_OPTIONS[country] ?? [];
  const successRegion = region || country;

  const inputClass =
    'block w-full px-3 py-2 bg-base-100 border border-base-300 rounded-lg text-sm text-content placeholder-content-secondary focus:outline-none focus:border-brand-gold';

  if (success) {
    if (variant === 'footer') {
      return (
        <p className="text-sm text-brand-gold font-medium">
          You're subscribed! We'll send property news for {successRegion}.
        </p>
      );
    }
    if (variant === 'card') {
      return (
        <div className="bg-base-100 rounded-xl shadow-soft overflow-hidden flex flex-col items-center justify-center h-full p-6">
          <svg className="w-10 h-10 text-brand-gold mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-sm font-medium text-content text-center">
            You're subscribed! We'll send property news for {successRegion}.
          </p>
        </div>
      );
    }
    return (
      <div className="bg-base-200 border-l-4 border-brand-gold rounded-lg p-5">
        <p className="text-sm font-medium text-content">
          You're subscribed! We'll send property news for {successRegion}.
        </p>
      </div>
    );
  }

  if (variant === 'footer') {
    const footerInputClass =
      'block w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-sm text-white placeholder-white/40 focus:outline-none focus:border-brand-gold';

    return (
      <form onSubmit={handleSubmit} className="space-y-2">
        <p className="text-sm text-white/70 font-medium mb-2">Get property news for your area</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            placeholder="First name"
            className={footerInputClass}
          />
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            placeholder="Email address"
            className={footerInputClass}
          />
        </div>
        <div className="flex gap-2">
          <select
            value={country}
            onChange={e => handleCountryChange(e.target.value)}
            className={footerInputClass}
          >
            <option value="">Country</option>
            {COUNTRY_OPTIONS.map(c => (
              <option key={c.code} value={c.code}>{c.label}</option>
            ))}
          </select>
          {regions.length > 0 && (
            <select
              value={region}
              onChange={e => setRegion(e.target.value)}
              className={footerInputClass}
            >
              <option value="">State / Region</option>
              {regions.map(r => (
                <option key={r.code} value={r.code}>{r.label}</option>
              ))}
            </select>
          )}
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 px-4 rounded-lg text-sm font-medium bg-brand-gold text-brand-primary hover:bg-brand-gold/90 transition-colors disabled:opacity-50"
        >
          {loading ? 'Subscribing...' : 'Subscribe'}
        </button>
      </form>
    );
  }

  if (variant === 'card') {
    return (
      <div className="bg-brand-primary rounded-xl shadow-soft overflow-hidden flex flex-col">
        <div className="h-48 flex flex-col items-center justify-center px-4">
          <svg className="w-10 h-10 text-brand-gold mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <h3 className="text-sm font-semibold text-white text-center">
            Get property news for your area
          </h3>
          <p className="text-xs text-white/70 text-center mt-1">
            Weekly updates delivered to your inbox.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="px-4 pb-4 space-y-2 flex-1 flex flex-col">
          <input
            type="text"
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            placeholder="First name"
            className="block w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-sm text-white placeholder-white/40 focus:outline-none focus:border-brand-gold"
          />
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            placeholder="Email address"
            className="block w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-sm text-white placeholder-white/40 focus:outline-none focus:border-brand-gold"
          />
          <select
            value={country}
            onChange={e => handleCountryChange(e.target.value)}
            className="block w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-sm text-white placeholder-white/40 focus:outline-none focus:border-brand-gold"
          >
            <option value="" className="text-brand-primary">Country</option>
            {COUNTRY_OPTIONS.map(c => (
              <option key={c.code} value={c.code} className="text-brand-primary">{c.label}</option>
            ))}
          </select>
          {regions.length > 0 && (
            <select
              value={region}
              onChange={e => setRegion(e.target.value)}
              className="block w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-sm text-white placeholder-white/40 focus:outline-none focus:border-brand-gold"
            >
              <option value="" className="text-brand-primary">State / Region</option>
              {regions.map(r => (
                <option key={r.code} value={r.code} className="text-brand-primary">{r.label}</option>
              ))}
            </select>
          )}
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 rounded-lg text-sm font-medium bg-brand-gold text-brand-primary hover:bg-brand-gold/90 transition-colors disabled:opacity-50 mt-auto"
          >
            {loading ? 'Subscribing...' : 'Subscribe'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="bg-base-200 border-l-4 border-brand-gold rounded-lg p-5">
      <h3 className="text-base font-semibold text-content mb-1">
        Get property news for your area
      </h3>
      <p className="text-sm text-content-secondary mb-4">
        Weekly updates delivered to your inbox.
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-3">
          <input
            type="text"
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            placeholder="First name"
            className={inputClass}
          />
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            placeholder="Email address"
            className={inputClass}
          />
        </div>
        <div className="flex gap-3">
          <select
            value={country}
            onChange={e => handleCountryChange(e.target.value)}
            className={inputClass}
          >
            <option value="">Country</option>
            {COUNTRY_OPTIONS.map(c => (
              <option key={c.code} value={c.code}>{c.label}</option>
            ))}
          </select>
          {regions.length > 0 && (
            <select
              value={region}
              onChange={e => setRegion(e.target.value)}
              className={inputClass}
            >
              <option value="">State / Region</option>
              {regions.map(r => (
                <option key={r.code} value={r.code}>{r.label}</option>
              ))}
            </select>
          )}
        </div>
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 rounded-lg text-sm font-medium bg-brand-gold text-brand-primary hover:bg-brand-gold/90 transition-colors disabled:opacity-50"
        >
          {loading ? 'Subscribing...' : 'Subscribe'}
        </button>
      </form>
    </div>
  );
};

export default SubscribeForm;
