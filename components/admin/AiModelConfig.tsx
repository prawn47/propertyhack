import React, { useState, useEffect, useCallback } from 'react';
import LoadingSpinner from '../shared/LoadingSpinner';

interface TaskConfig {
  id: string;
  task: string;
  provider: string;
  model: string;
  fallbackProvider: string | null;
  fallbackModel: string | null;
  isActive: boolean;
}

interface ProviderModel {
  id: string;
  name: string;
  capabilities: string[];
}

interface ProviderStatus {
  name: string;
  displayName: string;
  keyPresent: boolean;
  models: ProviderModel[];
}

interface ToastMessage {
  id: number;
  text: string;
  type: 'success' | 'error';
}

let toastId = 0;

const TASK_LABELS: Record<string, string> = {
  'article-summarisation': 'Article Summarisation',
  'image-alt-text': 'Image Alt Text',
  'image-generation': 'Image Generation',
  'newsletter-generation': 'Newsletter Generation',
  'relevance-scoring': 'Relevance Scoring',
};

const PROVIDER_LABELS: Record<string, string> = {
  gemini: 'Google Gemini',
  claude: 'Anthropic Claude',
  openai: 'OpenAI',
  ollama: 'Ollama (Local)',
};

async function fetchTaskConfigs(): Promise<TaskConfig[]> {
  const res = await fetch('/api/admin/ai-models', {
    headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
  });
  if (!res.ok) throw new Error('Failed to load task configs');
  return res.json();
}

async function fetchProviders(): Promise<ProviderStatus[]> {
  const res = await fetch('/api/admin/ai-models/providers', {
    headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
  });
  if (!res.ok) throw new Error('Failed to load providers');
  return res.json();
}

const AiModelConfig: React.FC = () => {
  const [tasks, setTasks] = useState<TaskConfig[]>([]);
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (text: string, type: 'success' | 'error') => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [taskData, providerData] = await Promise.all([fetchTaskConfigs(), fetchProviders()]);
      setTasks(taskData);
      setProviders(providerData);
    } catch {
      showToast('Failed to load AI model configuration', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      {/* Toast notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={[
              'px-4 py-3 rounded shadow-medium text-sm font-medium pointer-events-auto',
              t.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white',
            ].join(' ')}
          >
            {t.text}
          </div>
        ))}
      </div>

      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-content">AI Models</h1>
        <p className="text-sm text-content-secondary mt-0.5">
          Configure which AI provider and model is used for each task in the pipeline.
        </p>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          {/* Provider Status Cards */}
          <div>
            <h2 className="text-sm font-semibold text-content-secondary uppercase tracking-wider mb-3">
              Provider Status
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {providers.map((provider) => (
                <div key={provider.name} className="bg-white rounded-lg shadow-soft p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-content">
                      {provider.displayName || PROVIDER_LABELS[provider.name] || provider.name}
                    </span>
                    {provider.keyPresent ? (
                      <span className="flex items-center gap-1 text-green-600 text-xs font-medium">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        Key set
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-500 text-xs font-medium">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        No key
                      </span>
                    )}
                  </div>
                  {provider.models.length > 0 ? (
                    <ul className="space-y-0.5">
                      {provider.models.slice(0, 4).map((m) => (
                        <li key={m.id} className="text-xs text-content-secondary truncate">
                          {m.name || m.id}
                        </li>
                      ))}
                      {provider.models.length > 4 && (
                        <li className="text-xs text-content-secondary">
                          +{provider.models.length - 4} more
                        </li>
                      )}
                    </ul>
                  ) : (
                    <p className="text-xs text-content-secondary italic">No models available</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Task Config Table */}
          <div>
            <h2 className="text-sm font-semibold text-content-secondary uppercase tracking-wider mb-3">
              Task Configuration
            </h2>
            <div className="bg-white rounded-lg shadow-soft overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-base-200 bg-base-200/50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-content-secondary uppercase tracking-wider">
                      Task
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-content-secondary uppercase tracking-wider">
                      Provider
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-content-secondary uppercase tracking-wider">
                      Model
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-content-secondary uppercase tracking-wider hidden md:table-cell">
                      Fallback
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-content-secondary uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-base-200">
                  {tasks.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-sm text-content-secondary">
                        No task configurations found. Run the seed script to initialise defaults.
                      </td>
                    </tr>
                  ) : (
                    tasks.map((task) => (
                      <tr key={task.id} className="hover:bg-base-200/30 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-medium text-content">
                            {TASK_LABELS[task.task] || task.task}
                          </span>
                          <span className="block text-xs text-content-secondary font-mono mt-0.5">
                            {task.task}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-content-secondary">
                          {PROVIDER_LABELS[task.provider] || task.provider}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs bg-base-200 px-2 py-0.5 rounded text-content">
                            {task.model}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-content-secondary hidden md:table-cell">
                          {task.fallbackProvider ? (
                            <span className="text-xs">
                              {PROVIDER_LABELS[task.fallbackProvider] || task.fallbackProvider}
                              {task.fallbackModel && (
                                <span className="block font-mono bg-base-200 px-1.5 py-0.5 rounded mt-0.5 w-fit">
                                  {task.fallbackModel}
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-content-secondary/50 text-xs">None</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={[
                              'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                              task.isActive
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-500',
                            ].join(' ')}
                          >
                            {task.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AiModelConfig;
