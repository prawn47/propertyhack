import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import {
  getNewsletter,
  updateNewsletter,
  approveNewsletter,
  sendNewsletter,
  NewsletterDraft,
} from '../../services/adminNewsletterService';
import LoadingSpinner from '../shared/LoadingSpinner';

const JURISDICTION_LABELS: Record<string, string> = {
  AU: 'Australia',
  NZ: 'New Zealand',
  UK: 'United Kingdom',
  US: 'United States',
  CA: 'Canada',
};

const STATUS_BADGES: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  APPROVED: 'bg-green-100 text-green-700',
  SENT: 'bg-blue-100 text-blue-700',
};

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={[
        'px-2 py-1 rounded text-sm font-medium transition-colors disabled:opacity-40',
        active
          ? 'bg-brand-gold text-brand-primary'
          : 'text-content-secondary hover:text-content hover:bg-base-200',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function extractArticleLinks(html: string): { slug: string; label: string }[] {
  const seen = new Set<string>();
  const results: { slug: string; label: string }[] = [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  doc.querySelectorAll('a[href]').forEach((el) => {
    const href = el.getAttribute('href') || '';
    const match = href.match(/^\/article\/([^/?#]+)/);
    if (match && !seen.has(match[1])) {
      seen.add(match[1]);
      results.push({ slug: match[1], label: el.textContent?.trim() || match[1] });
    }
  });
  return results;
}

function PreviewModal({ html, subject, onClose }: { html: string; subject: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto py-8"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-base-100 rounded-lg shadow-xl w-full max-w-2xl mx-4">
        <div className="flex items-center justify-between px-5 py-3 border-b border-base-300">
          <div>
            <p className="text-xs text-content-secondary uppercase tracking-wide font-medium">Preview</p>
            <p className="text-sm font-semibold text-content mt-0.5 truncate max-w-md">{subject}</p>
          </div>
          <button
            onClick={onClose}
            className="text-content-secondary hover:text-content p-1"
            title="Close preview"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div
          className="prose prose-sm max-w-none p-6 text-content"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  );
}

function SendConfirmDialog({
  draft,
  onConfirm,
  onCancel,
  sending,
}: {
  draft: NewsletterDraft;
  onConfirm: () => void;
  onCancel: () => void;
  sending: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-base-100 rounded-lg shadow-xl w-full max-w-md mx-4 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-content">Send Newsletter</h2>
        <p className="text-sm text-content-secondary">
          You are about to publish and send this newsletter to all <strong>{JURISDICTION_LABELS[draft.jurisdiction] || draft.jurisdiction}</strong> subscribers via Beehiiv. This cannot be undone.
        </p>
        <div className="bg-base-200 rounded p-3 space-y-1 text-sm">
          <div className="flex gap-2">
            <span className="text-content-secondary w-24 flex-shrink-0">Jurisdiction</span>
            <span className="text-content font-medium">{JURISDICTION_LABELS[draft.jurisdiction] || draft.jurisdiction}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-content-secondary w-24 flex-shrink-0">Subject</span>
            <span className="text-content font-medium truncate">{draft.subject}</span>
          </div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-xs rounded px-3 py-2">
          Warning: sending to Beehiiv will immediately deliver to all matching subscribers.
        </div>
        <div className="flex justify-end gap-3 pt-1">
          <button
            onClick={onCancel}
            disabled={sending}
            className="px-4 py-2 text-sm border border-base-300 rounded bg-base-100 hover:border-brand-gold disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={sending}
            className="px-4 py-2 text-sm bg-brand-primary text-base-100 font-medium rounded hover:opacity-90 disabled:opacity-50"
          >
            {sending ? 'Sending…' : 'Confirm & Send'}
          </button>
        </div>
      </div>
    </div>
  );
}

const NewsletterEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [draft, setDraft] = useState<NewsletterDraft | null>(null);
  const [subject, setSubject] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [sending, setSending] = useState(false);
  const [showSendConfirm, setShowSendConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved' | 'saving'>('saved');
  const [showPreview, setShowPreview] = useState(false);
  const [currentHtml, setCurrentHtml] = useState('');

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const articleLinks = useMemo(() => extractArticleLinks(currentHtml), [currentHtml]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-brand-accent underline',
        },
      }),
    ],
    content: '',
    onUpdate: ({ editor: e }) => {
      const html = e.getHTML();
      setCurrentHtml(html);
      setSaveStatus('unsaved');
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        handleSave(undefined, html);
      }, 1500);
    },
  });

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getNewsletter(id)
      .then((data) => {
        setDraft(data);
        setSubject(data.subject);
        editor?.commands.setContent(data.htmlContent || '');
        setCurrentHtml(data.htmlContent || '');
        setSaveStatus('saved');
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, editor]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const handleSave = useCallback(
    async (newSubject?: string, newHtml?: string) => {
      if (!id) return;
      setSaving(true);
      setSaveStatus('saving');
      try {
        const updated = await updateNewsletter(id, {
          subject: newSubject ?? subject,
          htmlContent: newHtml ?? editor?.getHTML() ?? '',
        });
        setDraft(updated);
        setSaveStatus('saved');
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Save failed');
        setSaveStatus('unsaved');
      } finally {
        setSaving(false);
      }
    },
    [id, subject, editor]
  );

  const handleSubjectBlur = () => {
    if (draft && subject !== draft.subject) {
      handleSave(subject);
    }
  };

  const handleApprove = async () => {
    if (!id || !draft) return;
    if (!confirm('Approve this newsletter draft?')) return;
    setApproving(true);
    try {
      const updated = await approveNewsletter(id);
      setDraft(updated);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Approve failed');
    } finally {
      setApproving(false);
    }
  };

  const handleSend = async () => {
    if (!id || !draft) return;
    setSending(true);
    setShowSendConfirm(false);
    try {
      const updated = await sendNewsletter(id);
      setDraft(updated);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Send failed');
    } finally {
      setSending(false);
    }
  };

  const handleSetLink = () => {
    if (!editor) return;
    const prev = editor.getAttributes('link').href || '';
    const url = window.prompt('Enter URL', prev);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner />
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="text-center py-20 text-content-secondary">
        Newsletter not found.{' '}
        <button onClick={() => navigate('/admin/newsletters')} className="text-brand-accent underline">
          Back to list
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/newsletters')}
            className="text-content-secondary hover:text-content"
            title="Back to newsletters"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-semibold text-content">Edit Newsletter</h1>
          <span className="text-xs font-medium px-2 py-0.5 rounded bg-base-200 text-content-secondary">
            {JURISDICTION_LABELS[draft.jurisdiction] || draft.jurisdiction}
          </span>
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded ${STATUS_BADGES[draft.status] || 'bg-gray-100 text-gray-600'}`}
          >
            {draft.status}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`text-xs ${
              saveStatus === 'saved'
                ? 'text-green-600'
                : saveStatus === 'saving'
                ? 'text-content-secondary'
                : 'text-yellow-600'
            }`}
          >
            {saveStatus === 'saved' ? 'Saved' : saveStatus === 'saving' ? 'Saving…' : 'Unsaved changes'}
          </span>
          <button
            onClick={() => handleSave()}
            disabled={saving || saveStatus === 'saved'}
            className="px-3 py-1.5 text-sm border border-base-300 rounded bg-base-100 hover:border-brand-gold disabled:opacity-40"
          >
            Save
          </button>
          <button
            onClick={() => setShowPreview(true)}
            className="px-3 py-1.5 text-sm border border-base-300 rounded bg-base-100 hover:border-brand-gold"
          >
            Preview
          </button>
          {draft.status === 'DRAFT' && (
            <button
              onClick={handleApprove}
              disabled={approving}
              className="px-3 py-1.5 text-sm bg-brand-gold text-brand-primary font-medium rounded hover:opacity-90 disabled:opacity-50"
            >
              {approving ? 'Approving…' : 'Approve'}
            </button>
          )}
          {draft.status === 'APPROVED' && (
            <button
              onClick={() => setShowSendConfirm(true)}
              disabled={sending}
              className="px-3 py-1.5 text-sm bg-brand-primary text-base-100 font-medium rounded hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              {sending ? 'Sending…' : 'Send to Beehiiv'}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">{error}</div>
      )}

      {/* Status pipeline bar */}
      <div className="flex items-center gap-0 bg-base-200 rounded overflow-hidden text-xs">
        {(['DRAFT', 'APPROVED', 'SENT'] as const).map((step, i) => {
          const timestamps: Record<string, string | null> = {
            DRAFT: draft.generatedAt,
            APPROVED: draft.approvedAt,
            SENT: draft.sentAt,
          };
          const stepOrder = { DRAFT: 0, APPROVED: 1, SENT: 2 };
          const currentOrder = stepOrder[draft.status];
          const thisOrder = stepOrder[step];
          const isActive = draft.status === step;
          const isDone = thisOrder < currentOrder;
          const ts = timestamps[step];

          return (
            <React.Fragment key={step}>
              {i > 0 && (
                <svg className="w-3 h-6 text-base-300 flex-shrink-0" viewBox="0 0 12 24" fill="none">
                  <path d="M0 0 L12 12 L0 24" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              )}
              <div
                className={[
                  'flex flex-col px-4 py-2',
                  isActive ? 'bg-brand-gold/10 text-brand-primary font-semibold' : '',
                  isDone ? 'text-green-700' : '',
                  !isActive && !isDone ? 'text-content-secondary' : '',
                ].join(' ')}
              >
                <span className="flex items-center gap-1.5">
                  {isDone && (
                    <svg className="w-3 h-3 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-gold flex-shrink-0" />
                  )}
                  {step}
                </span>
                {ts && (
                  <span className="text-content-secondary font-normal text-[10px] mt-0.5">
                    {new Date(ts).toLocaleString('en-AU', { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                )}
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* Subject line */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-content-secondary uppercase tracking-wide">Subject Line</label>
        <input
          type="text"
          value={subject}
          onChange={(e) => {
            setSubject(e.target.value);
            setSaveStatus('unsaved');
          }}
          onBlur={handleSubjectBlur}
          disabled={draft.status !== 'DRAFT'}
          placeholder="Newsletter subject line…"
          className="w-full border border-base-300 rounded px-3 py-2 text-base font-medium text-content bg-base-100 focus:outline-none focus:border-brand-gold disabled:bg-base-200 disabled:text-content-secondary"
        />
        <p className="text-xs text-content-secondary">
          {subject.length}/60 chars{subject.length > 60 && <span className="text-red-500 ml-1">too long</span>}
        </p>
      </div>

      {/* Rich text editor */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-content-secondary uppercase tracking-wide">Content</label>
        <div className="border border-base-300 rounded overflow-hidden bg-base-100">
          {/* Toolbar */}
          <div className="flex items-center gap-1 px-2 py-1.5 border-b border-base-300 bg-base-200 flex-wrap">
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleBold().run()}
              active={editor?.isActive('bold')}
              disabled={draft.status !== 'DRAFT'}
              title="Bold"
            >
              <strong>B</strong>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              active={editor?.isActive('italic')}
              disabled={draft.status !== 'DRAFT'}
              title="Italic"
            >
              <em>I</em>
            </ToolbarButton>
            <span className="w-px h-5 bg-base-300 mx-0.5" />
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
              active={editor?.isActive('heading', { level: 2 })}
              disabled={draft.status !== 'DRAFT'}
              title="Heading 2"
            >
              H2
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
              active={editor?.isActive('heading', { level: 3 })}
              disabled={draft.status !== 'DRAFT'}
              title="Heading 3"
            >
              H3
            </ToolbarButton>
            <span className="w-px h-5 bg-base-300 mx-0.5" />
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
              active={editor?.isActive('bulletList')}
              disabled={draft.status !== 'DRAFT'}
              title="Bullet list"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
              active={editor?.isActive('orderedList')}
              disabled={draft.status !== 'DRAFT'}
              title="Ordered list"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5h12M9 12h12M9 19h12M4 5v.01M4 12v.01M4 19v.01" />
              </svg>
            </ToolbarButton>
            <span className="w-px h-5 bg-base-300 mx-0.5" />
            <ToolbarButton
              onClick={handleSetLink}
              active={editor?.isActive('link')}
              disabled={draft.status !== 'DRAFT'}
              title="Insert/edit link"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </ToolbarButton>
            {editor?.isActive('link') && (
              <ToolbarButton
                onClick={() => editor.chain().focus().unsetLink().run()}
                disabled={draft.status !== 'DRAFT'}
                title="Remove link"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-12.728 12.728M15.536 8.464l-7.072 7.072" />
                </svg>
              </ToolbarButton>
            )}
          </div>

          {/* Editor area */}
          <EditorContent
            editor={editor}
            className={`prose prose-sm max-w-none px-4 py-3 min-h-96 focus-within:outline-none text-content ${
              draft.status !== 'DRAFT' ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          />
        </div>
        {draft.status !== 'DRAFT' && (
          <p className="text-xs text-content-secondary">
            This newsletter is {draft.status.toLowerCase()} and cannot be edited.
          </p>
        )}
      </div>

      {/* Article links panel */}
      {articleLinks.length > 0 && (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-content-secondary uppercase tracking-wide">
            Referenced Articles ({articleLinks.length})
          </label>
          <div className="border border-base-300 rounded bg-base-100 divide-y divide-base-200">
            {articleLinks.map(({ slug, label }) => (
              <div key={slug} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="text-sm text-content truncate flex-1">{label}</span>
                <a
                  href={`/article/${slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-brand-accent hover:underline flex-shrink-0"
                >
                  /article/{slug}
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preview modal */}
      {showPreview && (
        <PreviewModal
          html={currentHtml}
          subject={subject}
          onClose={() => setShowPreview(false)}
        />
      )}

      {/* Send confirmation dialog */}
      {showSendConfirm && (
        <SendConfirmDialog
          draft={draft}
          onConfirm={handleSend}
          onCancel={() => setShowSendConfirm(false)}
          sending={sending}
        />
      )}
    </div>
  );
};

export default NewsletterEditor;
