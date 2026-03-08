import React, { useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCountryDetection } from '../../hooks/useCountryDetection';

const Footer: React.FC = () => {
  const year = new Date().getFullYear();
  const navigate = useNavigate();
  const clickTimestamps = useRef<number[]>([]);
  const { country } = useCountryDetection();
  const isAU = country === 'AU';

  const handleLogoClick = useCallback(() => {
    const now = Date.now();
    clickTimestamps.current = clickTimestamps.current.filter(t => now - t < 2000);
    clickTimestamps.current.push(now);
    if (clickTimestamps.current.length >= 3) {
      clickTimestamps.current = [];
      navigate('/login');
    }
  }, [navigate]);

  return (
    <footer className="bg-brand-primary text-white/50 py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Location links for SEO — AU only */}
        {isAU && (
          <div className="mb-6 pb-6 border-b border-white/10">
            <h3 className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-3">Property News by Location</h3>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {[
                { slug: 'sydney', name: 'Sydney' },
                { slug: 'melbourne', name: 'Melbourne' },
                { slug: 'brisbane', name: 'Brisbane' },
                { slug: 'perth', name: 'Perth' },
                { slug: 'adelaide', name: 'Adelaide' },
                { slug: 'canberra', name: 'Canberra' },
                { slug: 'hobart', name: 'Hobart' },
                { slug: 'darwin', name: 'Darwin' },
                { slug: 'gold-coast', name: 'Gold Coast' },
              ].map((loc) => (
                <Link
                  key={loc.slug}
                  to={`/property-news/${loc.slug}`}
                  className="text-sm text-white/40 hover:text-brand-gold transition-colors"
                >
                  {loc.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Tools links for SEO */}
        <div className="mb-6 pb-6 border-b border-white/10">
          <h3 className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-3">Property Tools</h3>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {[
              { path: '/tools/mortgage-calculator', name: 'Mortgage Calculator' },
              { path: '/tools/stamp-duty-calculator', name: 'Stamp Duty Calculator' },
              { path: '/tools/rental-yield-calculator', name: 'Rental Yield Calculator' },
              { path: '/tools/borrowing-power-calculator', name: 'Borrowing Power Calculator' },
              { path: '/tools/rent-vs-buy-calculator', name: 'Rent vs Buy Calculator' },
            ].map((tool) => (
              <Link
                key={tool.path}
                to={tool.path}
                className="text-sm text-white/40 hover:text-brand-gold transition-colors"
              >
                {tool.name}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
          <span className="flex items-center gap-2">
            <img
              src="/ph-logo.jpg"
              alt="PropertyHack"
              className="h-6 w-6 rounded cursor-pointer select-none"
              onClick={handleLogoClick}
              draggable={false}
            />
            <span className="text-white/70 font-medium">PropertyHack</span>
            {' '}&copy; {year}
          </span>
          <div className="flex items-center gap-4">
            <Link to="/about" className="hover:text-white transition-colors">
              About
            </Link>
            <Link to="/contact" className="hover:text-white transition-colors">
              Contact
            </Link>
            <Link to="/terms" className="hover:text-white transition-colors">
              Terms
            </Link>
            <Link to="/privacy" className="hover:text-white transition-colors">
              Privacy
            </Link>
            <a href="/feed.xml" className="hover:text-white transition-colors" rel="alternate" type="application/rss+xml">
              RSS
            </a>
          </div>
        </div>

        {isAU && (
          <p className="mt-6 text-center text-xs text-white/30 leading-relaxed max-w-2xl mx-auto">
            Property Hack acknowledges the Traditional Custodians of the lands on which we work and pays respect to their Elders past and present.
          </p>
        )}
      </div>
    </footer>
  );
};

export default Footer;
