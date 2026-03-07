import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getPrompts, type SystemPrompt } from '../../services/promptService';
import LoadingSpinner from '../shared/LoadingSpinner';
import EmptyState from '../shared/EmptyState';

interface ToastMessage {
  id: number;
  text: string;
  type: 'success' | 'error';
}

let toastId = 0;

const PromptList: React.FC = () => {
  const [prompts, setPrompts] = useState<SystemPrompt[]>([]);
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
      const data = await getPrompts();
      setPrompts(data);
    } catch {
      showToast('Failed to load prompts', 'error');
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
              'px-4 py-3 rounded shadow-medium text-sm font-medium pointer-events-auto animate-fade-in',
              t.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white',
            ].join(' ')}
          >
            {t.text}
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-content">System Prompts</h1>
          <p className="text-sm text-content-secondary mt-0.5">
            Manage AI prompts used in the ingestion and summarisation pipeline.
          </p>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <LoadingSpinner />
      ) : prompts.length === 0 ? (
        <EmptyState
          title="No prompts found"
          message="No system prompts have been configured yet."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {prompts.map((prompt) => (
            <Link
              key={prompt.id}
              to={`/admin/prompts/${prompt.id}/edit`}
              className="bg-white rounded-lg shadow-soft p-5 hover:shadow-medium transition-shadow group"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-content text-sm group-hover:text-brand-gold transition-colors truncate">
                    {prompt.name}
                  </p>
                </div>
                <span
                  className={[
                    'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium flex-shrink-0',
                    prompt.isActive
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600',
                  ].join(' ')}
                >
                  {prompt.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              {prompt.description && (
                <p className="text-sm text-content-secondary mb-3 line-clamp-2">
                  {prompt.description}
                </p>
              )}

              <p className="text-xs text-content-secondary font-mono bg-base-200 rounded px-2 py-1.5 line-clamp-3 whitespace-pre-wrap">
                {prompt.content.slice(0, 150)}{prompt.content.length > 150 ? '…' : ''}
              </p>

              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-content-secondary">
                  Updated {new Date(prompt.updatedAt).toLocaleDateString('en-AU', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <span className="text-xs text-brand-gold font-medium group-hover:underline">
                  Edit
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default PromptList;
