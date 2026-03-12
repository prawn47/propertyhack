import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  deleteScenario,
  duplicateScenario,
  listScenarios,
  renameScenario,
  type Scenario,
} from '../../services/scenarioService';

const CALCULATOR_TYPES = [
  { value: '', label: 'All' },
  { value: 'MORTGAGE', label: 'Mortgage' },
  { value: 'STAMP_DUTY', label: 'Stamp Duty' },
  { value: 'RENTAL_YIELD', label: 'Rental Yield' },
  { value: 'BORROWING_POWER', label: 'Borrowing Power' },
  { value: 'RENT_VS_BUY', label: 'Rent vs Buy' },
  { value: 'BUYING_COSTS', label: 'Buying Costs' },
];

const MARKETS = [
  { value: '', label: 'All markets' },
  { value: 'AU', label: '🇦🇺 AU' },
  { value: 'US', label: '🇺🇸 US' },
  { value: 'UK', label: '🇬🇧 UK' },
  { value: 'CA', label: '🇨🇦 CA' },
  { value: 'NZ', label: '🇳🇿 NZ' },
];

const CALCULATOR_ROUTES: Record<string, string> = {
  MORTGAGE: 'mortgage-calculator',
  STAMP_DUTY: 'stamp-duty-calculator',
  RENTAL_YIELD: 'rental-yield-calculator',
  BORROWING_POWER: 'borrowing-power-calculator',
  RENT_VS_BUY: 'rent-vs-buy-calculator',
  BUYING_COSTS: 'buying-costs-calculator',
};

const TYPE_BADGE_CLASSES: Record<string, string> = {
  MORTGAGE: 'bg-blue-100 text-blue-800',
  STAMP_DUTY: 'bg-purple-100 text-purple-800',
  RENTAL_YIELD: 'bg-green-100 text-green-800',
  BORROWING_POWER: 'bg-orange-100 text-orange-800',
  RENT_VS_BUY: 'bg-teal-100 text-teal-800',
  BUYING_COSTS: 'bg-yellow-100 text-yellow-800',
};

function typeLabel(type: string): string {
  return CALCULATOR_TYPES.find((t) => t.value === type)?.label ?? type;
}

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? '' : 's'} ago`;
}

function SkeletonCard() {
  return (
    <div className="bg-base-100 rounded-xl shadow-sm p-5 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="h-5 bg-gray-200 rounded w-3/4" />
        <div className="h-5 w-20 bg-gray-200 rounded-full" />
      </div>
      <div className="h-8 bg-gray-200 rounded w-1/2 mb-3" />
      <div className="h-4 bg-gray-200 rounded w-1/3" />
    </div>
  );
}

interface DeleteModalProps {
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteModal({ name, onConfirm, onCancel }: DeleteModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-base-100 rounded-2xl shadow-xl p-6 max-w-sm w-full">
        <h2 className="text-lg font-semibold text-brand-primary mb-2">Delete scenario</h2>
        <p className="text-sm text-gray-600 mb-6">
          Are you sure you want to delete <span className="font-medium">"{name}"</span>? This cannot
          be undone.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

interface ScenarioCardProps {
  key?: React.Key;
  scenario: Scenario;
  onOpen: () => void;
  onDuplicate: () => void;
  onDeleteRequest: () => void;
  onRename: (newName: string) => void;
}

function ScenarioCard({ scenario, onOpen, onDuplicate, onDeleteRequest, onRename }: ScenarioCardProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(scenario.name);
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = () => {
    setEditValue(scenario.name);
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const commitEdit = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== scenario.name) {
      onRename(trimmed);
    }
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commitEdit();
    if (e.key === 'Escape') setEditing(false);
  };

  const badgeClass = TYPE_BADGE_CLASSES[scenario.calculatorType] ?? 'bg-gray-100 text-gray-700';

  return (
    <div className="bg-base-100 rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={handleKeyDown}
              className="w-full text-sm font-semibold text-brand-primary border border-brand-gold rounded px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
            />
          ) : (
            <button
              onClick={startEdit}
              title="Click to rename"
              className="text-left text-sm font-semibold text-brand-primary hover:text-brand-gold transition-colors truncate block w-full"
            >
              {scenario.name}
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
            {scenario.market || 'AU'}
          </span>
          <span
            className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${badgeClass}`}
          >
            {typeLabel(scenario.calculatorType)}
          </span>
        </div>
      </div>

      <div>
        <div className="text-2xl font-bold text-brand-primary leading-tight">
          {scenario.headlineValue}
        </div>
        <div className="text-xs text-gray-500 mt-0.5">{scenario.headlineLabel}</div>
      </div>

      <div className="text-xs text-gray-400">{relativeDate(scenario.updatedAt)}</div>

      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <button
          onClick={onOpen}
          className="text-xs font-medium text-brand-gold hover:underline"
        >
          Open
        </button>
        <div className="flex items-center gap-1">
          {/* Rename */}
          <button
            onClick={startEdit}
            title="Rename"
            className="p-1.5 rounded-lg text-gray-400 hover:text-brand-primary hover:bg-gray-100 transition-colors"
            aria-label="Rename scenario"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          {/* Duplicate */}
          <button
            onClick={onDuplicate}
            title="Duplicate"
            className="p-1.5 rounded-lg text-gray-400 hover:text-brand-primary hover:bg-gray-100 transition-colors"
            aria-label="Duplicate scenario"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          </button>
          {/* Delete */}
          <button
            onClick={onDeleteRequest}
            title="Delete"
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            aria-label="Delete scenario"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

const ScenarioDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeType, setActiveType] = useState('');
  const [activeMarket, setActiveMarket] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Scenario | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (type: string, market: string, q: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await listScenarios({
        type: type || undefined,
        market: market || undefined,
        search: q || undefined,
      });
      setScenarios(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load scenarios');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(activeType, activeMarket, search);
  }, [load, activeType, activeMarket, search]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchInput(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setSearch(val), 350);
  };

  const handleOpen = (scenario: Scenario) => {
    const route = CALCULATOR_ROUTES[scenario.calculatorType];
    if (route) {
      navigate(`/tools/${route}?scenario=${scenario.id}`);
    }
  };

  const handleDuplicate = async (scenario: Scenario) => {
    try {
      const copy = await duplicateScenario(scenario.id);
      setScenarios((prev) => [copy, ...prev]);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to duplicate');
    }
  };

  const handleRename = async (scenario: Scenario, newName: string) => {
    try {
      const updated = await renameScenario(scenario.id, newName);
      setScenarios((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to rename');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeleteTarget(null);
    try {
      await deleteScenario(id);
      setScenarios((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-brand-primary">Saved Scenarios</h1>
          <p className="text-sm text-gray-500 mt-1">
            Compare and revisit your saved calculator results.
          </p>
        </div>

        {/* Filters + Search */}
        <div className="flex flex-col gap-3 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex flex-wrap gap-2">
              {CALCULATOR_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setActiveType(t.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    activeType === t.value
                      ? 'bg-brand-gold text-white border-brand-gold'
                      : 'bg-base-100 text-gray-600 border-gray-200 hover:border-brand-gold hover:text-brand-gold'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="sm:ml-auto">
              <input
                type="search"
                value={searchInput}
                onChange={handleSearchChange}
                placeholder="Search by name..."
                className="w-full sm:w-56 border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-base-100 focus:outline-none focus:border-brand-gold transition-colors"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {MARKETS.map((m) => (
              <button
                key={m.value}
                onClick={() => setActiveMarket(m.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  activeMarket === m.value
                    ? 'bg-brand-primary text-white border-brand-primary'
                    : 'bg-base-100 text-gray-600 border-gray-200 hover:border-brand-primary hover:text-brand-primary'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : scenarios.length === 0 ? (
          <div className="text-center py-16">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-12 h-12 mx-auto text-gray-300 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2a4 4 0 0 1 4-4h0a4 4 0 0 1 4 4v2M9 7a3 3 0 1 0 6 0 3 3 0 0 0-6 0M3 21h18" />
            </svg>
            <p className="text-gray-500 text-sm max-w-xs mx-auto">
              {search || activeType || activeMarket
                ? 'No scenarios match your filters.'
                : 'No saved scenarios yet. Use our calculators to save and compare different scenarios.'}
            </p>
            {!search && !activeType && !activeMarket && (
              <Link
                to="/tools"
                className="mt-4 inline-block text-sm font-medium text-brand-gold hover:underline"
              >
                Go to calculators
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {scenarios.map((scenario) => (
              <ScenarioCard
                key={scenario.id}
                scenario={scenario}
                onOpen={() => handleOpen(scenario)}
                onDuplicate={() => handleDuplicate(scenario)}
                onDeleteRequest={() => setDeleteTarget(scenario)}
                onRename={(name) => handleRename(scenario, name)}
              />
            ))}
          </div>
        )}
      </div>

      {deleteTarget && (
        <DeleteModal
          name={deleteTarget.name}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </>
  );
};

export default ScenarioDashboard;
