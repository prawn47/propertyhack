export type CalculatorType =
  | 'mortgage'
  | 'stamp-duty'
  | 'rental-yield'
  | 'borrowing-power'
  | 'rent-vs-buy'
  | 'uk-transfer-tax'
  | 'ca-transfer-tax'
  | 'us-transfer-tax'
  | 'nz-buying-costs';

// Map frontend calculator types to backend API endpoints + market params
const ENDPOINT_MAP: Record<string, { endpoint: string; market?: string }> = {
  'uk-transfer-tax': { endpoint: 'transfer-tax', market: 'UK' },
  'ca-transfer-tax': { endpoint: 'transfer-tax', market: 'CA' },
  'us-transfer-tax': { endpoint: 'transfer-tax', market: 'US' },
  'nz-buying-costs': { endpoint: 'buying-costs', market: 'NZ' },
};

export async function calculate(
  type: CalculatorType,
  inputs: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const mapping = ENDPOINT_MAP[type];
  const endpoint = mapping ? mapping.endpoint : type;
  const marketParam = mapping?.market ? `?market=${mapping.market}` : '';

  const response = await fetch(`/api/calculators/${endpoint}/calculate${marketParam}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(inputs),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error || `Calculation failed (${response.status})`);
  }

  return response.json();
}
