import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';

const ProfileLayout: React.FC = () => (
  <div className="min-h-screen bg-base-200 flex flex-col">
    <Header />
    <main className="flex-1">
      <Outlet />
    </main>
    <Footer />
  </div>
);

export default ProfileLayout;
