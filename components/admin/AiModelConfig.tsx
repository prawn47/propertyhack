import React, { useState, useEffect, useCallback, useRef } from 'react';
import LoadingSpinner from '../shared/LoadingSpinner';
import { getApiUrl } from '../../services/apiConfig';

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
  const res = await fetch(`${getApiUrl('/api')}/admin/ai-models`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
  });
  if (!res.ok) throw new Error('Failed to load task configs');
  return res.json();
}

async function fetchProviders(): Promise<ProviderStatus[]> {
  const res = await fetch(`${getApiUrl('/api')}/admin/ai-models/providers`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
  });
  if (!res.ok) throw new Error('Failed to load providers');
  return res.json();
}

async function updateTaskConfig(
  task: string,
  data: { provider: string; model: string; fallbackProvider?: string | null; fallbackModel?: string | null }
): Promise<TaskConfig> {
  const res = await fetch(`${getApiUrl('/api')}/admin/ai-models/${task}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || 'Failed to save');
  }
  return res.json();
}

async function testTaskConfig(task: string): Promise<{ success: boolean; message: string; provider: string; model: string }> {
  const res = await fetch(`/api/admin/ai-models/${task}/test`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error((data as { error?: string }).error || 'Test failed');
  return data;
}

function inputClass(hasError = false) {
  return [
    'w-full border rounded px-3 py-2 text-sm text-content focus:outline-none focus:ring-1',
    hasError ? 'border-red-400 focus:ring-red-400' : 'border-base-300 focus:ring-brand-gold',
  ].join(' ');
}

function labelClass() {
  return 'block text-sm font-medium text-content mb-1';
}

interface TaskEditorModalProps {
  task: TaskConfig;
  providers: ProviderStatus[];
  onClose: () => void;
  onSaved: (updated: TaskConfig) => void;
  showToast: (text: string, type: 'success' | 'error') => void;
}

const TaskEditorModal: React.FC<TaskEditorModalProps> = ({ task, providers, onClose, onSaved, showToast }) => {
  const [provider, setProvider] = useState(task.provider);
  const [model, setModel] = useState(task.model);
  const [fallbackProvider, setFallbackProvider] = useState(task.fallbackProvider ?? '');
  const [fallbackModel, setFallbackModel] = useState(task.fallbackModel ?? '');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  const activeProvider = providers.find((p) => p.name === provider);
  const activeFallbackProvider = providers.find((p) => p.name === fallbackProvider);

  const handleProviderChange = (newProvider: string) => {
    setProvider(newProvider);
    setModel('');
  };

  const handleFallbackProviderChange = (newProvider: string) => {
    setFallbackProvider(newProvider);
    setFallbackModel('');
  };

  const handleSave = async () => {
    if (!provider || !model) {
      showToast('Provider and model are required', 'error');
      return;
    }
    setSaving(true);
    try {
      const updated = await updateTaskConfig(task.task, {
        provider,
        model,
        fallbackProvider: fallbackProvider || null,
        fallbackModel: fallbackModel || null,
      });
      onSaved(updated);
      showToast('Configuration saved', 'success');
      onClose();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const result = await testTaskConfig(task.task);
      showToast(`Test passed — ${result.provider}/${result.model}`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Test failed', 'error');
    } finally {
      setTesting(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) onClose();
  };

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-base-200">
          <div>
            <h2 className="text-base font-semibold text-content">
              {TASK_LABELS[task.task] || task.task}
            </h2>
            <p className="text-xs text-content-secondary font-mono mt-0.5">{task.task}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-content-secondary hover:text-content transition-colors p-1"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Primary provider */}
          <div>
            <p className="text-xs font-semibold text-content-secondary uppercase tracking-wider mb-3">
              Primary Model
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass()}>Provider</label>
                <select
                  value={provider}
                  onChange={(e) => handleProviderChange(e.target.value)}
                  className={inputClass()}
                >
                  {providers.map((p) => (
                    <option key={p.name} value={p.name} disabled={!p.keyPresent && p.name !== 'ollama'}>
                      {p.displayName || PROVIDER_LABELS[p.name] || p.name}
                      {!p.keyPresent && p.name !== 'ollama' ? ' (no key)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass()}>Model</label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className={inputClass(!model)}
                  disabled={!activeProvider || activeProvider.models.length === 0}
                >
                  <option value="">Select model</option>
                  {(activeProvider?.models ?? []).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name || m.id}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Fallback provider */}
          <div>
            <p className="text-xs font-semibold text-content-secondary uppercase tracking-wider mb-3">
              Fallback Model <span className="font-normal normal-case">(optional)</span>
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass()}>Provider</label>
                <select
                  value={fallbackProvider}
                  onChange={(e) => handleFallbackProviderChange(e.target.value)}
                  className={inputClass()}
                >
                  <option value="">None</option>
                  {providers
                    .filter((p) => p.name !== provider)
                    .map((p) => (
                      <option key={p.name} value={p.name} disabled={!p.keyPresent && p.name !== 'ollama'}>
                        {p.displayName || PROVIDER_LABELS[p.name] || p.name}
                        {!p.keyPresent && p.name !== 'ollama' ? ' (no key)' : ''}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className={labelClass()}>Model</label>
                <select
                  value={fallbackModel}
                  onChange={(e) => setFallbackModel(e.target.value)}
                  className={inputClass()}
                  disabled={!fallbackProvider || !activeFallbackProvider || activeFallbackProvider.models.length === 0}
                >
                  <option value="">Select model</option>
                  {(activeFallbackProvider?.models ?? []).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name || m.id}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-base-200 bg-base-200/30 rounded-b-lg">
          <button
            type="button"
            onClick={handleTest}
            disabled={testing || saving}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm border border-brand-gold text-brand-gold rounded hover:bg-brand-gold/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {testing ? (
              <>
                <span className="w-3 h-3 rounded-full border-2 border-brand-gold border-t-transparent animate-spin" />
                Testing...
              </>
            ) : 'Test'}
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-sm border border-base-300 rounded text-content hover:bg-base-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !provider || !model}
              className="inline-flex items-center gap-2 px-5 py-2 bg-brand-gold text-brand-primary font-semibold text-sm rounded hover:opacity-90 disabled:opacity-60 transition-opacity"
            >
              {saving ? (
                <>
                  <span className="w-3 h-3 rounded-full border-2 border-brand-primary border-t-transparent animate-spin" />
                  Saving...
                </>
              ) : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const AiModelConfig: React.FC = () => {
  const [tasks, setTasks] = useState<TaskConfig[]>([]);
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [editingTask, setEditingTask] = useState<TaskConfig | null>(null);

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

  const handleTaskSaved = (updated: TaskConfig) => {
    setTasks((prev) => prev.map((t) => (t.task === updated.task ? updated : t)));
  };

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
                      <tr
                        key={task.id}
                        onClick={() => setEditingTask(task)}
                        className="hover:bg-base-200/30 transition-colors cursor-pointer"
                      >
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
            {tasks.length > 0 && (
              <p className="text-xs text-content-secondary mt-2">
                Click a row to edit the provider and model for that task.
              </p>
            )}
          </div>
        </>
      )}

      {/* Task editor modal */}
      {editingTask && (
        <TaskEditorModal
          task={editingTask}
          providers={providers}
          onClose={() => setEditingTask(null)}
          onSaved={handleTaskSaved}
          showToast={showToast}
        />
      )}
    </div>
  );
};

export default AiModelConfig;
