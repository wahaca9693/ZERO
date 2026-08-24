export type ServiceLimits = {
  min: number;
  max: number;
};

function asFiniteInteger(value: unknown): number | null {
  const number = typeof value === "string" && value.trim() === "" ? NaN : Number(value);
  return Number.isSafeInteger(number) ? number : null;
}

export function normalizeServiceLimits(minValue: unknown, maxValue: unknown): ServiceLimits | null {
  const min = asFiniteInteger(minValue);
  const max = asFiniteInteger(maxValue);
  if (min === null || max === null || min < 1 || max < min) return null;
  return { min, max };
}

export function parseProviderServiceLimits(raw: Record<string, unknown>): ServiceLimits | null {
  const minValue = raw.min ?? raw.min_quantity ?? raw.minimum ?? raw.minQuantity;
  const maxValue = raw.max ?? raw.max_quantity ?? raw.maximum ?? raw.maxQuantity;
  return normalizeServiceLimits(minValue, maxValue);
}
