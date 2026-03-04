import { cn } from '../../lib/cn';
import { popularAirports } from '../../data/popular';
import type { FlightSearchPreset } from '../search/FlightSearchBar';

interface PopularAirportsProps {
  onPreset: (preset: FlightSearchPreset) => void;
}

export function PopularAirports({ onPreset }: PopularAirportsProps) {
  return (
    <section className="mx-auto mt-8 w-full max-w-6xl">
      <h2 className="mb-2 text-sm font-semibold tracking-tight text-slate-900 md:text-base">
        Popüler Havalimanları
      </h2>
      <div className="flex flex-wrap gap-2">
        {popularAirports.map((label) => (
          <button
            key={label}
            type="button"
            onClick={() => onPreset({ from: label })}
            className={cn(
              'rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] text-slate-700 shadow-sm transition',
              'hover:border-emerald-400 hover:bg-emerald-50'
            )}
          >
            {label}
          </button>
        ))}
      </div>
    </section>
  );
}

