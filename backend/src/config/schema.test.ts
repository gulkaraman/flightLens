import { describe, expect, it } from 'vitest';
import { SearchParamsSchema } from './schema';

const baseParams = {
  tripType: 'oneWay' as const,
  from: 'IST',
  to: 'ESB',
  departDate: '2026-03-10',
  passengers: {
    adults: 1,
    children: 0
  },
  directOnly: false
};

describe('SearchParamsSchema roundTrip validation', () => {
  it('allows oneWay without returnDate', () => {
    const result = SearchParamsSchema.safeParse({
      ...baseParams,
      tripType: 'oneWay'
    });

    expect(result.success).toBe(true);
  });

  it('fails when roundTrip and returnDate is missing', () => {
    const result = SearchParamsSchema.safeParse({
      ...baseParams,
      tripType: 'roundTrip'
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === 'returnDate')).toBe(true);
    }
  });

  it('fails when roundTrip and returnDate is before departDate', () => {
    const result = SearchParamsSchema.safeParse({
      ...baseParams,
      tripType: 'roundTrip',
      departDate: '2026-03-10',
      returnDate: '2026-03-05'
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === 'returnDate')).toBe(true);
    }
  });

  it('passes when roundTrip and returnDate is same or after departDate', () => {
    const sameDay = SearchParamsSchema.safeParse({
      ...baseParams,
      tripType: 'roundTrip',
      departDate: '2026-03-10',
      returnDate: '2026-03-10'
    });

    const laterDay = SearchParamsSchema.safeParse({
      ...baseParams,
      tripType: 'roundTrip',
      departDate: '2026-03-10',
      returnDate: '2026-03-15'
    });

    expect(sameDay.success).toBe(true);
    expect(laterDay.success).toBe(true);
  });
});

