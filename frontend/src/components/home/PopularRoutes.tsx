import { Plane } from 'lucide-react';
import { cn } from '../../lib/cn';
import { formatTRY } from '../../lib/format';
import type { FlightSearchPreset } from '../search/FlightSearchBar';
import { popularRoutes, routeToPreset } from '../../data/popular';

interface PopularRoutesProps {
  onPreset: (preset: FlightSearchPreset) => void;
}

export function PopularRoutes({ onPreset }: PopularRoutesProps) {
  return (
    <section className="mx-auto mt-8 w-full max-w-6xl">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold tracking-tight text-slate-900 md:text-base">
          Popüler Uçuş Rotaları
        </h2>
        <p className="text-[11px] text-slate-500">
          Bir rotaya tıklayarak arama formunu hızlıca doldurabilirsiniz.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
        {popularRoutes.map((route) => (
          <button
            key={`${route.from}-${route.to}`}
            type="button"
            onClick={() => onPreset(routeToPreset(route))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                (e.currentTarget as HTMLButtonElement).click();
              }
            }}
            className={cn(
              'flex flex-col items-start gap-2 rounded-2xl border border-slate-200 bg-white p-3 text-left text-xs text-slate-700 shadow-sm outline-none transition',
              'hover:border-emerald-400 hover:bg-emerald-50/60 hover:shadow-md focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-100'
            )}
          >
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-slate-600">
              <Plane className="h-3 w-3" />
              <span>Uçak bileti</span>
            </span>
            <div className="mt-1">
              <p className="text-sm font-semibold text-slate-900">
                {route.from} → {route.to}
              </p>
              <p className="mt-1 text-[11px] text-emerald-600">
                {formatTRY(route.price)}’den başlayan fiyatlarla
              </p>
              <p className="mt-0.5 text-[10px] text-slate-400 opacity-0 transition-opacity group-hover:opacity-100">
                Hızlı Ara · Bu rota ile sonuçları getir
              </p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

