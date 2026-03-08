import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  getProfile,
  updateProfile,
  changePassword,
  toggleNewsletter,
  deleteAccount,
  UserProfile,
} from '../../services/userService';
import { getCategories, getLocations } from '../../services/publicArticleService';

const DATE_RANGE_OPTIONS = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
];

function SectionHeading({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="text-xs font-semibold uppercase tracking-widest text-content-secondary">{label}</span>
      <div className="flex-1 h-px bg-base-300" />
    </div>
  );
}

function InputField({
  label,
  id,
  value,
  onChange,
  type = 'text',
  readOnly = false,
  placeholder,
}: {
  label: string;
  id: string;
  value: string;
  onChange?: (v: string) => void;
  type?: string;
  readOnly?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-content mb-1.5">{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        readOnly={readOnly}
        placeholder={placeholder}
        onChange={e => onChange?.(e.target.value)}
        className={`w-full px-3 py-2 text-sm rounded-lg border border-base-300 focus:outline-none focus:border-brand-gold transition-colors ${
          readOnly
            ? 'bg-base-200 text-content-secondary cursor-not-allowed'
            : 'bg-base-200 text-content'
        }`}
      />
    </div>
  );
}

export default function ProfilePage() {
  const { user, logout, updateProfile: updateAuthProfile } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Account section state
  const [displayName, setDisplayName] = useState('');
  const [nameSaving, setNameSaving] = useState(false);
  const [nameSuccess, setNameSuccess] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  // Password section state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  // Preferences state
  const [locations, setLocations] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [defaultLocation, setDefaultLocation] = useState('');
  const [defaultCategories, setDefaultCategories] = useState<string[]>([]);
  const [defaultDateRange, setDefaultDateRange] = useState('all');
  const [prefSaving, setPrefSaving] = useState(false);
  const [prefSuccess, setPrefSuccess] = useState(false);
  const [prefError, setPrefError] = useState<string | null>(null);

  // Newsletter state
  const [newsletterOptIn, setNewsletterOptIn] = useState(false);
  const [nlSaving, setNlSaving] = useState(false);
  const [nlError, setNlError] = useState<string | null>(null);

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const deleteInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getProfile()
      .then(p => {
        setProfile(p);
        setDisplayName(p.displayName ?? '');
        setNewsletterOptIn(p.newsletterOptIn);
        setDefaultLocation(p.preferences?.defaultLocation ?? '');
        setDefaultCategories(p.preferences?.defaultCategories ?? []);
        setDefaultDateRange(p.preferences?.defaultDateRange ?? 'all');
      })
      .catch(err => setLoadError(err.message));

    getLocations().then(r => setLocations(r.locations)).catch(() => {});
    getCategories().then(r => setCategories(r.categories)).catch(() => {});
  }, []);

  useEffect(() => {
    if (showDeleteModal) {
      setTimeout(() => deleteInputRef.current?.focus(), 50);
    }
  }, [showDeleteModal]);

  async function handleSaveName() {
    setNameSaving(true);
    setNameError(null);
    setNameSuccess(false);
    try {
      const updated = await updateProfile({ displayName });
      setProfile(prev => prev ? { ...prev, displayName: updated.displayName } : prev);
      await updateAuthProfile({ displayName });
      setNameSuccess(true);
      setTimeout(() => setNameSuccess(false), 3000);
    } catch (err: unknown) {
      setNameError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setNameSaving(false);
    }
  }

  async function handleChangePassword() {
    setPwError(null);
    setPwSuccess(false);
    if (newPassword !== confirmPassword) {
      setPwError('New passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      setPwError('New password must be at least 8 characters');
      return;
    }
    setPwSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPwSuccess(true);
      setTimeout(() => setPwSuccess(false), 3000);
    } catch (err: unknown) {
      setPwError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setPwSaving(false);
    }
  }

  async function handleSavePreferences() {
    setPrefSaving(true);
    setPrefError(null);
    setPrefSuccess(false);
    try {
      const updated = await updateProfile({
        preferences: {
          defaultLocation: defaultLocation || undefined,
          defaultCategories,
          defaultDateRange,
        },
      });
      setProfile(prev => prev ? { ...prev, preferences: updated.preferences } : prev);
      await updateAuthProfile({ preferences: updated.preferences });
      setPrefSuccess(true);
      setTimeout(() => setPrefSuccess(false), 3000);
    } catch (err: unknown) {
      setPrefError(err instanceof Error ? err.message : 'Failed to save preferences');
    } finally {
      setPrefSaving(false);
    }
  }

  async function handleNewsletterToggle() {
    const next = !newsletterOptIn;
    setNlSaving(true);
    setNlError(null);
    try {
      await toggleNewsletter(next);
      setNewsletterOptIn(next);
      setProfile(prev => prev ? { ...prev, newsletterOptIn: next } : prev);
    } catch (err: unknown) {
      setNlError(err instanceof Error ? err.message : 'Failed to update newsletter preference');
    } finally {
      setNlSaving(false);
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirmText !== 'DELETE') return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await deleteAccount('DELETE');
      await logout();
      navigate('/', { replace: true });
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete account');
      setDeleteLoading(false);
    }
  }

  function toggleCategory(cat: string) {
    setDefaultCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  }

  const avatarLetter = (profile?.displayName || user?.email || '?')[0].toUpperCase();
  const hasPassword = profile && !profile.googleId;

  if (loadError) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{loadError}</p>
          <button onClick={() => window.location.reload()} className="text-sm text-brand-gold underline">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-brand-primary mb-8">Profile</h1>

        {/* Avatar + identity */}
        <div className="flex items-center gap-4 mb-8">
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt="Avatar"
              className="w-16 h-16 rounded-full object-cover border-2 border-base-300"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-brand-primary flex items-center justify-center text-2xl font-bold text-brand-gold select-none">
              {avatarLetter}
            </div>
          )}
          <div>
            <p className="text-lg font-semibold text-brand-primary">
              {profile.displayName || profile.email}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-content-secondary">{profile.email}</span>
              {profile.emailVerified ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Verified
                </span>
              ) : (
                <span className="text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                  Unverified
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Account section */}
        <div className="bg-base-100 rounded-xl shadow-soft p-6 mb-4">
          <SectionHeading label="Account" />
          <div className="space-y-4">
            <div>
              <InputField
                label="Display Name"
                id="displayName"
                value={displayName}
                onChange={setDisplayName}
                placeholder="Your name"
              />
              <div className="flex items-center gap-3 mt-2">
                <button
                  onClick={handleSaveName}
                  disabled={nameSaving || displayName === (profile.displayName ?? '')}
                  className="px-4 py-1.5 text-sm font-medium bg-brand-gold text-brand-primary rounded-lg hover:bg-brand-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {nameSaving ? 'Saving…' : 'Save Name'}
                </button>
                {nameSuccess && <span className="text-sm text-green-600">Saved!</span>}
                {nameError && <span className="text-sm text-red-500">{nameError}</span>}
              </div>
            </div>

            <InputField
              label="Email"
              id="email"
              value={profile.email}
              readOnly
            />
          </div>
        </div>

        {/* Change Password (email/password users only) */}
        {hasPassword && (
          <div className="bg-base-100 rounded-xl shadow-soft p-6 mb-4">
            <SectionHeading label="Change Password" />
            <div className="space-y-3">
              <InputField
                label="Current Password"
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={setCurrentPassword}
                placeholder="••••••••"
              />
              <InputField
                label="New Password"
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={setNewPassword}
                placeholder="Min 8 characters"
              />
              <InputField
                label="Confirm New Password"
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="Repeat new password"
              />
              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={handleChangePassword}
                  disabled={pwSaving || !currentPassword || !newPassword || !confirmPassword}
                  className="px-4 py-1.5 text-sm font-medium bg-brand-gold text-brand-primary rounded-lg hover:bg-brand-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {pwSaving ? 'Saving…' : 'Update Password'}
                </button>
                {pwSuccess && <span className="text-sm text-green-600">Password updated!</span>}
                {pwError && <span className="text-sm text-red-500">{pwError}</span>}
              </div>
            </div>
          </div>
        )}

        {/* News Preferences */}
        <div className="bg-base-100 rounded-xl shadow-soft p-6 mb-4">
          <SectionHeading label="News Preferences" />
          <div className="space-y-5">
            {/* Default Location */}
            <div>
              <label htmlFor="defaultLocation" className="block text-sm font-medium text-content mb-1.5">
                Default Location
              </label>
              <select
                id="defaultLocation"
                value={defaultLocation}
                onChange={e => setDefaultLocation(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-base-200 border border-base-300 rounded-lg text-content focus:outline-none focus:border-brand-gold transition-colors"
              >
                <option value="">All Locations</option>
                {locations.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            {/* Default Categories */}
            <div>
              <p className="text-sm font-medium text-content mb-2">Default Categories</p>
              <div className="grid grid-cols-2 gap-2">
                {categories.map(cat => (
                  <label key={cat} className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={defaultCategories.includes(cat)}
                      onChange={() => toggleCategory(cat)}
                      className="w-4 h-4 rounded border-base-300 text-brand-gold accent-brand-gold cursor-pointer"
                    />
                    <span className="text-sm text-content group-hover:text-brand-primary transition-colors">{cat}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Default Date Range */}
            <div>
              <label htmlFor="defaultDateRange" className="block text-sm font-medium text-content mb-1.5">
                Default Date Range
              </label>
              <select
                id="defaultDateRange"
                value={defaultDateRange}
                onChange={e => setDefaultDateRange(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-base-200 border border-base-300 rounded-lg text-content focus:outline-none focus:border-brand-gold transition-colors"
              >
                {DATE_RANGE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={handleSavePreferences}
                disabled={prefSaving}
                className="px-4 py-1.5 text-sm font-medium bg-brand-gold text-brand-primary rounded-lg hover:bg-brand-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {prefSaving ? 'Saving…' : 'Save Preferences'}
              </button>
              {prefSuccess && <span className="text-sm text-green-600">Preferences saved!</span>}
              {prefError && <span className="text-sm text-red-500">{prefError}</span>}
            </div>
          </div>
        </div>

        {/* Newsletter */}
        <div className="bg-base-100 rounded-xl shadow-soft p-6 mb-4">
          <SectionHeading label="Newsletter" />
          <label className="flex items-center gap-3 cursor-pointer">
            <button
              role="switch"
              aria-checked={newsletterOptIn}
              onClick={handleNewsletterToggle}
              disabled={nlSaving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-2 disabled:opacity-50 ${
                newsletterOptIn ? 'bg-brand-gold' : 'bg-base-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-soft transition-transform ${
                  newsletterOptIn ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-sm text-content">Subscribe to PropertyHack newsletter</span>
          </label>
          {nlError && <p className="mt-2 text-sm text-red-500">{nlError}</p>}
        </div>

        {/* Saved Scenarios */}
        <div className="bg-base-100 rounded-xl shadow-soft p-6 mb-4">
          <SectionHeading label="Saved Scenarios" />
          <div className="flex items-center justify-between">
            <p className="text-sm text-content-secondary">
              {profile.scenarioCount} {profile.scenarioCount === 1 ? 'scenario' : 'scenarios'} saved
            </p>
            <Link
              to="/profile/scenarios"
              className="text-sm font-medium text-brand-gold hover:text-brand-gold/80 transition-colors"
            >
              View All Scenarios →
            </Link>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-base-100 rounded-xl shadow-soft p-6 border-2 border-red-100">
          <SectionHeading label="Danger Zone" />
          <p className="text-sm text-content-secondary mb-4">
            Permanently delete your account and all saved data. This action cannot be undone.
          </p>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-4 py-2 text-sm font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
          >
            Delete My Account
          </button>
        </div>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-primary/60 backdrop-blur-sm">
          <div className="bg-base-100 rounded-2xl shadow-strong w-full max-w-md p-6 animate-fade-in-up">
            <h2 className="text-lg font-bold text-brand-primary mb-2">Delete Account</h2>
            <p className="text-sm text-content-secondary mb-4">
              This will permanently delete your account, all saved scenarios, and preferences. You will be
              unsubscribed from the newsletter. This action <strong className="text-content">cannot be undone</strong>.
            </p>
            <div className="mb-4">
              <label htmlFor="deleteConfirm" className="block text-sm font-medium text-content mb-1.5">
                Type <span className="font-mono font-bold text-red-500">DELETE</span> to confirm
              </label>
              <input
                ref={deleteInputRef}
                id="deleteConfirm"
                type="text"
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full px-3 py-2 text-sm bg-base-200 border border-base-300 rounded-lg focus:outline-none focus:border-red-400 transition-colors"
              />
            </div>
            {deleteError && <p className="mb-3 text-sm text-red-500">{deleteError}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText('');
                  setDeleteError(null);
                }}
                className="flex-1 px-4 py-2 text-sm font-medium border border-base-300 rounded-lg hover:bg-base-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== 'DELETE' || deleteLoading}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleteLoading ? 'Deleting…' : 'Delete My Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
