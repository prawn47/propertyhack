import React, { useState } from 'react';

interface SocialAccount {
  id?: string;
  platform: string;
  accountName?: string | null;
  accountId?: string | null;
  isConnected: boolean;
  autoPublish: boolean;
  lastError?: string | null;
  lastCheckedAt?: string | null;
  hasAccessToken?: boolean;
}

interface ConnectFormData {
  accessToken: string;
  accessSecret: string;
  refreshToken: string;
  accountName: string;
  accountId: string;
  apiKey: string;
  apiSecret: string;
}

interface SocialAccountCardProps {
  account: SocialAccount;
  onToggleAutoPublish: (platform: string, value: boolean) => Promise<void>;
  onConnect: (platform: string, data: ConnectFormData) => Promise<void>;
  onDisconnect: (platform: string) => Promise<void>;
  onTest: (platform: string) => Promise<{ healthy: boolean; error?: string; details?: Record<string, unknown> }>;
}

const PLATFORM_LABELS: Record<string, string> = {
  facebook: 'Facebook',
  twitter: 'X (Twitter)',
  instagram: 'Instagram',
};

const PLATFORM_COLORS: Record<string, string> = {
  facebook: '#1877F2',
  twitter: '#000000',
  instagram: '#E4405F',
};

function PlatformIcon({ platform }: { platform: string }) {
  if (platform === 'facebook') {
    return (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill={PLATFORM_COLORS.facebook}>
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    );
  }
  if (platform === 'twitter') {
    return (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill={PLATFORM_COLORS.twitter}>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    );
  }
  if (platform === 'instagram') {
    return (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill={PLATFORM_COLORS.instagram}>
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    );
  }
  return null;
}

function getConnectFields(platform: string) {
  if (platform === 'twitter') {
    return [
      { key: 'accessToken', label: 'Access Token', required: true },
      { key: 'accessSecret', label: 'Access Secret', required: true },
      { key: 'apiKey', label: 'API Key (optional — uses env var if blank)', required: false },
      { key: 'apiSecret', label: 'API Secret (optional — uses env var if blank)', required: false },
      { key: 'accountName', label: 'Account Name (e.g. @handle)', required: false },
    ];
  }
  if (platform === 'facebook') {
    return [
      { key: 'accessToken', label: 'Page Access Token', required: true },
      { key: 'accountId', label: 'Page ID', required: false },
      { key: 'accountName', label: 'Page Name', required: false },
    ];
  }
  if (platform === 'instagram') {
    return [
      { key: 'accessToken', label: 'Page Access Token', required: true },
      { key: 'accountId', label: 'Instagram Account ID', required: false },
      { key: 'accountName', label: 'Account Name', required: false },
    ];
  }
  return [];
}

const EMPTY_FORM: ConnectFormData = {
  accessToken: '',
  accessSecret: '',
  refreshToken: '',
  accountName: '',
  accountId: '',
  apiKey: '',
  apiSecret: '',
};

const SocialAccountCard: React.FC<SocialAccountCardProps> = ({
  account,
  onToggleAutoPublish,
  onConnect,
  onDisconnect,
  onTest,
}) => {
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [formData, setFormData] = useState<ConnectFormData>(EMPTY_FORM);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ healthy: boolean; message: string } | null>(null);
  const [togglingAuto, setTogglingAuto] = useState(false);

  const label = PLATFORM_LABELS[account.platform] || account.platform;
  const fields = getConnectFields(account.platform);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      await onConnect(account.platform, formData);
      setShowConnectModal(false);
      setFormData(EMPTY_FORM);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm(`Disconnect ${label}? This will remove saved credentials.`)) return;
    setDisconnecting(true);
    try {
      await onDisconnect(account.platform);
    } finally {
      setDisconnecting(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await onTest(account.platform);
      setTestResult({
        healthy: result.healthy,
        message: result.healthy
          ? `Connection OK${result.details && (result.details as { username?: string }).username ? ` — @${(result.details as { username?: string }).username}` : ''}`
          : result.error || 'Test failed',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleToggleAuto = async () => {
    setTogglingAuto(true);
    try {
      await onToggleAutoPublish(account.platform, !account.autoPublish);
    } finally {
      setTogglingAuto(false);
    }
  };

  return (
    <>
      <div className="bg-base-100 rounded-lg border border-gray-200 p-5">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 mt-0.5">
            <PlatformIcon platform={account.platform} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-content text-sm">{label}</span>
              {account.isConnected ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                  Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
                  Not connected
                </span>
              )}
            </div>

            {account.accountName && (
              <p className="text-xs text-content-secondary mt-0.5">{account.accountName}</p>
            )}

            {account.lastError && (
              <p className="text-xs text-red-600 mt-1 truncate" title={account.lastError}>
                Error: {account.lastError}
              </p>
            )}

            {testResult && (
              <p className={`text-xs mt-1 ${testResult.healthy ? 'text-green-600' : 'text-red-600'}`}>
                {testResult.message}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
            {account.isConnected && (
              <>
                <button
                  onClick={handleToggleAuto}
                  disabled={togglingAuto}
                  title={account.autoPublish ? 'Auto-publish on — click to disable' : 'Auto-publish off — click to enable'}
                  className={[
                    'relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none',
                    account.autoPublish ? 'bg-brand-gold' : 'bg-gray-300',
                    togglingAuto ? 'opacity-50' : '',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform',
                      account.autoPublish ? 'translate-x-4.5' : 'translate-x-0.5',
                    ].join(' ')}
                  />
                </button>
                <span className="text-xs text-content-secondary w-16">
                  {account.autoPublish ? 'Auto on' : 'Auto off'}
                </span>
                <button
                  onClick={handleTest}
                  disabled={testing}
                  className="px-3 py-1.5 text-xs rounded border border-gray-300 text-content-secondary hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {testing ? 'Testing…' : 'Test'}
                </button>
                <button
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="px-3 py-1.5 text-xs rounded border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  {disconnecting ? 'Disconnecting…' : 'Disconnect'}
                </button>
              </>
            )}

            {!account.isConnected && (
              <button
                onClick={() => { setShowConnectModal(true); setTestResult(null); }}
                className="px-3 py-1.5 text-xs rounded bg-brand-primary text-white hover:bg-brand-secondary transition-colors"
              >
                Connect
              </button>
            )}
          </div>
        </div>
      </div>

      {showConnectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-base-100 rounded-lg shadow-strong w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="font-semibold text-content">Connect {label}</h3>
            </div>
            <div className="px-6 py-4 space-y-3">
              {fields.map((field) => (
                <div key={field.key}>
                  <label className="block text-xs font-medium text-content-secondary mb-1">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-0.5">*</span>}
                  </label>
                  <input
                    type={field.key.toLowerCase().includes('secret') || field.key.toLowerCase().includes('token') ? 'password' : 'text'}
                    value={formData[field.key as keyof ConnectFormData]}
                    onChange={(e) => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-brand-gold focus:border-brand-gold"
                    placeholder={field.required ? 'Required' : 'Optional'}
                  />
                </div>
              ))}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => { setShowConnectModal(false); setFormData(EMPTY_FORM); }}
                className="px-4 py-2 text-sm rounded border border-gray-300 text-content-secondary hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConnect}
                disabled={connecting || !formData.accessToken.trim()}
                className="px-4 py-2 text-sm rounded bg-brand-primary text-white hover:bg-brand-secondary transition-colors disabled:opacity-50"
              >
                {connecting ? 'Connecting…' : 'Connect'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SocialAccountCard;
export type { SocialAccount, ConnectFormData };
