import { useMemo, useState } from 'react';
import { Star, Check } from 'lucide-react';
import type { FlightResult, SearchParams } from '../../lib/types';
import { formatTRY } from '../../lib/format';
import { generateDailyEstimates } from '../../lib/estimate';
import { cn } from '../../lib/cn';

interface DailyPriceStripProps {
  params: SearchParams;
  results: FlightResult[];
  onSelectDate: (dateISO: string) => void;
}

function normalizePrice(priceText: string): number | null {
  const digits = priceText.replace(/[^\d]/g, '');
  if (!digits) return null;
  const n = Number(digits);
  return Number.isNaN(n) ? null : n;
}

export function DailyPriceStrip({ params, results, onSelectDate }: DailyPriceStripProps) {
  const basePrice = useMemo(() => {
    const prices = results
      .map((r) => normalizePrice(r.priceText))
      .filter((p): p is number => p !== null);
    if (!prices.length) return 1500;
    return Math.min(...prices);
  }, [results]);

  const estimates = useMemo(
    () => generateDailyEstimates(basePrice, params.departDate, 14),
    [basePrice, params.departDate]
  );

  const [selectedDate, setSelectedDate] = useState<string | null>(params.departDate);
  const minPrice = Math.min(...estimates.map((e) => e.price));
  const maxPrice = Math.max(...estimates.map((e) => e.price));

  const cheapest = estimates.find((e) => e.price === minPrice) ?? estimates[0];
  const selected = estimates.find((e) => e.date === (selectedDate ?? params.departDate));

  return (
    <div className="mb-3 rounded-2xl border border-slate-200 bg-white p-3 text-[11px] shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex-1">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Günlük tahmini fiyatlar
          </p>
          <div className="flex items-end gap-1 overflow-x-auto pb-1">
            {estimates.map((e) => {
              const ratio = maxPrice === minPrice ? 0.5 : (e.price - minPrice) / (maxPrice - minPrice);
              const height = 18 + ratio * 30; // px
              const isCheapest = e.date === cheapest.date;
              const isSelected = e.date === selectedDate;
              return (
                <button
                  key={e.date}
                  type="button"
                  onClick={() => setSelectedDate(e.date)}
                  className="group flex flex-col items-center gap-1"
                >
                  <div
                    className={cn(
                      'relative flex h-9 w-5 items-end justify-center rounded-full bg-slate-100 transition-colors group-hover:bg-emerald-50'
                    )}
                  >
                    <div
                      style={{ height }}
                      className={cn(
                        'w-2 rounded-full bg-slate-300 transition-colors group-hover:bg-emerald-400',
                        isSelected && 'bg-emerald-500'
                      )}
                    />
                    {isCheapest && (
                      <Star className="absolute -top-3 h-3 w-3 text-amber-400" />
                    )}
                    {isSelected && (
                      <Check className="absolute -top-3 h-3 w-3 text-emerald-500" />
                    )}
                  </div>
                  <span className="text-[9px] text-slate-500">
                    {new Date(e.date).getDate()}
                  </span>
                  <span className="mt-0.5 hidden whitespace-nowrap rounded-full bg-slate-900 px-2 py-0.5 text-[9px] text-slate-50 group-focus:inline group-hover:inline">
                    {formatTRY(e.price)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex w-full max-w-xs flex-col gap-1 rounded-2xl bg-slate-50 p-2.5 text-[11px] text-slate-700">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Tahmini en ucuz tarih
          </p>
          <p className="text-xs font-medium text-slate-900">
            {cheapest.date} ({formatTRY(cheapest.price)})
          </p>
          {selected && (
            <p className="text-[10px] text-slate-500">
              Seçili tarih: <span className="font-medium">{formatTRY(selected.price)}</span>
            </p>
          )}
          <button
            type="button"
            onClick={() => {
              const date = selected?.date ?? cheapest.date;
              setSelectedDate(date);
              onSelectDate(date);
            }}
            className="mt-1 inline-flex items-center justify-center rounded-full bg-emerald-500 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm hover:bg-emerald-600"
          >
            Seç ve Ara
          </button>
        </div>
      </div>
    </div>
  );
}

