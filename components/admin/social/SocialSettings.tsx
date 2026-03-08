import React, { useState, useEffect, useCallback } from 'react';
import SocialAccountCard, { SocialAccount, ConnectFormData } from './SocialAccountCard';
import SocialConfigForm, { SocialConfig } from './SocialConfigForm';
import LoadingSpinner from '../../shared/LoadingSpinner';
import authService from '../../../services/authService';

const API = '/api/admin';

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await authService.makeAuthenticatedRequest(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

const SocialSettings: React.FC = () => {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [config, setConfig] = useState<SocialConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [accts, cfg] = await Promise.all([
        apiFetch<SocialAccount[]>(`${API}/social-accounts`),
        apiFetch<SocialConfig>(`${API}/social-config`),
      ]);
      setAccounts(accts);
      setConfig(cfg);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleToggleAutoPublish = async (platform: string, value: boolean) => {
    await apiFetch(`${API}/social-accounts/${platform}`, {
      method: 'PUT',
      body: JSON.stringify({ autoPublish: value }),
    });
    setAccounts(prev =>
      prev.map(a => a.platform === platform ? { ...a, autoPublish: value } : a)
    );
  };

  const handleConnect = async (platform: string, data: ConnectFormData) => {
    const payload: Record<string, string> = {};
    if (data.accessToken) payload.accessToken = data.accessToken;
    if (data.accessSecret) payload.accessSecret = data.accessSecret;
    if (data.refreshToken) payload.refreshToken = data.refreshToken;
    if (data.accountName) payload.accountName = data.accountName;
    if (data.accountId) payload.accountId = data.accountId;
    if (data.apiKey) payload.apiKey = data.apiKey;
    if (data.apiSecret) payload.apiSecret = data.apiSecret;

    const result = await apiFetch<SocialAccount>(`${API}/social-accounts/${platform}/connect`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setAccounts(prev =>
      prev.map(a => a.platform === platform ? { ...a, ...result, isConnected: true } : a)
    );
  };

  const handleDisconnect = async (platform: string) => {
    await apiFetch(`${API}/social-accounts/${platform}/disconnect`, { method: 'POST' });
    setAccounts(prev =>
      prev.map(a => a.platform === platform ? { ...a, isConnected: false, accountName: null, accountId: null, hasAccessToken: false } : a)
    );
  };

  const handleTest = async (platform: string) => {
    const result = await apiFetch<{ healthy: boolean; error?: string; details?: Record<string, unknown> }>(
      `${API}/social-accounts/${platform}/test`,
      { method: 'POST' }
    );
    if (!result.healthy) {
      setAccounts(prev =>
        prev.map(a => a.platform === platform ? { ...a, lastError: result.error || 'Test failed', isConnected: false } : a)
      );
    } else {
      setAccounts(prev =>
        prev.map(a => a.platform === platform ? { ...a, lastError: null } : a)
      );
    }
    return result;
  };

  const handleSaveConfig = async (data: Partial<SocialConfig>) => {
    const updated = await apiFetch<SocialConfig>(`${API}/social-config`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    setConfig(updated);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingSpinner className="w-8 h-8 text-brand-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-5 py-4 text-sm">
        {error}
        <button onClick={loadAll} className="ml-3 underline hover:no-underline">Retry</button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-xl font-bold text-content">Social Publishing Settings</h1>
        <p className="text-sm text-content-secondary mt-1">
          Manage platform connections and configure how posts are generated and timed.
        </p>
      </div>

      <section>
        <h2 className="text-base font-semibold text-content mb-3">Connected Accounts</h2>
        <div className="space-y-3">
          {accounts.map((account) => (
            <SocialAccountCard
              key={account.platform}
              account={account}
              onToggleAutoPublish={handleToggleAutoPublish}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
              onTest={handleTest}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold text-content mb-3">Publishing Config</h2>
        <div className="bg-base-100 rounded-lg border border-gray-200 p-5">
          {config && (
            <SocialConfigForm config={config} onSave={handleSaveConfig} />
          )}
        </div>
      </section>
    </div>
  );
};

export default SocialSettings;
