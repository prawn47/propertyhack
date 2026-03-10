import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminFloatingButton() {
  const { isAdmin } = useAuth();
  const location = useLocation();

  if (!isAdmin) return null;
  if (location.pathname.startsWith('/admin')) return null;

  return (
    <Link
      to="/admin"
      className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium shadow-lg transition-opacity hover:opacity-100"
      style={{ backgroundColor: 'rgba(58, 58, 58, 0.85)', color: '#d4b038' }}
      aria-label="Go to admin panel"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-4 w-4"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
          clipRule="evenodd"
        />
      </svg>
      Admin
    </Link>
  );
}
