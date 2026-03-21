import React from 'react';

interface WizardStepperProps {
  steps: string[];
  currentStep: number;
  completedSteps: number[];
  onStepClick: (step: number) => void;
}

const WizardStepper: React.FC<WizardStepperProps> = ({
  steps,
  currentStep,
  completedSteps,
  onStepClick,
}) => {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {steps.map((label, idx) => {
          const stepNum = idx + 1;
          const isCompleted = completedSteps.includes(stepNum);
          const isActive = stepNum === currentStep;
          const isFuture = !isCompleted && !isActive;
          const isClickable = isCompleted;

          return (
            <React.Fragment key={stepNum}>
              {/* Step indicator */}
              <div className="flex flex-col items-center flex-1">
                <button
                  type="button"
                  onClick={() => isClickable && onStepClick(stepNum)}
                  disabled={!isClickable}
                  className={[
                    'w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-colors',
                    isActive
                      ? 'bg-brand-gold text-brand-primary ring-2 ring-brand-gold/30 ring-offset-2 ring-offset-base-200'
                      : isCompleted
                        ? 'bg-brand-gold/20 text-brand-gold cursor-pointer hover:bg-brand-gold/30'
                        : 'bg-base-300 text-content-secondary',
                    isClickable ? '' : isFuture ? 'cursor-default' : '',
                  ].join(' ')}
                  aria-label={`Step ${stepNum}: ${label}`}
                >
                  {isCompleted ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-5 h-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    stepNum
                  )}
                </button>
                <span
                  className={[
                    'mt-2 text-xs text-center whitespace-nowrap',
                    isActive
                      ? 'text-brand-gold font-bold'
                      : isCompleted
                        ? 'text-brand-gold/70 font-medium'
                        : 'text-content-secondary',
                  ].join(' ')}
                >
                  {label}
                </span>
              </div>

              {/* Connector line between steps */}
              {idx < steps.length - 1 && (
                <div
                  className={[
                    'h-0.5 flex-1 mx-1 mt-[-1.25rem]',
                    completedSteps.includes(stepNum)
                      ? 'bg-brand-gold/40'
                      : 'bg-base-300',
                  ].join(' ')}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default WizardStepper;
