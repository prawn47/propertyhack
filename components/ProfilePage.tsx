import React, { useRef } from 'react';
import type { UserSettings } from '../types';

interface ProfilePageProps {
  settings: UserSettings;
  onProfilePictureChange: (url: string) => void;
  onBack: () => void;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ settings, onProfilePictureChange, onBack }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onProfilePictureChange(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto animate-fade-in-up">
      <div className="bg-base-100 p-6 sm:p-8 rounded-xl shadow-md">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-content">My Profile</h1>
          <button onClick={onBack} className="text-sm font-semibold text-brand-primary hover:text-brand-secondary">
            &larr; Back to Dashboard
          </button>
        </div>

        <div className="space-y-8">
          <fieldset>
            <legend className="text-lg font-semibold text-content border-b border-base-300 pb-2 mb-4">Profile Picture</legend>
            <div className="flex items-center space-x-6">
              <div className="flex-shrink-0">
                {settings.profilePictureUrl ? (
                  <img className="h-24 w-24 rounded-full object-cover" src={settings.profilePictureUrl} alt="Current profile" />
                ) : (
                  <div className="h-24 w-24 rounded-full bg-base-200 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-content-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                )}
              </div>
              <div>
                <button
                  onClick={handleImageUploadClick}
                  className="px-4 py-2 border border-base-300 text-sm font-medium rounded-md shadow-sm text-content bg-base-100 hover:bg-base-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary"
                >
                  Upload New Picture
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                <p className="text-xs text-content-secondary mt-2">PNG, JPG, GIF up to 5MB.</p>
              </div>
            </div>
          </fieldset>
        </div>
        <div className="mt-8 pt-6 border-t border-base-300 flex justify-end">
                <button onClick={onBack} className="px-6 py-2 bg-brand-primary text-white font-semibold rounded-md hover:bg-brand-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-secondary transition-colors">
                    Close
                </button>
            </div>
      </div>
    </main>
  );
};

export default ProfilePage;