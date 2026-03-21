import React, { useState, useEffect, useCallback } from 'react';
import { getApiUrl, getImageUrl } from '../../../services/apiConfig';
import authService from '../../../services/authService';
import { NewsletterDraft, getNewsletters } from '../../../services/adminNewsletterService';
import CopyToClipboard from '../../shared/CopyToClipboard';
import { DailyWizardRun } from '../../../hooks/useDailyWizard';
import Loader from '../../Loader';

interface Step2Props {
  run: DailyWizardRun;
  updateRun: (data: Partial<DailyWizardRun>) => Promise<void>;
  nextStep: () => void;
  skipStep: () => void;
}

const Step2_NewsletterSend: React.FC<Step2Props> = ({ run, updateRun, nextStep, skipStep }) => {
  const [newsletter, setNewsletter] = useState<NewsletterDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const [subjectCopied, setSubjectCopied] = useState(false);
  const [imageDownloaded, setImageDownloaded] = useState(false);
  const [bodyCopied, setBodyCopied] = useState(false);

  useEffect(() => {
    async function fetchNewsletter() {
      try {
        setLoading(true);
        setError(null);

        if (run.newsletterId) {
          const res = await authService.makeAuthenticatedRequest(
            getApiUrl(`/api/admin/newsletters/${run.newsletterId}`)
          );
          if (res.ok) {
            setNewsletter(await res.json());
            return;
          }
        }

        const data = await getNewsletters({ jurisdiction: 'AU', status: 'APPROVED', limit: 1 });
        if (data.drafts.length > 0) {
          setNewsletter(data.drafts[0]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load newsletter');
      } finally {
        setLoading(false);
      }
    }
    fetchNewsletter();
  }, [run.newsletterId]);

  const downloadImage = useCallback(async () => {
    if (!newsletter?.heroImageUrl) return;
    try {
      const imageUrl = getImageUrl(newsletter.heroImageUrl) || newsletter.heroImageUrl;
      const res = await fetch(imageUrl);
      const blob = await res.blob();

      const date = new Date().toISOString().slice(0, 10);
      const slug = newsletter.subject
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 40);
      const ext = blob.type.includes('png') ? 'png' : 'jpg';
      const filename = `propertyhack-newsletter-${newsletter.jurisdiction.toLowerCase()}-${date}-${slug}.${ext}`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setImageDownloaded(true);
    } catch {
      setError('Failed to download image');
    }
  }, [newsletter]);

  const markAsSent = useCallback(async () => {
    if (!newsletter) return;
    try {
      setSending(true);
      setError(null);
      const res = await authService.makeAuthenticatedRequest(
        getApiUrl(`/api/admin/newsletters/${newsletter.id}/send-manual`),
        { method: 'POST' }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to mark as sent');
      }
      await updateRun({ newsletterSent: true });
      nextStep();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark as sent');
    } finally {
      setSending(false);
    }
  }, [newsletter, updateRun, nextStep]);

  const completedCount = [subjectCopied, imageDownloaded, bodyCopied].filter(Boolean).length;
  const totalItems = newsletter?.heroImageUrl ? 3 : 2;
  const adjustedCount = newsletter?.heroImageUrl
    ? completedCount
    : [subjectCopied, bodyCopied].filter(Boolean).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="h-6 w-6 text-brand-gold" />
      </div>
    );
  }

  if (!newsletter) {
    return (
      <div className="text-center py-12">
        <p className="text-content-secondary">No approved newsletter found.</p>
        <p className="text-sm text-content-secondary mt-1">
          Go back to Step 1 to review and approve a newsletter first.
        </p>
        <button
          onClick={skipStep}
          className="mt-4 px-4 py-2 text-sm font-medium text-content-secondary hover:text-content transition-colors"
        >
          Skip this step
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-content">Send Newsletter via Beehiiv</h2>
        <p className="text-sm text-content-secondary mt-1">
          Copy each item below, then paste into Beehiiv.{' '}
          <span className="font-medium text-brand-gold">
            {adjustedCount} of {totalItems} items ready
          </span>
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-4 mb-6">
        {/* Subject Line */}
        <div className="flex items-center gap-4 p-4 rounded-lg border border-base-300 bg-base-100">
          <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
            {subjectCopied ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-brand-gold" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            ) : (
              <span className="w-5 h-5 rounded-full border-2 border-base-300" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-content">Subject Line</p>
            <p className="text-sm text-content-secondary truncate">{newsletter.subject}</p>
          </div>
          <CopyToClipboard
            content={newsletter.subject}
            label="Copy Subject"
            format="text"
            onCopied={() => setSubjectCopied(true)}
          />
        </div>

        {/* Hero Image */}
        {newsletter.heroImageUrl && (
          <div className="flex items-center gap-4 p-4 rounded-lg border border-base-300 bg-base-100">
            <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
              {imageDownloaded ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-brand-gold" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <span className="w-5 h-5 rounded-full border-2 border-base-300" />
              )}
            </div>
            <div className="flex-1 min-w-0 flex items-center gap-3">
              <img
                src={getImageUrl(newsletter.heroImageUrl)}
                alt="Hero"
                className="w-12 h-12 rounded object-cover flex-shrink-0"
              />
              <div>
                <p className="text-sm font-medium text-content">Hero Image</p>
                <p className="text-sm text-content-secondary">Download and upload to Beehiiv</p>
              </div>
            </div>
            <button
              type="button"
              onClick={downloadImage}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded transition-colors bg-base-200 text-content hover:bg-base-300 border border-base-300 hover:border-brand-gold/30"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Download</span>
            </button>
          </div>
        )}

        {/* Newsletter Body */}
        <div className="flex items-center gap-4 p-4 rounded-lg border border-base-300 bg-base-100">
          <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
            {bodyCopied ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-brand-gold" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            ) : (
              <span className="w-5 h-5 rounded-full border-2 border-base-300" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-content">Newsletter Body</p>
            <p className="text-sm text-content-secondary">Full HTML content for Beehiiv editor</p>
          </div>
          <CopyToClipboard
            content={newsletter.htmlContent}
            label="Copy HTML"
            format="html"
            onCopied={() => setBodyCopied(true)}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-base-300">
        <button
          type="button"
          onClick={() => window.open('https://app.beehiiv.com', '_blank')}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded bg-brand-primary text-white hover:bg-brand-secondary transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Open Beehiiv
        </button>

        <button
          type="button"
          onClick={markAsSent}
          disabled={sending}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded bg-brand-gold text-brand-primary hover:bg-brand-gold/90 transition-colors disabled:opacity-50"
        >
          {sending ? (
            <Loader className="h-4 w-4" />
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          )}
          Mark as Sent
        </button>

        <button
          type="button"
          onClick={skipStep}
          className="px-4 py-2 text-sm font-medium text-content-secondary hover:text-content transition-colors"
        >
          Skip
        </button>
      </div>
    </div>
  );
};

export default Step2_NewsletterSend;
