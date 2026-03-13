import React, { useState, useEffect, useCallback } from 'react';
import {
  listKeys,
  createKey,
  revokeKey,
  AgentApiKey,
  AgentApiKeyWithPlainKey,
  CreateKeyPayload,
} from '../../services/adminAgentService';
import LoadingSpinner from '../shared/LoadingSpinner';
import EmptyState from '../shared/EmptyState';

const ALL_SCOPES = [
  'newsletters:read',
  'newsletters:write',
  'newsletters:generate',
  'newsletters:approve',
  'newsletters:send',
  'prompts:read',
  'prompts:write',
  'config:read',
  'config:write',
] as const;

const SCOPE_COLORS: Record<string, string> = {
  newsletters: 'bg-blue-100 text-blue-700',
  prompts: 'bg-purple-100 text-purple-700',
  config: 'bg-amber-100 text-amber-700',
};

function getScopeColor(scope: string): string {
  const prefix = scope.split(':')[0];
  return SCOPE_COLORS[prefix] || 'bg-gray-100 text-gray-600';
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function formatExpiry(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const d = new Date(dateStr);
  if (d.getTime() < Date.now()) return 'Expired';
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

// --- Create Key Modal ---

interface CreateModalProps {
  onClose: () => void;
  onCreated: (key: AgentApiKeyWithPlainKey) => void;
}

const CreateKeyModal: React.FC<CreateModalProps> = ({ onClose, onCreated }) => {
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<Set<string>>(new Set());
  const [expiresAt, setExpiresAt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleScope = (scope: string) => {
    setScopes(prev => {
      const next = new Set(prev);
      if (next.has(scope)) next.delete(scope);
      else next.add(scope);
      return next;
    });
  };

  const selectAll = () => setScopes(new Set(ALL_SCOPES));
  const selectNone = () => setScopes(new Set());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (scopes.size === 0) { setError('Select at least one scope'); return; }
    setSubmitting(true);
    setError(null);
    try {
      const payload: CreateKeyPayload = { name: name.trim(), scopes: Array.from(scopes) };
      if (expiresAt) payload.expiresAt = new Date(expiresAt).toISOString();
      const result = await createKey(payload);
      onCreated(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create key');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-base-100 rounded-lg shadow-strong w-full max-w-lg mx-4 animate-fade-in" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-base-300">
          <h2 className="text-lg font-semibold text-content">Create API Key</h2>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-content mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Claude Agent"
              required
              className="w-full px-3 py-2 border border-base-300 rounded text-sm focus:outline-none focus:border-brand-gold"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-content">Scopes</label>
              <div className="flex gap-2 text-xs">
                <button type="button" onClick={selectAll} className="text-brand-gold hover:underline">All</button>
                <button type="button" onClick={selectNone} className="text-content-secondary hover:underline">None</button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {ALL_SCOPES.map(scope => (
                <label key={scope} className="flex items-center gap-2 text-sm text-content cursor-pointer">
                  <input
                    type="checkbox"
                    checked={scopes.has(scope)}
                    onChange={() => toggleScope(scope)}
                    className="rounded border-base-300 accent-brand-gold"
                  />
                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${getScopeColor(scope)}`}>{scope}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-content mb-1">Expiry (optional)</label>
            <input
              type="date"
              value={expiresAt}
              onChange={e => setExpiresAt(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-base-300 rounded text-sm focus:outline-none focus:border-brand-gold"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-base-300 rounded hover:border-brand-gold">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="px-4 py-2 text-sm bg-brand-gold text-brand-primary rounded font-medium hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? 'Creating…' : 'Create Key'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- Key Reveal Modal ---

interface RevealModalProps {
  keyData: AgentApiKeyWithPlainKey;
  onClose: () => void;
}

const KeyRevealModal: React.FC<RevealModalProps> = ({ keyData, onClose }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(keyData.plainKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = keyData.plainKey;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-base-100 rounded-lg shadow-strong w-full max-w-lg mx-4 animate-fade-in">
        <div className="px-5 py-4 border-b border-base-300">
          <h2 className="text-lg font-semibold text-content">API Key Created</h2>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="bg-amber-50 border border-amber-300 text-amber-800 px-4 py-3 rounded text-sm font-medium">
            This key will only be shown once. Copy it now and store it securely.
          </div>
          <div>
            <label className="block text-sm font-medium text-content mb-1">Key name</label>
            <p className="text-sm text-content-secondary">{keyData.name}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-content mb-1">API Key</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-base-200 px-3 py-2 rounded text-sm font-mono text-content break-all select-all">
                {keyData.plainKey}
              </code>
              <button
                onClick={handleCopy}
                className="shrink-0 px-3 py-2 text-sm bg-brand-gold text-brand-primary rounded font-medium hover:opacity-90"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm bg-brand-primary text-base-100 rounded font-medium hover:opacity-90"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main Component ---

const AgentApiKeys: React.FC = () => {
  const [keys, setKeys] = useState<AgentApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [revealKey, setRevealKey] = useState<AgentApiKeyWithPlainKey | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listKeys();
      setKeys(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load API keys');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRevoke = async (key: AgentApiKey) => {
    if (!confirm(`Revoke API key "${key.name}"? This cannot be undone.`)) return;
    setRevokingId(key.id);
    setError(null);
    try {
      await revokeKey(key.id);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to revoke key');
    } finally {
      setRevokingId(null);
    }
  };

  const handleCreated = (newKey: AgentApiKeyWithPlainKey) => {
    setShowCreate(false);
    setRevealKey(newKey);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-semibold text-content">Agent API Keys</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-brand-gold text-brand-primary rounded font-medium hover:opacity-90"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create API Key
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">{error}</div>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : keys.length === 0 ? (
        <EmptyState
          title="No API keys"
          message="Create an API key to allow AI agents to access the newsletter system programmatically."
        />
      ) : (
        <div className="bg-base-100 rounded border border-base-300 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-base-200 border-b border-base-300">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-content-secondary">Name</th>
                <th className="px-3 py-2 text-left font-medium text-content-secondary">Prefix</th>
                <th className="px-3 py-2 text-left font-medium text-content-secondary">Scopes</th>
                <th className="px-3 py-2 text-left font-medium text-content-secondary">Last Used</th>
                <th className="px-3 py-2 text-left font-medium text-content-secondary">Expires</th>
                <th className="px-3 py-2 text-left font-medium text-content-secondary">Status</th>
                <th className="px-3 py-2 text-left font-medium text-content-secondary">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-base-300">
              {keys.map(key => {
                const isExpired = key.expiresAt && new Date(key.expiresAt).getTime() < Date.now();
                const isActive = key.isActive && !isExpired;
                return (
                  <tr key={key.id} className="hover:bg-base-200/50">
                    <td className="px-3 py-2.5">
                      <span className="font-medium text-content">{key.name}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <code className="text-xs bg-base-200 px-1.5 py-0.5 rounded font-mono text-content-secondary">{key.keyPrefix}…</code>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {key.scopes.map(scope => (
                          <span key={scope} className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${getScopeColor(scope)}`}>
                            {scope}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-content-secondary text-xs whitespace-nowrap">
                      {timeAgo(key.lastUsedAt)}
                    </td>
                    <td className="px-3 py-2.5 text-content-secondary text-xs whitespace-nowrap">
                      {formatExpiry(key.expiresAt)}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        isActive
                          ? 'bg-green-100 text-green-700'
                          : isExpired
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-red-100 text-red-700'
                      }`}>
                        {isActive ? 'Active' : isExpired ? 'Expired' : 'Revoked'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      {key.isActive && (
                        <button
                          onClick={() => handleRevoke(key)}
                          disabled={revokingId === key.id}
                          className="text-xs px-2 py-1 rounded text-red-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-50 transition-colors"
                        >
                          {revokingId === key.id ? 'Revoking…' : 'Revoke'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <CreateKeyModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />
      )}

      {revealKey && (
        <KeyRevealModal keyData={revealKey} onClose={() => setRevealKey(null)} />
      )}
    </div>
  );
};

export default AgentApiKeys;
