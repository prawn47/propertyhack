import React, { useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Footer: React.FC = () => {
  const year = new Date().getFullYear();
  const navigate = useNavigate();
  const clickTimestamps = useRef<number[]>([]);

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
    <footer className="bg-brand-primary text-white/50 py-6 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
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
          <Link to="/privacy" className="hover:text-white transition-colors">
            Privacy
          </Link>
          <Link to="/terms" className="hover:text-white transition-colors">
            Terms
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
