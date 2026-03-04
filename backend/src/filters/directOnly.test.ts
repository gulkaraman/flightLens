import { describe, it, expect } from 'vitest';
import type { FlightResult } from '../scraper/types';

function passesDirectOnly(flight: Partial<FlightResult>, directOnly: boolean): boolean {
  const legs = (flight.legs as any[]) ?? [];
  const stopsFromLegs =
    Array.isArray(legs) && legs.length > 0 ? legs.length - 1 : undefined;

  const stops =
    stopsFromLegs ??
    (typeof flight.stopsCount === 'number'
      ? flight.stopsCount
      : flight.isDirect === false
        ? 1
        : 0);

  if (!directOnly) return true;
  return stops === 0;
}

describe('passesDirectOnly helper', () => {
  it('keeps both direct and connecting flights when directOnly=false', () => {
    const direct: Partial<FlightResult> = { isDirect: true };
    const connecting: Partial<FlightResult> = { isDirect: false, stopsCount: 1 };

    expect(passesDirectOnly(direct, false)).toBe(true);
    expect(passesDirectOnly(connecting, false)).toBe(true);
  });

  it('filters out connecting flights when directOnly=true', () => {
    const direct: Partial<FlightResult> = { isDirect: true };
    const connecting: Partial<FlightResult> = { isDirect: false, stopsCount: 1 };

    expect(passesDirectOnly(direct, true)).toBe(true);
    expect(passesDirectOnly(connecting, true)).toBe(false);
  });

  it('uses legs length as fallback for stops', () => {
    const withLegs: Partial<FlightResult> = {
      legs: [
        { fromCode: 'IST', toCode: 'AYT', departTime: '08:00', arriveTime: '09:00' },
        { fromCode: 'AYT', toCode: 'ESB', departTime: '10:00', arriveTime: '11:00' }
      ]
    };

    expect(passesDirectOnly(withLegs, false)).toBe(true);
    expect(passesDirectOnly(withLegs, true)).toBe(false);
  });
});

