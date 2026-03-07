import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { getPrompt, updatePrompt, type SystemPrompt } from '../../services/promptService';
import LoadingSpinner from '../shared/LoadingSpinner';

interface Toast {
  id: number;
  text: string;
  type: 'success' | 'error';
}

let toastIdCounter = 0;

function inputClass() {
  return 'w-full border border-base-300 rounded px-3 py-2 text-sm text-content focus:outline-none focus:ring-1 focus:ring-brand-gold';
}

function labelClass() {
  return 'block text-sm font-medium text-content mb-1';
}

const PromptEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prompt, setPrompt] = useState<SystemPrompt | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const [content, setContent] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);

  const showToast = (text: string, toastType: 'success' | 'error') => {
    const toastId = ++toastIdCounter;
    setToasts((prev) => [...prev, { id: toastId, text, type: toastType }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== toastId)), 4000);
  };

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getPrompt(id)
      .then((p) => {
        setPrompt(p);
        setContent(p.content);
        setDescription(p.description);
        setIsActive(p.isActive);
      })
      .catch(() => showToast('Failed to load prompt', 'error'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    try {
      const updated = await updatePrompt(id, { content, description, isActive });
      setPrompt(updated);
      showToast('Prompt saved', 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save';
      showToast(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-3xl space-y-6">
      {/* Toasts */}
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

      {/* Page header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-content">
            {prompt?.name ?? 'Edit Prompt'}
          </h1>
          <p className="text-sm text-content-secondary mt-0.5">
            Edit the AI prompt content and settings.
          </p>
        </div>
        <Link
          to="/admin/prompts"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm border border-base-300 rounded text-content hover:bg-base-200 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Prompts
        </Link>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-lg shadow-soft p-6 space-y-5">
        {/* Description */}
        <div>
          <label className={labelClass()}>Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of what this prompt does"
            className={inputClass()}
          />
        </div>

        {/* Active toggle */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={isActive}
            onClick={() => setIsActive((v) => !v)}
            className={[
              'relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200',
              isActive ? 'bg-brand-gold' : 'bg-base-300',
            ].join(' ')}
          >
            <span
              className={[
                'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-200',
                isActive ? 'translate-x-4' : 'translate-x-0',
              ].join(' ')}
            />
          </button>
          <span className="text-sm text-content">
            {isActive ? 'Active' : 'Inactive'}
          </span>
        </div>

        <hr className="border-base-300" />

        {/* Prompt content */}
        <div>
          <label className={labelClass()}>Prompt Content</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={16}
            className="w-full border border-base-300 rounded px-3 py-2 text-sm text-content font-mono focus:outline-none focus:ring-1 focus:ring-brand-gold resize-y"
            placeholder="Enter the prompt template here..."
            spellCheck={false}
          />
        </div>

        {/* Variable hints */}
        <div className="bg-base-200 rounded px-4 py-3">
          <p className="text-xs font-medium text-content mb-1.5">Available variables</p>
          <div className="flex flex-wrap gap-2">
            {['{category_elements}', '{title}', '{shortBlurb}', '{content}', '{source}', '{publishedAt}'].map((v) => (
              <code
                key={v}
                className="text-xs bg-white border border-base-300 rounded px-1.5 py-0.5 text-brand-primary font-mono"
              >
                {v}
              </code>
            ))}
          </div>
          <p className="text-xs text-content-secondary mt-2">
            These placeholders are replaced at runtime with article-specific values.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => navigate('/admin/prompts')}
            className="px-4 py-2 text-sm border border-base-300 rounded text-content hover:bg-base-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 bg-brand-gold text-brand-primary font-semibold text-sm rounded hover:opacity-90 disabled:opacity-60 transition-opacity"
          >
            {saving ? (
              <>
                <span className="w-3 h-3 rounded-full border-2 border-brand-primary border-t-transparent animate-spin" />
                Saving...
              </>
            ) : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PromptEditor;
