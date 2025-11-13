import React from 'react';

interface PropertyHackHomeProps {
  onAdminClick: () => void;
}

const PropertyHackHome: React.FC<PropertyHackHomeProps> = ({ onAdminClick }) => {
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">PropertyHack</h1>
          <button
            onClick={onAdminClick}
            className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-secondary"
          >
            Admin Login
          </button>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center">
          <h2 className="text-4xl font-bold mb-4">Coming Soon</h2>
          <p className="text-xl text-gray-600">Property insights and analysis</p>
        </div>
      </main>
    </div>
  );
};

export default PropertyHackHome;
