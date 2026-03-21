import { useState, useEffect, useCallback, useRef } from 'react';
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
  refreshRun: () => Promise<void>;
}

const TOTAL_STEPS = 6;
const AUTO_SAVE_DELAY = 2000;
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY = 1000;

async function patchWithRetry(
  url: string,
  body: Partial<DailyWizardRun>,
  retries = MAX_RETRIES
): Promise<Response> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await authService.makeAuthenticatedRequest(url, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      if (res.ok) return res;
      // Non-retryable client errors (4xx except 429)
      if (res.status >= 400 && res.status < 500 && res.status !== 429) {
        return res;
      }
      lastError = new Error(`Server error: ${res.status}`);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error('Network error');
    }
    if (attempt < retries - 1) {
      await new Promise((r) => setTimeout(r, BASE_RETRY_DELAY * Math.pow(2, attempt)));
    }
  }
  throw lastError || new Error('Request failed after retries');
}

export function useDailyWizard(): UseDailyWizardReturn {
  const [run, setRun] = useState<DailyWizardRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);

  // Dirty state tracking for debounced auto-save
  const pendingSave = useRef<Partial<DailyWizardRun> | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  // Flush pending saves to backend
  const flushSave = useCallback(async () => {
    const data = pendingSave.current;
    if (!data) return;
    pendingSave.current = null;

    try {
      const res = await patchWithRetry(
        getApiUrl('/api/admin/daily/today'),
        data
      );
      if (res.ok && isMounted.current) {
        const updated: DailyWizardRun = await res.json();
        setRun(updated);
      } else if (!res.ok && isMounted.current) {
        const err = await res.json().catch(() => ({ error: 'Save failed' }));
        setError(err.error || 'Failed to save wizard state');
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Failed to save wizard state');
        // Retain the pending data so next save attempt includes it
        pendingSave.current = { ...data, ...pendingSave.current };
      }
    }
  }, []);

  // Queue a debounced save
  const queueSave = useCallback(
    (data: Partial<DailyWizardRun>) => {
      pendingSave.current = { ...pendingSave.current, ...data };
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      saveTimerRef.current = setTimeout(() => {
        saveTimerRef.current = null;
        flushSave();
      }, AUTO_SAVE_DELAY);
    },
    [flushSave]
  );

  // Immediate save — flushes any pending + saves new data now
  const saveNow = useCallback(
    async (data: Partial<DailyWizardRun>) => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      pendingSave.current = { ...pendingSave.current, ...data };
      await flushSave();
    },
    [flushSave]
  );

  const fetchToday = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await authService.makeAuthenticatedRequest(
        getApiUrl('/api/admin/daily/today')
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to fetch today's run");
      }
      const data: DailyWizardRun = await res.json();
      if (isMounted.current) {
        setRun(data);
        setCurrentStep(data.currentStep);
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : "Failed to fetch today's run");
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchToday();
  }, [fetchToday]);

  const refreshRun = useCallback(async () => {
    try {
      setError(null);
      const res = await authService.makeAuthenticatedRequest(
        getApiUrl('/api/admin/daily/today')
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to refresh run");
      }
      const data: DailyWizardRun = await res.json();
      if (isMounted.current) {
        setRun(data);
        setCurrentStep(data.currentStep);
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : "Failed to refresh run");
      }
    }
  }, []);

  const goToStep = useCallback(
    async (step: number) => {
      if (step < 1 || step > TOTAL_STEPS) return;
      if (!run) return;

      setCurrentStep(step);
      // Immediate save on step transitions — don't debounce navigation
      await saveNow({ currentStep: step });
    },
    [run, saveNow]
  );

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

  const updateRun = useCallback(
    async (data: Partial<DailyWizardRun>) => {
      try {
        setError(null);
        // Optimistically update local state
        setRun((prev) => (prev ? { ...prev, ...data } : prev));
        // Debounced save for field updates; immediate for step changes
        if ('currentStep' in data) {
          await saveNow(data);
        } else {
          queueSave(data);
        }
      } catch (err) {
        if (isMounted.current) {
          setError(err instanceof Error ? err.message : 'Failed to update run');
        }
      }
    },
    [saveNow, queueSave]
  );

  const completeRun = useCallback(async () => {
    // Flush any pending saves before completing
    if (pendingSave.current) {
      await flushSave();
    }
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
      if (isMounted.current) {
        setRun(updated);
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Failed to complete run');
      }
    }
  }, [flushSave]);

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
    refreshRun,
  };
}
