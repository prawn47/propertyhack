export type CalculatorType =
  | 'mortgage'
  | 'stamp-duty'
  | 'rental-yield'
  | 'borrowing-power'
  | 'rent-vs-buy'
  | 'uk-transfer-tax'
  | 'nz-buying-costs';

export async function calculate(
  type: CalculatorType,
  inputs: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const response = await fetch(`/api/calculators/${type}/calculate`, {
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
