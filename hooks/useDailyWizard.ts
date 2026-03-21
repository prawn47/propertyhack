import { useState, useEffect, useCallback } from 'react';
import { getApiUrl } from '../services/apiConfig';
import authService from '../services/authService';

export interface DailyWizardRun {
  id: string;
  date: string;
  currentStep: number;
  newsletterId: string | null;
  newsletterApproved: boolean;
  newsletterSent: boolean;
  socialPostsApproved: number;
  hotTakeCreated: boolean;
  hotTakePostId: string | null;
  allPublished: boolean;
  metricsReviewed: boolean;
  completedAt: string | null;
}

interface UseDailyWizardReturn {
  run: DailyWizardRun | null;
  loading: boolean;
  error: string | null;
  currentStep: number;
  goToStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  skipStep: () => void;
  updateRun: (data: Partial<DailyWizardRun>) => Promise<void>;
  completeRun: () => Promise<void>;
  isComplete: boolean;
}

const TOTAL_STEPS = 6;

export function useDailyWizard(): UseDailyWizardReturn {
  const [run, setRun] = useState<DailyWizardRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);

  useEffect(() => {
    async function fetchToday() {
      try {
        setLoading(true);
        setError(null);
        const res = await authService.makeAuthenticatedRequest(
          getApiUrl('/api/admin/daily/today')
        );
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to fetch today\'s run');
        }
        const data: DailyWizardRun = await res.json();
        setRun(data);
        setCurrentStep(data.currentStep);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch today\'s run');
      } finally {
        setLoading(false);
      }
    }
    fetchToday();
  }, []);

  const goToStep = useCallback(async (step: number) => {
    if (step < 1 || step > TOTAL_STEPS) return;
    if (!run) return;

    setCurrentStep(step);
    try {
      const res = await authService.makeAuthenticatedRequest(
        getApiUrl('/api/admin/daily/today'),
        {
          method: 'PATCH',
          body: JSON.stringify({ currentStep: step }),
        }
      );
      if (res.ok) {
        const updated = await res.json();
        setRun(updated);
      }
    } catch {
      // Local state already updated; backend sync is best-effort
    }
  }, [run]);

  const nextStep = useCallback(() => {
    if (currentStep < TOTAL_STEPS) {
      goToStep(currentStep + 1);
    }
  }, [currentStep, goToStep]);

  const prevStep = useCallback(() => {
    if (currentStep > 1) {
      goToStep(currentStep - 1);
    }
  }, [currentStep, goToStep]);

  const skipStep = useCallback(() => {
    nextStep();
  }, [nextStep]);

  const updateRun = useCallback(async (data: Partial<DailyWizardRun>) => {
    try {
      setError(null);
      const res = await authService.makeAuthenticatedRequest(
        getApiUrl('/api/admin/daily/today'),
        {
          method: 'PATCH',
          body: JSON.stringify(data),
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update run');
      }
      const updated: DailyWizardRun = await res.json();
      setRun(updated);
      setCurrentStep(updated.currentStep);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update run');
    }
  }, []);

  const completeRun = useCallback(async () => {
    try {
      setError(null);
      const res = await authService.makeAuthenticatedRequest(
        getApiUrl('/api/admin/daily/today/complete'),
        { method: 'POST' }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to complete run');
      }
      const updated: DailyWizardRun = await res.json();
      setRun(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete run');
    }
  }, []);

  const isComplete = run?.completedAt !== null && run?.completedAt !== undefined;

  return {
    run,
    loading,
    error,
    currentStep,
    goToStep,
    nextStep,
    prevStep,
    skipStep,
    updateRun,
    completeRun,
    isComplete,
  };
}
