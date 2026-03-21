import { useState, useRef, useCallback } from 'react';
import { getApiUrl, getImageUrl } from '../../../services/apiConfig';
import authService from '../../../services/authService';

interface ImageEditorProps {
  imageUrl: string | null;
  onImageChange: (newImageUrl: string, altText?: string, filename?: string) => void;
  aspectRatio?: '1:1' | '16:9' | '4:3';
  style?: string;
  className?: string;
  showUpload?: boolean;
  context?: {
    title?: string;
    content?: string;
    type?: string;
    market?: string;
  };
}

type EditorMode = 'preview' | 'edit' | 'upload';

async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = authService.getAccessToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(url, { ...options, headers, credentials: 'include' });
}

export default function ImageEditor({
  imageUrl,
  onImageChange,
  aspectRatio = '16:9',
  style,
  className = '',
  showUpload = true,
  context,
}: ImageEditorProps) {
  const [mode, setMode] = useState<EditorMode>('preview');
  const [editPrompt, setEditPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const clearError = useCallback(() => {
    if (error) setError(null);
  }, [error]);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const prompt = context?.title
        ? `Property news image for: ${context.title}`
        : 'Property news hero image';

      const res = await authFetch(getApiUrl('/api/admin/images/generate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          style,
          aspectRatio,
          context,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ message: 'Generation failed' }));
        throw new Error(data.message || 'Image generation failed');
      }

      const data = await res.json();
      onImageChange(data.imageUrl, data.altText, data.filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Image generation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!editPrompt.trim() || !imageUrl) return;
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(getApiUrl('/api/admin/images/edit'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl,
          editPrompt: editPrompt.trim(),
          style,
          aspectRatio,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ message: 'Edit failed' }));
        throw new Error(data.message || 'Image editing failed');
      }

      const data = await res.json();
      onImageChange(data.imageUrl, data.altText, data.filename);
      setEditPrompt('');
      setMode('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Image editing failed');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPG, PNG, or WebP)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      onImageChange(dataUrl, undefined, file.name);
      setMode('preview');
    };
    reader.onerror = () => setError('Failed to read file');
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const resolvedUrl = getImageUrl(imageUrl);
  const aspectClass =
    aspectRatio === '1:1' ? 'aspect-square' :
    aspectRatio === '4:3' ? 'aspect-[4/3]' :
    'aspect-video';

  // Empty state — no image yet
  if (!imageUrl) {
    return (
      <div className={`${className}`}>
        <div
          className={`${aspectClass} bg-base-200 border-2 border-dashed border-base-300 rounded-lg flex flex-col items-center justify-center gap-3`}
        >
          <svg className="w-10 h-10 text-content-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
          </svg>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="px-4 py-2 bg-brand-accent text-brand-primary font-medium rounded-lg hover:bg-brand-accent/90 transition-colors disabled:opacity-50"
          >
            {loading ? 'Generating...' : 'Generate Image'}
          </button>
          {showUpload && (
            <button
              onClick={() => setMode('upload')}
              className="text-sm text-content-secondary hover:text-brand-accent transition-colors"
            >
              or upload an image
            </button>
          )}
        </div>

        {mode === 'upload' && (
          <UploadZone
            dragOver={dragOver}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onFileSelect={handleFileSelect}
            onCancel={() => setMode('preview')}
            fileInputRef={fileInputRef}
          />
        )}

        {error && <ErrorBanner message={error} onDismiss={clearError} />}
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {/* Image preview with loading overlay */}
      <div className={`relative ${aspectClass} rounded-lg overflow-hidden bg-base-200`}>
        <img
          src={resolvedUrl}
          alt="Content image"
          className="w-full h-full object-cover"
        />
        {loading && (
          <div className="absolute inset-0 bg-brand-primary/70 flex flex-col items-center justify-center gap-2">
            <svg className="w-8 h-8 text-brand-accent animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-white text-sm font-medium">Generating...</span>
          </div>
        )}
      </div>

      {/* Action bar — preview mode */}
      {mode === 'preview' && (
        <div className="flex gap-2 mt-2">
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="px-3 py-1.5 text-sm bg-brand-secondary text-white rounded hover:bg-brand-secondary/80 transition-colors disabled:opacity-50"
          >
            Regenerate
          </button>
          <button
            onClick={() => { setMode('edit'); clearError(); }}
            disabled={loading}
            className="px-3 py-1.5 text-sm bg-brand-secondary text-white rounded hover:bg-brand-secondary/80 transition-colors disabled:opacity-50"
          >
            Edit
          </button>
          {showUpload && (
            <button
              onClick={() => { setMode('upload'); clearError(); }}
              disabled={loading}
              className="px-3 py-1.5 text-sm bg-brand-secondary text-white rounded hover:bg-brand-secondary/80 transition-colors disabled:opacity-50"
            >
              Upload
            </button>
          )}
        </div>
      )}

      {/* Edit mode */}
      {mode === 'edit' && (
        <div className="mt-2 space-y-2">
          <input
            type="text"
            value={editPrompt}
            onChange={(e) => setEditPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleEdit(); }}
            placeholder="Describe changes (e.g., 'make it warmer', 'switch to Kodak Portra')"
            className="w-full px-3 py-2 text-sm border border-base-300 rounded-lg bg-white text-content focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
            autoFocus
            disabled={loading}
          />
          <div className="flex gap-2">
            <button
              onClick={handleEdit}
              disabled={loading || !editPrompt.trim()}
              className="px-3 py-1.5 text-sm bg-brand-accent text-brand-primary font-medium rounded hover:bg-brand-accent/90 transition-colors disabled:opacity-50"
            >
              Apply
            </button>
            <button
              onClick={() => { setMode('preview'); setEditPrompt(''); }}
              disabled={loading}
              className="px-3 py-1.5 text-sm text-content-secondary hover:text-content transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Upload mode */}
      {mode === 'upload' && (
        <UploadZone
          dragOver={dragOver}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onFileSelect={handleFileSelect}
          onCancel={() => setMode('preview')}
          fileInputRef={fileInputRef}
        />
      )}

      {error && <ErrorBanner message={error} onDismiss={clearError} />}
    </div>
  );
}

function UploadZone({
  dragOver,
  onDrop,
  onDragOver,
  onDragLeave,
  onFileSelect,
  onCancel,
  fileInputRef,
}: {
  dragOver: boolean;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onFileSelect: (file: File) => void;
  onCancel: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <div className="mt-2 space-y-2">
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          dragOver
            ? 'border-brand-accent bg-brand-accent/10'
            : 'border-base-300 hover:border-brand-accent/50'
        }`}
      >
        <p className="text-sm text-content-secondary">
          Drag and drop an image here, or click to browse
        </p>
        <p className="text-xs text-content-secondary mt-1">JPG, PNG, or WebP</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFileSelect(file);
          }}
        />
      </div>
      <button
        onClick={onCancel}
        className="px-3 py-1.5 text-sm text-content-secondary hover:text-content transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}

function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
      <span className="flex-1">{message}</span>
      <button onClick={onDismiss} className="text-red-400 hover:text-red-600">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
