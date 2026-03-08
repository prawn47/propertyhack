import React, { useState, useRef, KeyboardEvent } from 'react';

interface SocialConfig {
  id?: string;
  tonePrompt: string;
  defaultHashtags: string[];
  minPostGapMins: number;
  maxDelayMins: number;
  fallbackImageUrl?: string | null;
}

interface SocialConfigFormProps {
  config: SocialConfig;
  onSave: (data: Partial<SocialConfig>) => Promise<void>;
}

const SocialConfigForm: React.FC<SocialConfigFormProps> = ({ config, onSave }) => {
  const [tonePrompt, setTonePrompt] = useState(config.tonePrompt);
  const [hashtags, setHashtags] = useState<string[]>(config.defaultHashtags || []);
  const [minPostGapMins, setMinPostGapMins] = useState(config.minPostGapMins);
  const [maxDelayMins, setMaxDelayMins] = useState(config.maxDelayMins);
  const [fallbackImageUrl, setFallbackImageUrl] = useState(config.fallbackImageUrl || '');
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const tagInputRef = useRef<HTMLInputElement>(null);

  const addTag = () => {
    const raw = tagInput.trim();
    if (!raw) return;
    const tag = raw.startsWith('#') ? raw : `#${raw}`;
    if (!hashtags.includes(tag)) {
      setHashtags(prev => [...prev, tag]);
    }
    setTagInput('');
    tagInputRef.current?.focus();
  };

  const removeTag = (tag: string) => {
    setHashtags(prev => prev.filter(t => t !== tag));
  };

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Backspace' && !tagInput && hashtags.length > 0) {
      setHashtags(prev => prev.slice(0, -1));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await onSave({
        tonePrompt,
        defaultHashtags: hashtags,
        minPostGapMins,
        maxDelayMins,
        fallbackImageUrl: fallbackImageUrl || null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-content mb-1.5">
          Tone prompt
        </label>
        <textarea
          value={tonePrompt}
          onChange={(e) => setTonePrompt(e.target.value)}
          rows={3}
          maxLength={2000}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-brand-gold focus:border-brand-gold resize-y"
          placeholder="Describe the tone for generated social posts…"
        />
        <p className="text-xs text-content-secondary mt-1">{tonePrompt.length}/2000 characters</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-content mb-1.5">
          Default hashtags
        </label>
        <div
          className="flex flex-wrap gap-1.5 px-3 py-2 border border-gray-300 rounded focus-within:ring-1 focus-within:ring-brand-gold focus-within:border-brand-gold cursor-text min-h-[42px]"
          onClick={() => tagInputRef.current?.focus()}
        >
          {hashtags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-brand-primary text-white"
            >
              {tag}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeTag(tag); }}
                className="hover:text-brand-gold transition-colors leading-none"
                aria-label={`Remove ${tag}`}
              >
                ×
              </button>
            </span>
          ))}
          <input
            ref={tagInputRef}
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            onBlur={addTag}
            placeholder={hashtags.length === 0 ? 'Type a hashtag and press Enter…' : ''}
            className="flex-1 min-w-[120px] text-sm outline-none bg-transparent"
          />
        </div>
        <p className="text-xs text-content-secondary mt-1">Press Enter or comma to add. No # needed.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-content mb-1.5">
            Max delay (minutes)
          </label>
          <input
            type="number"
            min={5}
            max={1440}
            value={maxDelayMins}
            onChange={(e) => setMaxDelayMins(Number(e.target.value))}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-brand-gold focus:border-brand-gold"
          />
          <p className="text-xs text-content-secondary mt-1">Max random delay before posting (5–1440)</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-content mb-1.5">
            Min gap (minutes)
          </label>
          <input
            type="number"
            min={1}
            max={60}
            value={minPostGapMins}
            onChange={(e) => setMinPostGapMins(Number(e.target.value))}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-brand-gold focus:border-brand-gold"
          />
          <p className="text-xs text-content-secondary mt-1">Minimum gap between posts per platform (1–60)</p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-content mb-1.5">
          Fallback image URL
        </label>
        <input
          type="url"
          value={fallbackImageUrl}
          onChange={(e) => setFallbackImageUrl(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-brand-gold focus:border-brand-gold"
          placeholder="https://… (used when article has no image)"
        />
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 text-sm font-medium rounded bg-brand-primary text-white hover:bg-brand-secondary transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save settings'}
        </button>
        {saved && (
          <span className="text-sm text-green-600 font-medium">Saved</span>
        )}
      </div>
    </div>
  );
};

export default SocialConfigForm;
export type { SocialConfig };
