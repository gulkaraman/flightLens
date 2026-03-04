import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/cn';
import type { SortMode } from '../../lib/types';
import { useFilterStore } from '../../store/filterContext';
import { parseTimeToMinutes } from '../../lib/format';

interface QuickFiltersRowProps {
  onOpenAllFilters: () => void;
}

const sortOptions: { value: SortMode; label: string }[] = [
  { value: 'priceAsc', label: 'Fiyat (artan)' },
  { value: 'priceDesc', label: 'Fiyat (azalan)' },
  { value: 'time', label: 'Kalkış saati' },
  { value: 'duration', label: 'Süre' }
];

export function QuickFiltersRow({ onOpenAllFilters }: QuickFiltersRowProps) {
  const { state, update, setSortBy } = useFilterStore();

  const setTimeRangeLabel = (label: 'night' | 'morning' | 'noon' | 'evening' | 'all') => {
    if (label === 'all') {
      update({ timeRange: undefined });
      return;
    }
    const ranges: Record<typeof label, [string, string]> = {
      night: ['00:00', '06:00'],
      morning: ['06:00', '12:00'],
      noon: ['12:00', '18:00'],
      evening: ['18:00', '23:59'],
      all: ['00:00', '23:59']
    };
    const [start, end] = ranges[label];
    const s = parseTimeToMinutes(start) ?? 0;
    const e = parseTimeToMinutes(end) ?? 23 * 60 + 59;
    update({ timeRange: [s, e] });
  };

  const activeRange = (() => {
    const tr = state.timeRange;
    if (!tr) return 'all';
    const map: Record<string, [number, number]> = {
      night: [0, 360],
      morning: [360, 720],
      noon: [720, 1080],
      evening: [1080, 1439]
    };
    const key = (Object.keys(map) as Array<'night' | 'morning' | 'noon' | 'evening'>).find(
      (k) => map[k][0] === tr[0] && map[k][1] === tr[1]
    );
    return key ?? 'all';
  })();

  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-[0.14em] text-slate-500">
          Sırala:
        </span>
        <div className="relative">
          <select
            className="appearance-none rounded-full border border-slate-300 bg-white px-3 py-1.5 pr-7 text-[11px] font-medium text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none"
            value={state.sortBy}
            onChange={(e) => setSortBy(e.target.value as SortMode)}
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1.5 h-3 w-3 text-slate-400" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setTimeRangeLabel('night')}
          className={cn(
            'rounded-full px-3 py-1 text-[10px]',
            activeRange === 'night'
              ? 'bg-slate-900 text-slate-50'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          )}
        >
          00:00-06:00
        </button>
        <button
          type="button"
          onClick={() => setTimeRangeLabel('morning')}
          className={cn(
            'rounded-full px-3 py-1 text-[10px]',
            activeRange === 'morning'
              ? 'bg-slate-900 text-slate-50'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          )}
        >
          06:00-12:00
        </button>
        <button
          type="button"
          onClick={() => setTimeRangeLabel('noon')}
          className={cn(
            'rounded-full px-3 py-1 text-[10px]',
            activeRange === 'noon'
              ? 'bg-slate-900 text-slate-50'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          )}
        >
          12:00-18:00
        </button>
        <button
          type="button"
          onClick={() => setTimeRangeLabel('evening')}
          className={cn(
            'rounded-full px-3 py-1 text-[10px]',
            activeRange === 'evening'
              ? 'bg-slate-900 text-slate-50'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          )}
        >
          18:00-23:59
        </button>
        <button
          type="button"
          onClick={() => update({ directOnly: !state.directOnly })}
          className={cn(
            'rounded-full px-3 py-1 text-[10px]',
            state.directOnly
              ? 'bg-emerald-500 text-white'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          )}
        >
          Aktarmasız
        </button>
      </div>

      <div>
        <button
          type="button"
          onClick={onOpenAllFilters}
          className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 shadow-sm hover:border-slate-400 hover:bg-slate-50"
        >
          Tüm filtreler
        </button>
      </div>
    </div>
  );
}

