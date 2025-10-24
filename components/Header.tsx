import React, { useState, useEffect, useRef } from 'react';

interface HeaderProps {
    profilePictureUrl?: string;
    onNavigate: (view: 'profile' | 'settings') => void;
    onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ profilePictureUrl, onNavigate, onLogout }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const handleNavigation = (view: 'profile' | 'settings') => {
    onNavigate(view);
    setIsDropdownOpen(false);
  }

  return (
    <header className="bg-base-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex-shrink-0">
             <h1 className="text-xl font-bold text-content">QUORD.ai</h1>
          </div>
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
                className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-base-100 ring-1 ring-black ring-opacity-5 focus:outline-none animate-fade-in-up z-50"
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
    </header>
  );
};

export default Header;