import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getNewsletters,
  approveNewsletter,
  generateNewsletter,
  NewsletterDraft,
} from '../../../services/adminNewsletterService';
import { getImageUrl } from '../../../services/apiConfig';
import CopyToClipboard from '../../shared/CopyToClipboard';
import ImageEditor from './ImageEditor';
import LoadingSpinner from '../../shared/LoadingSpinner';
import type { DailyWizardRun } from '../../../hooks/useDailyWizard';

interface Step1Props {
  run: DailyWizardRun | null;
  nextStep: () => void;
  skipStep: () => void;
  updateRun: (data: Partial<DailyWizardRun>) => Promise<void>;
}

interface HtmlSection {
  title: string;
  html: string;
}

function parseSections(html: string): HtmlSection[] {
  if (!html) return [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const sections: HtmlSection[] = [];
  let currentTitle = 'Introduction';
  let currentNodes: string[] = [];

  const flush = () => {
    const content = currentNodes.join('');
    if (content.trim()) {
      sections.push({ title: currentTitle, html: content });
    }
    currentNodes = [];
  };

  const body = doc.body;
  for (const node of Array.from(body.childNodes)) {
    const el = node as HTMLElement;
    if (el.tagName === 'H2' || el.tagName === 'H1') {
      flush();
      currentTitle = el.textContent?.trim() || 'Section';
    } else if (el.tagName === 'SECTION') {
      flush();
      const heading = el.querySelector('h1, h2');
      currentTitle = heading?.textContent?.trim() || 'Section';
      currentNodes.push(el.innerHTML);
    } else {
      currentNodes.push(el.outerHTML || el.textContent || '');
    }
  }
  flush();

  if (sections.length === 0 && html.trim()) {
    sections.push({ title: 'Newsletter Content', html });
  }

  return sections;
}

const Step1_NewsletterReview: React.FC<Step1Props> = ({
  run,
  nextStep,
  skipStep,
  updateRun,
}) => {
  const [draft, setDraft] = useState<NewsletterDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const fetchDraft = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getNewsletters({
        jurisdiction: 'AU',
        status: 'DRAFT',
        limit: 1,
      });
      if (res.drafts.length > 0) {
        setDraft(res.drafts[0]);
      } else {
        setDraft(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch newsletter draft');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDraft();
  }, [fetchDraft]);

  const sections = useMemo(() => {
    if (!draft?.htmlContent) return [];
    return parseSections(draft.htmlContent);
  }, [draft?.htmlContent]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const result = await generateNewsletter('AU');
      setDraft(result.draft);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate newsletter');
    } finally {
      setGenerating(false);
    }
  };

  const handleApprove = async () => {
    if (!draft) return;
    setApproving(true);
    setError(null);
    try {
      const updated = await approveNewsletter(draft.id);
      setDraft(updated);
      await updateRun({
        newsletterId: draft.id,
        newsletterApproved: true,
      });
      nextStep();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve newsletter');
    } finally {
      setApproving(false);
    }
  };

  const handleHeroImageChange = useCallback(
    (newImageUrl: string) => {
      if (!draft) return;
      setDraft({ ...draft, heroImageUrl: newImageUrl });
    },
    [draft]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingSpinner />
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="text-center py-16">
        <svg
          className="w-12 h-12 text-content-secondary mx-auto mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
          />
        </svg>
        <p className="text-lg font-medium text-content mb-2">No draft available</p>
        <p className="text-sm text-content-secondary mb-6">
          There is no AU newsletter draft ready for review.
        </p>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm mb-4 max-w-md mx-auto">
            {error}
          </div>
        )}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-5 py-2.5 bg-brand-gold text-brand-primary font-medium rounded-lg hover:bg-brand-gold/90 transition-colors disabled:opacity-50"
          >
            {generating ? 'Generating...' : 'Generate Now'}
          </button>
          <button
            onClick={skipStep}
            className="px-5 py-2.5 text-sm font-medium text-content-secondary hover:text-content transition-colors"
          >
            Skip
          </button>
        </div>
      </div>
    );
  }

  const heroUrl = getImageUrl(draft.heroImageUrl);

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-content">Newsletter Review</h2>
          <p className="text-sm text-content-secondary mt-0.5">
            {draft.jurisdiction} &middot;{' '}
            {new Date(draft.generatedAt).toLocaleString('en-AU', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </p>
        </div>
        <span className="text-xs font-medium px-2.5 py-1 rounded bg-gray-100 text-gray-600 uppercase">
          {draft.status}
        </span>
      </div>

      {/* Subject line */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-content-secondary uppercase tracking-wide">
            Subject Line
          </label>
          <CopyToClipboard content={draft.subject} label="Copy Subject" variant="button" />
        </div>
        <div className="bg-base-200 rounded-lg px-4 py-3">
          <p className="text-base font-medium text-content">{draft.subject}</p>
        </div>
      </div>

      {/* Hero image */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-content-secondary uppercase tracking-wide">
          Hero Image
        </label>
        <ImageEditor
          imageUrl={draft.heroImageUrl}
          onImageChange={handleHeroImageChange}
          aspectRatio="16:9"
          context={{
            title: draft.subject,
            type: 'newsletter',
            market: draft.jurisdiction,
          }}
        />
      </div>

      {/* Newsletter body sections */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-content-secondary uppercase tracking-wide">
            Newsletter Body
          </label>
          <CopyToClipboard
            content={draft.htmlContent}
            label="Copy All"
            format="html"
            variant="button"
          />
        </div>

        <div className="border border-base-300 rounded-lg overflow-hidden divide-y divide-base-200">
          {sections.map((section, i) => (
            <div key={i} className="bg-base-100">
              <div className="flex items-center justify-between px-4 py-2 bg-base-200/50">
                <span className="text-xs font-medium text-content-secondary uppercase tracking-wide">
                  {section.title}
                </span>
                <CopyToClipboard
                  content={section.html}
                  label="Copy"
                  format="html"
                  variant="icon"
                />
              </div>
              <div
                className="prose prose-sm max-w-none px-4 py-3 text-content"
                dangerouslySetInnerHTML={{ __html: section.html }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Global summary if present */}
      {draft.globalSummary && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-content-secondary uppercase tracking-wide">
              Global Property Pulse
            </label>
            <CopyToClipboard
              content={draft.globalSummary}
              label="Copy"
              variant="icon"
            />
          </div>
          <div className="bg-base-200 rounded-lg px-4 py-3">
            <p className="text-sm text-content whitespace-pre-wrap">{draft.globalSummary}</p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-base-200">
        <button
          onClick={skipStep}
          className="px-4 py-2 text-sm font-medium text-content-secondary hover:text-content transition-colors"
        >
          Skip
        </button>
        <div className="flex items-center gap-3">
          <a
            href={`/admin/newsletters/${draft.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 text-sm font-medium border border-base-300 rounded hover:border-brand-gold transition-colors text-content"
          >
            Open Editor
          </a>
          <button
            onClick={handleApprove}
            disabled={approving}
            className="px-5 py-2 bg-brand-gold text-brand-primary font-medium rounded hover:bg-brand-gold/90 transition-colors disabled:opacity-50 text-sm"
          >
            {approving ? 'Approving...' : 'Approve & Continue'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Step1_NewsletterReview;
