import React from 'react';
import { useDailyWizard } from '../../../hooks/useDailyWizard';
import WizardStepper from './WizardStepper';
import Step2_NewsletterSend from './Step2_NewsletterSend';
import Step3_SocialReview from './Step3_SocialReview';
import Step4_HotTake from './Step4_HotTake';
import Step6_Metrics from './Step6_Metrics';
import Loader from '../../Loader';

const STEP_LABELS = ['Newsletter', 'Send', 'Social', 'Hot Take', 'Publish', 'Metrics'];

const DailyWizard: React.FC = () => {
  const {
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
  } = useDailyWizard();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader className="h-8 w-8 text-brand-gold" />
      </div>
    );
  }

  if (error && !run) {
    return (
      <div className="max-w-3xl mx-auto py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-700 font-medium">Failed to load today's run</p>
          <p className="text-red-600 text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (isComplete && run) {
    return (
      <div className="max-w-3xl mx-auto py-12">
        <div className="bg-base-100 rounded-lg shadow-soft p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-brand-gold/20 flex items-center justify-center mx-auto mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-8 h-8 text-brand-gold"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-content mb-2">Today's Run Complete</h2>
          <p className="text-content-secondary mb-1">
            Completed at {new Date(run.completedAt!).toLocaleTimeString()}
          </p>
          <div className="flex flex-wrap gap-3 justify-center mt-4 text-sm text-content-secondary">
            {run.newsletterApproved && <span className="bg-base-200 px-3 py-1 rounded-full">Newsletter approved</span>}
            {run.newsletterSent && <span className="bg-base-200 px-3 py-1 rounded-full">Newsletter sent</span>}
            {run.socialPostsApproved > 0 && (
              <span className="bg-base-200 px-3 py-1 rounded-full">
                {run.socialPostsApproved} social posts approved
              </span>
            )}
            {run.hotTakeCreated && <span className="bg-base-200 px-3 py-1 rounded-full">Hot take created</span>}
            {run.allPublished && <span className="bg-base-200 px-3 py-1 rounded-full">All published</span>}
            {run.metricsReviewed && <span className="bg-base-200 px-3 py-1 rounded-full">Metrics reviewed</span>}
          </div>
          <button
            onClick={() => goToStep(1)}
            className="mt-6 px-5 py-2 bg-brand-primary text-white rounded hover:bg-brand-secondary transition-colors text-sm font-medium"
          >
            Start Over
          </button>
        </div>
      </div>
    );
  }

  const completedSteps = run
    ? Array.from({ length: run.currentStep - 1 }, (_, i) => i + 1)
    : [];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-content">Daily Run</h1>
        <p className="text-content-secondary text-sm mt-1">
          {new Date().toLocaleDateString('en-AU', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      <div className="bg-base-100 rounded-lg shadow-soft p-6 mb-6">
        <WizardStepper
          steps={STEP_LABELS}
          currentStep={currentStep}
          completedSteps={completedSteps}
          onStepClick={goToStep}
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-base-100 rounded-lg shadow-soft p-8 mb-6">
        {currentStep === 2 && run ? (
          <Step2_NewsletterSend
            run={run}
            updateRun={updateRun}
            nextStep={nextStep}
            skipStep={skipStep}
          />
        ) : currentStep === 4 && run ? (
          <Step4_HotTake
            run={run}
            updateRun={updateRun}
            nextStep={nextStep}
            skipStep={skipStep}
          />
        ) : currentStep === 6 ? (
          <Step6_Metrics onComplete={completeRun} />
        ) : (
          <div className="text-center py-12">
            <p className="text-lg text-content font-medium">
              Step {currentStep}: {STEP_LABELS[currentStep - 1]}
            </p>
            <p className="text-content-secondary mt-2">Coming soon</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={prevStep}
          disabled={currentStep <= 1}
          className={[
            'px-4 py-2 rounded text-sm font-medium transition-colors',
            currentStep <= 1
              ? 'bg-base-300 text-content-secondary cursor-not-allowed'
              : 'bg-brand-primary text-white hover:bg-brand-secondary',
          ].join(' ')}
        >
          Back
        </button>

        <button
          onClick={skipStep}
          className="px-4 py-2 text-sm font-medium text-content-secondary hover:text-content transition-colors"
        >
          Skip
        </button>

        {currentStep < 6 ? (
          <button
            onClick={nextStep}
            className="px-4 py-2 rounded text-sm font-medium bg-brand-gold text-brand-primary hover:bg-brand-gold/90 transition-colors"
          >
            Next
          </button>
        ) : (
          <button
            onClick={completeRun}
            className="px-4 py-2 rounded text-sm font-medium bg-brand-gold text-brand-primary hover:bg-brand-gold/90 transition-colors"
          >
            Complete Run
          </button>
        )}
      </div>
    </div>
  );
};

export default DailyWizard;
