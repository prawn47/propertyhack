import { useState, useEffect, useCallback, useRef } from 'react';
import { calculate, CalculatorType } from '../services/calculatorService';
import { getScenario } from '../services/scenarioService';

interface UseCalculatorReturn<TInputs, TOutputs> {
  inputs: TInputs;
  outputs: TOutputs | null;
  isCalculating: boolean;
  error: string | null;
  scenarioLoaded: boolean;
  setInput: <K extends keyof TInputs>(key: K, value: TInputs[K]) => void;
  setInputs: (inputs: TInputs) => void;
  reset: () => void;
}

function parseQueryParams<TInputs>(defaultInputs: TInputs): TInputs {
  const params = new URLSearchParams(window.location.search);
  const overrides: Partial<Record<string, unknown>> = {};

  params.forEach((value, key) => {
    if (key === 'scenario') return;
    const defaultVal = (defaultInputs as Record<string, unknown>)[key];
    if (defaultVal === undefined) return;

    if (typeof defaultVal === 'number') {
      const parsed = Number(value);
      if (!isNaN(parsed)) overrides[key] = parsed;
    } else if (typeof defaultVal === 'boolean') {
      overrides[key] = value === 'true';
    } else {
      overrides[key] = value;
    }
  });

  return { ...defaultInputs, ...overrides };
}

function updateQueryParams(inputs: Record<string, unknown>) {
  const params = new URLSearchParams();
  Object.entries(inputs).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      params.set(key, String(value));
    }
  });
  const newUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState(null, '', newUrl);
}

export function useCalculator<TInputs extends Record<string, unknown>, TOutputs>(
  calculatorType: CalculatorType,
  defaultInputs: TInputs
): UseCalculatorReturn<TInputs, TOutputs> {
  const [inputs, setInputsState] = useState<TInputs>(() =>
    parseQueryParams(defaultInputs)
  );
  const [outputs, setOutputs] = useState<TOutputs | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scenarioLoaded, setScenarioLoaded] = useState(false);

  const defaultInputsRef = useRef(defaultInputs);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track whether the current outputs were loaded from a saved scenario
  // so we can skip recalculation on the initial render after restore.
  const skipNextCalcRef = useRef(false);

  // On mount: detect ?scenario=:id, fetch and restore saved scenario
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const scenarioId = params.get('scenario');
    if (!scenarioId) return;

    const token = localStorage.getItem('accessToken');
    if (!token) {
      // Not logged in — clear the param and proceed normally
      const cleanUrl = window.location.pathname;
      window.history.replaceState(null, '', cleanUrl);
      return;
    }

    getScenario(scenarioId)
      .then((scenario) => {
        if (scenario.inputs) {
          setInputsState(scenario.inputs as TInputs);
        }
        if (scenario.outputs) {
          setOutputs(scenario.outputs as TOutputs);
          skipNextCalcRef.current = true;
        }
        setScenarioLoaded(true);
      })
      .catch(() => {
        // Scenario not found or not owned — just proceed with defaults
      })
      .finally(() => {
        // Clear the ?scenario= param so page refreshes don't re-load
        const cleanParams = new URLSearchParams(window.location.search);
        cleanParams.delete('scenario');
        const cleanUrl = cleanParams.toString()
          ? `${window.location.pathname}?${cleanParams.toString()}`
          : window.location.pathname;
        window.history.replaceState(null, '', cleanUrl);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced API call on input change — skip first run after scenario restore
  useEffect(() => {
    if (skipNextCalcRef.current) {
      skipNextCalcRef.current = false;
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setIsCalculating(true);
      setError(null);
      try {
        const result = await calculate(calculatorType, inputs as Record<string, unknown>);
        setOutputs(result as TOutputs);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Calculation failed');
      } finally {
        setIsCalculating(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inputs, calculatorType]);

  // Update URL query params on input change (for sharing)
  useEffect(() => {
    updateQueryParams(inputs as Record<string, unknown>);
  }, [inputs]);

  const setInput = useCallback(<K extends keyof TInputs>(key: K, value: TInputs[K]) => {
    setInputsState((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setInputs = useCallback((newInputs: TInputs) => {
    setInputsState(newInputs);
  }, []);

  const reset = useCallback(() => {
    setInputsState(defaultInputsRef.current);
    setOutputs(null);
    setError(null);
    setScenarioLoaded(false);
  }, []);

  return { inputs, outputs, isCalculating, error, scenarioLoaded, setInput, setInputs, reset };
}
