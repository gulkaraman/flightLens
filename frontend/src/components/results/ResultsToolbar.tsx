import { CalendarDays } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import type { SearchParams } from '../../lib/types';
import { cn } from '../../lib/cn';
import { EditSearchDialog } from './EditSearchDialog';

interface ResultsToolbarProps {
  params?: SearchParams;
  onEditSearch: (params: SearchParams) => void;
  dailyPricesOpen: boolean;
  onToggleDailyPrices: () => void;
}

function formatDateLong(dateStr?: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return format(d, 'd MMMM EEEE', { locale: tr });
}

export function ResultsToolbar({
  params,
  onEditSearch,
  dailyPricesOpen,
  onToggleDailyPrices
}: ResultsToolbarProps) {
  if (!params) return null;

  const dateLabel = formatDateLong(params.departDate);

  return (
    <div className="sticky top-0 z-40 mb-3 border-b border-slate-200 bg-slate-100/90 py-2 backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-700">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-white px-3 py-1 font-medium text-slate-800 shadow-sm">
            {params.from || 'Nereden'} (Tümü)
          </span>
          <span className="rounded-full bg-white px-3 py-1 font-medium text-slate-800 shadow-sm">
            {params.to || 'Nereye'}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 font-medium text-slate-700 shadow-sm">
            <CalendarDays className="h-3.5 w-3.5 text-slate-500" />
            <span>{dateLabel || 'Tarih seçilmedi'}</span>
          </span>
          <span className="rounded-full bg-slate-900 px-3 py-1 font-medium text-slate-50 shadow-sm">
            {params.tripType === 'roundTrip' ? 'Gidiş-dönüş' : 'Tek yön'}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <EditSearchDialog
            initialParams={params}
            onSubmit={onEditSearch}
          />
          <button
            type="button"
            onClick={onToggleDailyPrices}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium shadow-sm transition',
              dailyPricesOpen
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                : 'border-slate-300 bg-white text-slate-700 hover:border-emerald-400 hover:bg-emerald-50'
            )}
          >
            Günlük tahmini fiyatlar
          </button>
        </div>
      </div>
    </div>
  );
}

