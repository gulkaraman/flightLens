import { addDays } from 'date-fns';

export interface DailyEstimate {
  date: string; // YYYY-MM-DD
  price: number;
}

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function generateDailyEstimates(
  basePrice: number,
  startDateISO: string,
  days = 14
): DailyEstimate[] {
  const safeBase = Number.isFinite(basePrice) && basePrice > 0 ? basePrice : 1500;

  const result: DailyEstimate[] = [];

  for (let i = 0; i < days; i += 1) {
    const date = addDays(new Date(startDateISO), i);
    const iso = date.toISOString().slice(0, 10);
    const seed = hashString(iso);
    const variance = (seed % 21) - 10; // -10 .. +10
    const factor = 1 + variance / 100; // +-10%
    const price = Math.round(safeBase * factor);
    result.push({ date: iso, price });
  }

  return result;
}

