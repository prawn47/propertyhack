import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCountryPath, CountryLink } from '../../hooks/useCountryPath';

interface HeaderProps {
  onSearch?: (query: string) => void;
}

const CALCULATORS = [
  { label: 'Mortgage Calculator', path: '/tools/mortgage-calculator' },
  { label: 'Stamp Duty Calculator', path: '/tools/stamp-duty-calculator' },
  { label: 'Rental Yield Calculator', path: '/tools/rental-yield-calculator' },
  { label: 'Borrowing Power Calculator', path: '/tools/borrowing-power-calculator' },
  { label: 'Rent vs Buy Calculator', path: '/tools/rent-vs-buy-calculator' },
];

const Header: React.FC<HeaderProps> = ({ onSearch }) => {
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [toolsOpen, setToolsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const navigate = useNavigate();
  const countryPath = useCountryPath();

  let auth: ReturnType<typeof useAuth> | null = null;
  try {
    auth = useAuth();
  } catch {
    // AuthProvider not mounted (e.g. in tests or early renders)
  }

  const toolsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) {
        setToolsOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    if (onSearch) {
      onSearch(q);
    } else {
      navigate(`${countryPath('/')}?search=${encodeURIComponent(q)}`);
    }
    setMobileSearchOpen(false);
  };

  const avatarContent = () => {
    if (!auth?.user) return null;
    if (auth.user.avatarUrl) {
      return <img src={auth.user.avatarUrl} alt="avatar" className="h-8 w-8 rounded-full object-cover" />;
    }
    const initial = auth.user.displayName?.[0] ?? auth.user.email[0];
    return (
      <div className="h-8 w-8 rounded-full bg-brand-gold flex items-center justify-center text-brand-primary font-bold text-sm select-none">
        {initial.toUpperCase()}
      </div>
    );
  };

  return (
    <header className="sticky top-0 z-30 bg-brand-primary text-white shadow-medium">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <CountryLink to="/" className="flex items-center gap-2 flex-shrink-0">
          <img src="/ph-logo.jpg" alt="PropertyHack" className="h-8 w-8 rounded-lg" />
          <span className="text-brand-gold font-bold text-lg tracking-tight">PropertyHack</span>
        </CountryLink>

        {/* Desktop search */}
        <form onSubmit={handleSearch} className="flex-1 max-w-xl hidden sm:block">
          <div className="relative">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search property news..."
              className="w-full bg-white/10 border border-white/20 rounded-lg pl-9 pr-4 py-1.5 text-sm text-white placeholder-white/40 focus:outline-none focus:border-brand-gold focus:bg-white/15 transition-colors"
            />
          </div>
        </form>

        {/* Desktop right controls */}
        <div className="hidden sm:flex items-center gap-3">
          {/* Tools dropdown */}
          <div ref={toolsRef} className="relative">
            <button
              onClick={() => setToolsOpen(!toolsOpen)}
              className="text-sm text-white/70 hover:text-brand-gold transition-colors flex items-center gap-1"
            >
              Tools
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {toolsOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-brand-primary border border-white/20 rounded-lg shadow-lg z-50 py-1">
                {CALCULATORS.map((calc) => (
                  <CountryLink
                    key={calc.path}
                    to={calc.path}
                    onClick={() => setToolsOpen(false)}
                    className="block px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    {calc.label}
                  </CountryLink>
                ))}
              </div>
            )}
          </div>

          {/* User menu */}
          {!auth || !auth.isAuthenticated ? (
            <Link to="/login" className="text-sm text-white/70 hover:text-brand-gold transition-colors">
              Sign In
            </Link>
          ) : (
            <div ref={userMenuRef} className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                {avatarContent()}
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-44 bg-brand-primary border border-white/20 rounded-lg shadow-lg z-50 py-1">
                  {auth.isAdmin && (
                    <Link
                      to="/admin"
                      onClick={() => setUserMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      Admin Panel
                    </Link>
                  )}
                  <Link
                    to="/profile"
                    onClick={() => setUserMenuOpen(false)}
                    className="block px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    Profile
                  </Link>
                  <Link
                    to="/profile/scenarios"
                    onClick={() => setUserMenuOpen(false)}
                    className="block px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    Saved Scenarios
                  </Link>
                  <div className="border-t border-white/20 my-1" />
                  <button
                    onClick={() => { auth!.logout(); setUserMenuOpen(false); }}
                    className="block w-full text-left px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mobile icons */}
        <div className="sm:hidden flex items-center gap-2">
          <button
            onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Toggle search"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5 text-white/70"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileToolsOpen(!mobileToolsOpen)}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Toggle menu"
          >
            <svg className="w-5 h-5 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile search */}
      {mobileSearchOpen && (
        <form onSubmit={handleSearch} className="sm:hidden px-4 pb-3">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search property news..."
            autoFocus
            className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:border-brand-gold focus:bg-white/15 transition-colors"
          />
        </form>
      )}

      {/* Mobile menu */}
      {mobileToolsOpen && (
        <div className="sm:hidden px-4 pb-4 border-t border-white/10 pt-3 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Tools</p>
          {CALCULATORS.map((calc) => (
            <CountryLink
              key={calc.path}
              to={calc.path}
              onClick={() => setMobileToolsOpen(false)}
              className="block py-1.5 text-sm text-white/70 hover:text-brand-gold transition-colors"
            >
              {calc.label}
            </CountryLink>
          ))}
          <div className="border-t border-white/10 my-2 pt-2">
            {!auth || !auth.isAuthenticated ? (
              <Link
                to="/login"
                onClick={() => setMobileToolsOpen(false)}
                className="block py-1.5 text-sm text-white/70 hover:text-brand-gold transition-colors"
              >
                Sign In
              </Link>
            ) : (
              <>
                {auth.isAdmin && (
                  <Link
                    to="/admin"
                    onClick={() => setMobileToolsOpen(false)}
                    className="block py-1.5 text-sm text-white/70 hover:text-brand-gold transition-colors"
                  >
                    Admin Panel
                  </Link>
                )}
                <Link
                  to="/profile"
                  onClick={() => setMobileToolsOpen(false)}
                  className="block py-1.5 text-sm text-white/70 hover:text-brand-gold transition-colors"
                >
                  Profile
                </Link>
                <Link
                  to="/profile/scenarios"
                  onClick={() => setMobileToolsOpen(false)}
                  className="block py-1.5 text-sm text-white/70 hover:text-brand-gold transition-colors"
                >
                  Saved Scenarios
                </Link>
                <button
                  onClick={() => { auth!.logout(); setMobileToolsOpen(false); }}
                  className="block py-1.5 text-sm text-white/70 hover:text-brand-gold transition-colors"
                >
                  Sign Out
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
