import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Header: React.FC = () => {
  const location = useLocation();
  const isAdminPage = location.pathname.startsWith('/admin');

  return (
    <header className="sticky top-0 z-30 bg-brand-primary text-white shadow-medium">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 flex-shrink-0">
          <span className="text-brand-gold font-bold text-lg tracking-tight">PropertyHack</span>
        </Link>

        <div className="flex-1 max-w-xl hidden sm:block">
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
              placeholder="Search property news..."
              className="w-full bg-white/10 border border-white/20 rounded-lg pl-9 pr-4 py-1.5 text-sm text-white placeholder-white/40 focus:outline-none focus:border-brand-gold focus:bg-white/15 transition-colors"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {!isAdminPage && (
            <Link
              to="/login"
              className="text-sm text-white/70 hover:text-brand-gold transition-colors"
            >
              Admin
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
