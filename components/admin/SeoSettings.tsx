import React, { useEffect, useState } from 'react';
import {
  getKeywords, createKeyword, updateKeyword, deleteKeyword,
  getLocationSeoList, updateLocationSeo,
  type SeoKeyword, type LocationSeo,
} from '../../services/adminSeoService';
import Loader from '../Loader';

type Tab = 'keywords' | 'locations';

const SeoSettings: React.FC = () => {
  const [tab, setTab] = useState<Tab>('keywords');

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-primary mb-6">SEO Settings</h1>

      <div className="flex gap-1 mb-6 border-b border-base-300">
        {(['keywords', 'locations'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? 'border-brand-gold text-brand-gold'
                : 'border-transparent text-content-secondary hover:text-brand-primary'
            }`}
          >
            {t === 'keywords' ? 'Focus Keywords' : 'Location Pages'}
          </button>
        ))}
      </div>

      {tab === 'keywords' && <KeywordsTab />}
      {tab === 'locations' && <LocationsTab />}
    </div>
  );
};

// ===== Keywords Tab =====

const JURISDICTIONS = ['AU', 'NZ', 'UK', 'US', 'CA'] as const;
type Jurisdiction = typeof JURISDICTIONS[number];

function KeywordsTab() {
  const [keywords, setKeywords] = useState<SeoKeyword[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [jurisdiction, setJurisdiction] = useState<Jurisdiction>('AU');

  const loadKeywords = async () => {
    setLoading(true);
    try {
      const params: { market?: string; location?: string } = { market: jurisdiction };
      if (filterLocation) params.location = filterLocation;
      const data = await getKeywords(params);
      setKeywords(data.keywords);
    } catch (err) {
      console.error('Failed to load keywords:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    setFilterLocation('');
    loadKeywords();
  }, [jurisdiction]);

  useEffect(() => { loadKeywords(); }, [filterLocation]);

  const handleAdd = async () => {
    if (!newKeyword.trim()) return;
    try {
      await createKeyword({
        keyword: newKeyword.trim(),
        market: jurisdiction,
        location: newLocation || null,
        category: newCategory || null,
      });
      setNewKeyword('');
      setNewLocation('');
      setNewCategory('');
      setShowAdd(false);
      loadKeywords();
    } catch (err) {
      console.error('Failed to create keyword:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteKeyword(id);
      loadKeywords();
    } catch (err) {
      console.error('Failed to delete keyword:', err);
    }
  };

  const handleToggle = async (kw: SeoKeyword) => {
    try {
      await updateKeyword(kw.id, { isActive: !kw.isActive });
      loadKeywords();
    } catch (err) {
      console.error('Failed to toggle keyword:', err);
    }
  };

  const locations = [...new Set(keywords.map(k => k.location).filter(Boolean))] as string[];

  if (loading) return <div className="flex justify-center py-8"><Loader className="h-8 w-8 text-brand-primary" /></div>;

  return (
    <div>
      <div className="flex gap-1 mb-4 border-b border-base-300">
        {JURISDICTIONS.map((j) => (
          <button
            key={j}
            onClick={() => setJurisdiction(j)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              jurisdiction === j
                ? 'border-brand-gold text-brand-gold'
                : 'border-transparent text-content-secondary hover:text-brand-primary'
            }`}
          >
            {j}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <select
            value={filterLocation}
            onChange={(e) => setFilterLocation(e.target.value)}
            className="text-sm border border-base-300 rounded-lg px-3 py-1.5"
          >
            <option value="">All locations</option>
            {locations.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <span className="text-sm text-content-secondary">{keywords.length} keywords</span>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="px-4 py-2 bg-brand-gold text-brand-primary font-semibold rounded-lg text-sm hover:bg-brand-gold/90"
        >
          + Add Keyword
        </button>
      </div>

      {showAdd && (
        <div className="bg-base-100 rounded-lg border border-base-300 p-4 mb-4 flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs font-medium text-content-secondary block mb-1">Keyword</label>
            <input
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              placeholder="e.g. sydney property market"
              className="border border-base-300 rounded-lg px-3 py-1.5 text-sm w-64"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-content-secondary block mb-1">Location</label>
            <input
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
              placeholder="e.g. Sydney (optional)"
              className="border border-base-300 rounded-lg px-3 py-1.5 text-sm w-40"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-content-secondary block mb-1">Category</label>
            <input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="optional"
              className="border border-base-300 rounded-lg px-3 py-1.5 text-sm w-40"
            />
          </div>
          <button
            onClick={handleAdd}
            className="px-4 py-1.5 bg-brand-gold text-brand-primary font-semibold rounded-lg text-sm hover:bg-brand-gold/90"
          >
            Save
          </button>
        </div>
      )}

      <div className="bg-base-100 rounded-lg border border-base-300 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-base-200">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-content-secondary">Keyword</th>
              <th className="px-4 py-2 text-left font-medium text-content-secondary">Location</th>
              <th className="px-4 py-2 text-left font-medium text-content-secondary">Category</th>
              <th className="px-4 py-2 text-center font-medium text-content-secondary">Active</th>
              <th className="px-4 py-2 text-center font-medium text-content-secondary">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-base-300">
            {keywords.map((kw) => (
              <tr key={kw.id} className={kw.isActive ? '' : 'opacity-50'}>
                <td className="px-4 py-2 font-medium">{kw.keyword}</td>
                <td className="px-4 py-2 text-content-secondary">{kw.location || '—'}</td>
                <td className="px-4 py-2 text-content-secondary">{kw.category || '—'}</td>
                <td className="px-4 py-2 text-center">
                  <button
                    onClick={() => handleToggle(kw)}
                    className={`w-8 h-5 rounded-full transition-colors ${kw.isActive ? 'bg-brand-gold' : 'bg-base-300'}`}
                  >
                    <span className={`block w-3.5 h-3.5 bg-white rounded-full transform transition-transform ${kw.isActive ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
                  </button>
                </td>
                <td className="px-4 py-2 text-center">
                  <button
                    onClick={() => handleDelete(kw.id)}
                    className="text-red-500 hover:text-red-700 text-xs"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {keywords.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-content-secondary">No {jurisdiction} keywords yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ===== Locations Tab =====

function LocationsTab() {
  const [locations, setLocations] = useState<LocationSeo[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<LocationSeo>>({});

  const loadLocations = async () => {
    setLoading(true);
    try {
      const data = await getLocationSeoList();
      setLocations(data.locations);
    } catch (err) {
      console.error('Failed to load locations:', err);
    }
    setLoading(false);
  };

  useEffect(() => { loadLocations(); }, []);

  const startEdit = (loc: LocationSeo) => {
    setEditing(loc.id);
    setEditData({
      metaTitle: loc.metaTitle,
      metaDescription: loc.metaDescription,
      h1Title: loc.h1Title,
      introContent: loc.introContent || '',
      focusKeywords: loc.focusKeywords,
    });
  };

  const handleSave = async () => {
    if (!editing) return;
    try {
      await updateLocationSeo(editing, editData);
      setEditing(null);
      loadLocations();
    } catch (err) {
      console.error('Failed to update location:', err);
    }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader className="h-8 w-8 text-brand-primary" /></div>;

  return (
    <div className="space-y-4">
      {locations.length === 0 && (
        <p className="text-content-secondary text-sm">No location SEO configs yet. Run the seed script to populate defaults.</p>
      )}

      {locations.map((loc) => (
        <div key={loc.id} className="bg-base-100 rounded-lg border border-base-300 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-brand-primary">{loc.location}</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-content-secondary">/property-news/{loc.slug}</span>
              {editing !== loc.id ? (
                <button
                  onClick={() => startEdit(loc)}
                  className="px-3 py-1 text-xs font-medium bg-brand-gold/10 text-brand-primary border border-brand-gold/30 rounded hover:bg-brand-gold/20"
                >
                  Edit
                </button>
              ) : (
                <div className="flex gap-1">
                  <button
                    onClick={handleSave}
                    className="px-3 py-1 text-xs font-medium bg-brand-gold text-brand-primary rounded hover:bg-brand-gold/90"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditing(null)}
                    className="px-3 py-1 text-xs font-medium text-content-secondary border border-base-300 rounded hover:bg-base-200"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>

          {editing === loc.id ? (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-content-secondary block mb-1">Meta Title</label>
                <input
                  value={editData.metaTitle || ''}
                  onChange={(e) => setEditData({ ...editData, metaTitle: e.target.value })}
                  className="w-full border border-base-300 rounded-lg px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-content-secondary block mb-1">Meta Description</label>
                <textarea
                  value={editData.metaDescription || ''}
                  onChange={(e) => setEditData({ ...editData, metaDescription: e.target.value })}
                  rows={2}
                  className="w-full border border-base-300 rounded-lg px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-content-secondary block mb-1">H1 Title</label>
                <input
                  value={editData.h1Title || ''}
                  onChange={(e) => setEditData({ ...editData, h1Title: e.target.value })}
                  className="w-full border border-base-300 rounded-lg px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-content-secondary block mb-1">Intro Content (shown on location page)</label>
                <textarea
                  value={editData.introContent || ''}
                  onChange={(e) => setEditData({ ...editData, introContent: e.target.value })}
                  rows={3}
                  className="w-full border border-base-300 rounded-lg px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-content-secondary block mb-1">Focus Keywords (comma-separated)</label>
                <input
                  value={(editData.focusKeywords || []).join(', ')}
                  onChange={(e) => setEditData({ ...editData, focusKeywords: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                  className="w-full border border-base-300 rounded-lg px-3 py-1.5 text-sm"
                  placeholder="sydney property market, sydney house prices"
                />
              </div>
            </div>
          ) : (
            <div className="text-sm text-content-secondary space-y-1">
              <p><span className="font-medium">Title:</span> {loc.metaTitle}</p>
              <p><span className="font-medium">H1:</span> {loc.h1Title}</p>
              <p className="truncate"><span className="font-medium">Description:</span> {loc.metaDescription}</p>
              {loc.focusKeywords.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {loc.focusKeywords.map((kw, i) => (
                    <span key={i} className="px-2 py-0.5 bg-brand-gold/10 text-brand-primary rounded text-xs">
                      {kw}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default SeoSettings;
