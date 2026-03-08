import { useState, useEffect, useCallback, useRef } from 'react';
import { calculate, CalculatorType } from '../services/calculatorService';

interface UseCalculatorReturn<TInputs, TOutputs> {
  inputs: TInputs;
  outputs: TOutputs | null;
  isCalculating: boolean;
  error: string | null;
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

  const defaultInputsRef = useRef(defaultInputs);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const scenarioId = params.get('scenario');
    if (!scenarioId) return;

    const token = localStorage.getItem('accessToken');
    if (!token) return;

    fetch(`/api/scenarios/${scenarioId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.inputs) {
          setInputsState(data.inputs as TInputs);
        }
        if (data.outputs) {
          setOutputs(data.outputs as TOutputs);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
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
  }, []);

  return { inputs, outputs, isCalculating, error, setInput, setInputs, reset };
}
