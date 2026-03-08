import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';

const HenrySidebar: React.FC = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  // Hide on admin and auth pages
  const isHidden =
    location.pathname.startsWith('/admin') ||
    location.pathname === '/login' ||
    location.pathname === '/register' ||
    location.pathname.startsWith('/verify-email') ||
    location.pathname.startsWith('/forgot-password') ||
    location.pathname.startsWith('/reset-password') ||
    location.pathname.startsWith('/auth/');

  if (isHidden) return null;

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Ask Henry"
          className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-brand-gold text-brand-primary rounded-full shadow-strong flex items-center justify-center hover:opacity-90 transition-opacity"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </button>
      )}

      {/* Slide-up panel */}
      {open && (
        <div className="fixed bottom-0 right-6 z-40 w-96 max-h-[600px] bg-white rounded-t-xl shadow-strong flex flex-col overflow-hidden border border-gray-200 sm:max-w-sm">
          <div className="flex items-center justify-between px-4 py-3 bg-brand-primary text-white">
            <span className="font-semibold text-brand-gold">Henry</span>
            <button onClick={() => setOpen(false)} aria-label="Close Henry" className="text-white/70 hover:text-white transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center p-8 text-content-secondary text-sm text-center">
            Henry is coming soon. Full chat functionality will be available here.
          </div>
        </div>
      )}
    </>
  );
};

export default HenrySidebar;
