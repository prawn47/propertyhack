import React, { useState, useEffect, useCallback } from 'react';
import { getPrompts, updatePrompt, type SystemPrompt } from '../../services/promptService';
import LoadingSpinner from '../shared/LoadingSpinner';

const TONE_KEYS = [
  'newsletter-tone-au',
  'newsletter-tone-uk',
  'newsletter-tone-us',
  'newsletter-tone-ca',
  'newsletter-tone-nz',
];

const JURISDICTION_LABELS: Record<string, string> = {
  'newsletter-tone-au': 'Australia',
  'newsletter-tone-uk': 'United Kingdom',
  'newsletter-tone-us': 'United States',
  'newsletter-tone-ca': 'Canada',
  'newsletter-tone-nz': 'New Zealand',
};

interface ToastMessage {
  id: number;
  text: string;
  type: 'success' | 'error';
}

let toastId = 0;

interface ToneRowProps {
  prompt: SystemPrompt;
  onSaved: (updated: SystemPrompt) => void;
  onToast: (text: string, type: 'success' | 'error') => void;
}

const ToneRow: React.FC<ToneRowProps> = ({ prompt, onSaved, onToast }) => {
  const [expanded, setExpanded] = useState(false);
  const [content, setContent] = useState(prompt.content);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const handleChange = (val: string) => {
    setContent(val);
    setDirty(val !== prompt.content);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updatePrompt(prompt.id, { content });
      onSaved(updated);
      setDirty(false);
      onToast('Tone saved', 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save';
      onToast(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setContent(prompt.content);
    setDirty(false);
    setExpanded(false);
  };

  const label = JURISDICTION_LABELS[prompt.name] ?? prompt.name;

  return (
    <div className="bg-white rounded-lg shadow-soft overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-base-200 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="font-semibold text-sm text-content">{label}</span>
          <span className="text-xs text-content-secondary font-mono">{prompt.name}</span>
          {dirty && (
            <span className="text-xs text-amber-600 font-medium">unsaved</span>
          )}
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`w-4 h-4 text-content-secondary transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-3 border-t border-base-200">
          <textarea
            value={content}
            onChange={(e) => handleChange(e.target.value)}
            rows={6}
            className="w-full mt-3 border border-base-300 rounded px-3 py-2 text-sm text-content focus:outline-none focus:ring-1 focus:ring-brand-gold resize-y"
            spellCheck={false}
          />
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 text-sm border border-base-300 rounded text-content hover:bg-base-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !dirty}
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
      )}
    </div>
  );
};

const NewsletterTones: React.FC = () => {
  const [tones, setTones] = useState<SystemPrompt[]>([]);
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
      const all = await getPrompts();
      const filtered = all.filter((p) => TONE_KEYS.includes(p.name));
      filtered.sort((a, b) => TONE_KEYS.indexOf(a.name) - TONE_KEYS.indexOf(b.name));
      setTones(filtered);
    } catch {
      showToast('Failed to load newsletter tones', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSaved = (updated: SystemPrompt) => {
    setTones((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  };

  return (
    <div className="space-y-4">
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

      <div>
        <h2 className="text-base font-semibold text-content">Newsletter Tones</h2>
        <p className="text-sm text-content-secondary mt-0.5">
          Tone-of-voice instructions used when generating newsletters per jurisdiction.
        </p>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : tones.length === 0 ? (
        <p className="text-sm text-content-secondary">
          No newsletter tone prompts found. Run the seed script to create them.
        </p>
      ) : (
        <div className="space-y-2">
          {tones.map((tone) => (
            <ToneRow
              key={tone.id}
              prompt={tone}
              onSaved={handleSaved}
              onToast={showToast}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default NewsletterTones;
