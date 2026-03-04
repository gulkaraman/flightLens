import { cn } from '../../lib/cn';
import { popularAirlines } from '../../data/popular';
import { useSearchStore } from '../../store/searchContext';

function AirlineGlyph({ code }: { code: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className="h-8 w-8"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`airline-${code}`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#0ea5e9" />
        </linearGradient>
      </defs>
      <rect
        x="2"
        y="2"
        width="28"
        height="28"
        rx="10"
        fill="url(#airline-${code})"
      />
      <path
        d="M8 18.5L24 11l-2 4.5 2 1-14 5.5-2-1.5 4-3.5-4-1.5z"
        fill="white"
        fillOpacity="0.9"
      />
    </svg>
  );
}

export function PopularAirlines() {
  const { airlineFilter, setAirlineFilter } = useSearchStore();

  return (
    <section className="mx-auto mt-8 w-full max-w-6xl">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-tight text-slate-900 md:text-base">
          En Çok Tercih Edilen Havayolları
        </h2>
        {airlineFilter && (
          <button
            type="button"
            onClick={() => setAirlineFilter(null)}
            className="text-[11px] text-emerald-600 hover:underline"
          >
            Filtreyi temizle ({airlineFilter})
          </button>
        )}
      </div>
      <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
        {popularAirlines.map((airline) => {
          const active = airlineFilter === airline.name;
          return (
            <button
              key={airline.code}
              type="button"
              onClick={() =>
                setAirlineFilter(active ? null : airline.name)
              }
              className={cn(
                'flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left text-xs text-slate-700 shadow-sm transition',
                'hover:border-emerald-400 hover:bg-emerald-50/60 hover:shadow-md',
                active && 'border-emerald-500 bg-emerald-50'
              )}
            >
              <AirlineGlyph code={airline.code} />
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {airline.name}
                </p>
                <p className="text-[11px] text-slate-500">
                  Filtreye eklemek için tıklayın; sonuç listesinde bu havayolu öne çıkarılabilir.
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

