import type { FlightResult } from '../../lib/types';
import { formatTRY, parseTryFromText } from '../../lib/format';

interface SearchSummaryProps {
  selectedFlight: FlightResult | null;
}

export function SearchSummary({ selectedFlight }: SearchSummaryProps) {
  const hasSelection = Boolean(selectedFlight);

  if (!hasSelection) {
    return (
      <div className="rounded-3xl border border-slate-800/80 bg-slate-900/80 p-4 text-xs">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          Seçim özeti
        </p>
        <p className="mt-2 text-xs text-slate-500">Uçuş seçiniz.</p>
      </div>
    );
  }

  const flight = selectedFlight as FlightResult;

  const fromCode = flight.departAirportCode ?? '';
  const toCode = flight.arriveAirportCode ?? '';

  const isDirect = flight.isDirect === true;
  const stopsCount =
    flight.stopsCount != null ? flight.stopsCount : isDirect ? 0 : 1;

  const stopsLabel = isDirect
    ? 'Direkt'
    : `${stopsCount} Aktarma${
        flight.stopoverCode ? ` (${flight.stopoverCode})` : ''
      }`;

  const parsedFromText =
    !flight.priceTry && flight.priceText ? parseTryFromText(flight.priceText) : null;

  const priceText =
    (flight.priceTry != null
      ? formatTRY(flight.priceTry)
      : parsedFromText != null
        ? formatTRY(parsedFromText)
        : flight.priceText && flight.priceText.trim().length > 0
          ? flight.priceText
          : null) ?? 'Fiyat bilgisi mevcut değil';

  return (
    <div className="rounded-3xl border border-slate-800/80 bg-slate-900/80 p-4 text-xs">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
        Seçim özeti
      </p>
      <div className="mt-2 space-y-1 text-slate-200">
        <p className="text-[11px]">
          ✈{' '}
          <span className="font-semibold text-slate-50">
            {flight.airline}
          </span>
        </p>
        <p className="text-[11px] text-slate-300">
          📍 {fromCode || '—'} → {toCode || '—'}
        </p>
        <p className="text-[11px] text-slate-300">
          🕒 {flight.departTime} → {flight.arriveTime ?? '—'}
        </p>
        <p className="text-[11px] text-slate-300">
          🔁 {stopsLabel}
        </p>
        <p className="text-[11px] font-semibold text-emerald-300">
          💰 {priceText}
        </p>
      </div>
    </div>
  );
}

