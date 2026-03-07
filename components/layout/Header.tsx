import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

interface HeaderProps {
  onSearch?: (query: string) => void;
}

const Header: React.FC<HeaderProps> = ({ onSearch }) => {
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    if (onSearch) {
      onSearch(q);
    } else {
      navigate(`/?search=${encodeURIComponent(q)}`);
    }
    setMobileSearchOpen(false);
  };

  return (
    <header className="sticky top-0 z-30 bg-brand-primary text-white shadow-medium">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 flex-shrink-0">
          <img src="/ph-logo.jpg" alt="PropertyHack" className="h-8 w-8 rounded-lg" />
          <span className="text-brand-gold font-bold text-lg tracking-tight">PropertyHack</span>
        </Link>

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

        <button
          onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
          className="sm:hidden p-1.5 rounded-lg hover:bg-white/10 transition-colors"
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
      </div>

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
    </header>
  );
};

export default Header;
