import React, { useState, useEffect, useRef } from 'react';
import GamificationStats from './GamificationStats';
import { useTheme } from '../contexts/ThemeContext';

interface HeaderProps {
    profilePictureUrl?: string;
    isSuperAdmin?: boolean;
    currentPage?: 'home' | 'drafts' | 'scheduled' | 'published';
    currentView?: 'dashboard' | 'settings' | 'profile' | 'prompts';
    onNavigate: (view: 'profile' | 'settings' | 'prompts') => void;
    onPageChange?: (page: 'home' | 'drafts' | 'scheduled' | 'published') => void;
    onBackToDashboard?: () => void;
    onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ profilePictureUrl, isSuperAdmin, currentPage = 'home', currentView = 'dashboard', onNavigate, onPageChange, onBackToDashboard, onLogout }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleNavigation = (view: 'profile' | 'settings' | 'prompts') => {
    onNavigate(view);
    setIsDropdownOpen(false);
  }

  return (
    <header className="bg-base-100 shadow-soft border-b border-base-300 backdrop-blur-sm bg-opacity-95 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-4">
              <img src="/assets/quord-logo.svg" alt="Quord" className="h-8 w-8" />
              <h1 className="text-xl font-bold text-content">QUORD</h1>
            </div>
            {currentView === 'dashboard' && onPageChange ? (
              <nav className="hidden md:flex space-x-1">
                <button
                  onClick={() => onPageChange('home')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    currentPage === 'home'
                      ? 'bg-gradient-to-r from-brand-primary to-brand-secondary text-white shadow-soft'
                      : 'text-content-secondary hover:text-content hover:bg-base-200'
                  }`}
                >
                  Home
                </button>
                <button
                  onClick={() => onPageChange('drafts')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    currentPage === 'drafts'
                      ? 'bg-gradient-to-r from-brand-primary to-brand-secondary text-white shadow-soft'
                      : 'text-content-secondary hover:text-content hover:bg-base-200'
                  }`}
                >
                  Drafts
                </button>
                <button
                  onClick={() => onPageChange('scheduled')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    currentPage === 'scheduled'
                      ? 'bg-gradient-to-r from-brand-primary to-brand-secondary text-white shadow-soft'
                      : 'text-content-secondary hover:text-content hover:bg-base-200'
                  }`}
                >
                  Scheduled
                </button>
                <button
                  onClick={() => onPageChange('published')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    currentPage === 'published'
                      ? 'bg-gradient-to-r from-brand-primary to-brand-secondary text-white shadow-soft'
                      : 'text-content-secondary hover:text-content hover:bg-base-200'
                  }`}
                >
                  Published
                </button>
              </nav>
            ) : onBackToDashboard && (
              <button
                onClick={onBackToDashboard}
                className="flex items-center space-x-2 text-sm text-content-secondary hover:text-content transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                <span>Back to Dashboard</span>
              </button>
            )}
          </div>
          <div className="flex items-center space-x-4">
            {currentView === 'dashboard' && <GamificationStats />}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-content-secondary hover:text-content hover:bg-base-200 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              )}
            </button>
            <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="p-1 rounded-full text-content-secondary hover:bg-base-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary"
              aria-label="Open user menu"
              aria-haspopup="true"
            >
              {profilePictureUrl ? (
                <img className="h-8 w-8 rounded-full object-cover" src={profilePictureUrl} alt="User profile" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </button>
            {isDropdownOpen && (
              <div 
                className="origin-top-right absolute right-0 mt-2 w-48 rounded-xl shadow-strong py-2 bg-base-100 border border-base-300 focus:outline-none animate-fade-in-up z-50"
                style={{animationDuration: '0.15s'}}
                role="menu"
                aria-orientation="vertical"
              >
                <button
                  onClick={() => handleNavigation('profile')}
                  className="w-full text-left block px-4 py-2 text-sm text-content hover:bg-base-200"
                  role="menuitem"
                >
                  My Profile
                </button>
                <button
                  onClick={() => handleNavigation('settings')}
                  className="w-full text-left block px-4 py-2 text-sm text-content hover:bg-base-200"
                  role="menuitem"
                >
                  Settings
                </button>
                {isSuperAdmin && (
                  <button
                    onClick={() => handleNavigation('prompts')}
                    className="w-full text-left block px-4 py-2 text-sm text-content hover:bg-base-200"
                    role="menuitem"
                  >
                    Prompt Management
                  </button>
                )}
                <div className="border-t border-base-200 my-1"></div>
                <button
                  onClick={onLogout}
                  className="w-full text-left block px-4 py-2 text-sm text-red-600 hover:bg-base-200"
                  role="menuitem"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;