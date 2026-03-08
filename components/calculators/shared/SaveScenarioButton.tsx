import React, { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import type { CalculatorType } from '../../../services/calculatorService';

interface SaveScenarioButtonProps {
  calculatorType: CalculatorType;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown> | null;
  headlineLabel: string;
  headlineValue: string;
  onSave?: () => void;
}

type ModalState = 'idle' | 'open' | 'saving' | 'saved' | 'error';

const CALCULATOR_TYPE_MAP: Record<CalculatorType, string> = {
  'mortgage': 'MORTGAGE',
  'stamp-duty': 'STAMP_DUTY',
  'rental-yield': 'RENTAL_YIELD',
  'borrowing-power': 'BORROWING_POWER',
  'rent-vs-buy': 'RENT_VS_BUY',
};

const SaveScenarioButton: React.FC<SaveScenarioButtonProps> = ({
  calculatorType,
  inputs,
  outputs,
  headlineLabel,
  headlineValue,
  onSave,
}) => {
  const { isAuthenticated } = useAuth();
  const [modalState, setModalState] = useState<ModalState>('idle');
  const [scenarioName, setScenarioName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  if (!isAuthenticated) {
    return (
      <p className="text-sm text-content-secondary">
        <Link to="/login" className="text-brand-gold underline underline-offset-2 hover:text-brand-primary transition-colors">
          Sign in
        </Link>{' '}
        to save and compare your scenarios
      </p>
    );
  }

  const openModal = () => {
    setScenarioName('');
    setErrorMessage('');
    setModalState('open');
  };

  const closeModal = () => {
    setModalState('idle');
  };

  const handleSave = async () => {
    const name = scenarioName.trim();
    if (!name) {
      setErrorMessage('Please enter a name for this scenario.');
      return;
    }

    setModalState('saving');
    setErrorMessage('');

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/scenarios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name,
          calculatorType: CALCULATOR_TYPE_MAP[calculatorType],
          inputs,
          outputs: outputs ?? {},
          headlineLabel,
          headlineValue,
        }),
      });

      if (response.status === 429) {
        setErrorMessage('You have reached the maximum of 100 saved scenarios. Please delete some before saving more.');
        setModalState('error');
        return;
      }

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || 'Save failed');
      }

      setModalState('saved');
      onSave?.();
      setTimeout(() => setModalState('idle'), 2000);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save scenario. Please try again.');
      setModalState('error');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') closeModal();
    if (e.key === 'Enter' && modalState === 'open') handleSave();
  };

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-brand-gold text-brand-primary rounded-lg hover:bg-brand-gold/90 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
        Save Scenario
      </button>

      {/* Modal */}
      {modalState !== 'idle' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="save-scenario-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onKeyDown={handleKeyDown}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-brand-primary/50 backdrop-blur-sm"
            onClick={closeModal}
            aria-hidden="true"
          />

          {/* Dialog */}
          <div className="relative bg-base-100 rounded-xl shadow-strong max-w-sm w-full p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 id="save-scenario-title" className="text-lg font-bold text-brand-primary">
                Save Scenario
              </h2>
              <button
                type="button"
                onClick={closeModal}
                aria-label="Close dialog"
                className="p-1.5 text-content-secondary hover:text-brand-primary rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {modalState === 'saved' ? (
              <div className="flex flex-col items-center gap-2 py-4 text-center">
                <svg className="w-10 h-10 text-brand-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <p className="font-medium text-brand-primary">Scenario saved!</p>
                <Link
                  to="/profile/scenarios"
                  className="text-sm text-brand-gold underline underline-offset-2 hover:text-brand-primary transition-colors"
                >
                  View all scenarios
                </Link>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-1">
                  <label htmlFor="scenario-name" className="text-sm font-medium text-content">
                    Scenario name <span aria-hidden="true">*</span>
                  </label>
                  <input
                    id="scenario-name"
                    type="text"
                    value={scenarioName}
                    onChange={(e) => setScenarioName(e.target.value)}
                    placeholder="e.g. Sydney apartment at 6.5%"
                    autoFocus
                    required
                    aria-required="true"
                    aria-invalid={!!errorMessage}
                    aria-describedby={errorMessage ? 'save-error' : undefined}
                    className="px-3 py-2.5 bg-base-200 border border-base-300 rounded-lg text-content text-sm focus:outline-none focus:border-brand-gold transition-colors"
                  />
                  {errorMessage && (
                    <p id="save-error" role="alert" className="text-xs text-red-600 mt-0.5">
                      {errorMessage}
                    </p>
                  )}
                </div>

                <div className="text-xs text-content-secondary bg-base-200 rounded-lg px-3 py-2">
                  <span className="font-medium">Result:</span> {headlineLabel} — {headlineValue}
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-content border border-base-300 rounded-lg hover:border-brand-gold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={modalState === 'saving'}
                    aria-busy={modalState === 'saving'}
                    className="flex-1 px-4 py-2.5 text-sm font-medium bg-brand-gold text-brand-primary rounded-lg hover:bg-brand-gold/90 transition-colors disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2"
                  >
                    {modalState === 'saving' ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default SaveScenarioButton;
