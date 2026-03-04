import { useMemo, useState } from 'react';
import type { FlightResult, SearchParams } from '../../lib/types';
import { formatTRY, parseTryFromText } from '../../lib/format';

interface TripSelectionSummaryProps {
  params: SearchParams;
  totalPassengers: number;
  passengerLabels: string[];
  applyAllPassengers: boolean;
  activePassengerIndex: number;
  onSetActivePassengerIndex: (idx: number) => void;
  onToggleApplyAllPassengers: (next: boolean) => void;
  selectedOutbound: Array<FlightResult | null>;
  selectedReturn?: Array<FlightResult | null>;
  onClearOutboundAt: (idx: number) => void;
  onClearReturnAt?: (idx: number) => void;
}

export function TripSelectionSummary({
  params,
  totalPassengers,
  passengerLabels,
  applyAllPassengers,
  activePassengerIndex,
  onSetActivePassengerIndex,
  onToggleApplyAllPassengers,
  selectedOutbound,
  selectedReturn,
  onClearOutboundAt,
  onClearReturnAt
}: TripSelectionSummaryProps) {
  const [demoMessage, setDemoMessage] = useState<string | null>(null);

  const isRoundTrip = params.tripType === 'roundTrip';

  const priceOf = (f: FlightResult | null): number => {
    if (!f) return 0;
    if (typeof f.priceTry === 'number' && Number.isFinite(f.priceTry)) return f.priceTry;
    const parsed = f.priceText ? parseTryFromText(f.priceText) : null;
    return parsed != null && Number.isFinite(parsed) ? parsed : 0;
  };

  const totals = useMemo(() => {
    const outboundTotal = selectedOutbound.reduce((sum, f) => sum + priceOf(f), 0);
    const returnTotal = (selectedReturn ?? []).reduce((sum, f) => sum + priceOf(f), 0);
    return {
      outboundTotal,
      returnTotal,
      grandTotal: outboundTotal + returnTotal
    };
  }, [selectedOutbound, selectedReturn]);

  const hasAnyOutbound = selectedOutbound.some((f) => f != null);
  const hasAnyReturn = (selectedReturn ?? []).some((f) => f != null);
  const hasSelection = hasAnyOutbound || hasAnyReturn;

  const canContinue = isRoundTrip
    ? selectedOutbound.every((f) => f != null) && (selectedReturn ?? []).every((f) => f != null)
    : selectedOutbound.every((f) => f != null);

  const handleDevam = () => {
    setDemoMessage('Demo mod: ödeme adımı yok.');
    setTimeout(() => setDemoMessage(null), 3000);
  };

  if (!hasSelection) return null;

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 shadow-sm">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-600">
        Seçim özeti
      </h3>

      <div className="mb-3 flex flex-col gap-2 rounded-xl bg-white/70 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-medium text-slate-600">Yolcu seçimi</p>
          <label className="inline-flex cursor-pointer items-center gap-2 text-[11px] text-slate-700">
            <input
              type="checkbox"
              checked={applyAllPassengers}
              onChange={(e) => onToggleApplyAllPassengers(e.target.checked)}
            />
            Tek bir seçimi tüm yolculara uygula
          </label>
        </div>

        {!applyAllPassengers && totalPassengers > 1 && (
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] text-slate-600">Aktif yolcu</p>
            <select
              value={activePassengerIndex}
              onChange={(e) => onSetActivePassengerIndex(Number(e.target.value))}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700"
            >
              {passengerLabels.map((label, idx) => (
                <option key={label} value={idx}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="space-y-2 text-xs text-slate-700">
        <div className="space-y-2">
          <p className="text-[11px] font-medium text-slate-500">Gidiş</p>
          {selectedOutbound.map((flight, idx) => (
            <div
              key={`out-${idx}`}
              className="flex items-center justify-between gap-3 rounded-lg bg-white/80 px-3 py-2"
            >
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="text-[11px] font-medium text-slate-600">
                  {passengerLabels[idx] ?? `Yolcu ${idx + 1}`}
                </p>
                {flight ? (
                  <>
                    <p className="truncate text-[11px] font-semibold text-slate-900">
                      {flight.airline}
                    </p>
                    <p className="truncate text-[11px] text-slate-700">
                      {flight.departTime}{' '}
                      {flight.departAirportCode ? `(${flight.departAirportCode})` : ''} →{' '}
                      {flight.arriveTime ?? '-'}{' '}
                      {flight.arriveAirportCode ? `(${flight.arriveAirportCode})` : ''}
                    </p>
                    {(flight.stopLabel || flight.stopsCount != null) && (
                      <p className="text-[10px] text-slate-500">
                        {flight.isDirect === false || flight.stopsCount
                          ? `${
                              (flight.stopLabel ? flight.stopLabel.toUpperCase() : '1 AKTARMA') +
                              (flight.stopoverCode ? ` • ${flight.stopoverCode}` : '')
                            }`
                          : flight.stopLabel
                            ? flight.stopLabel.toUpperCase()
                            : 'DİREKT'}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-[11px] text-slate-500">Henüz seçim yapılmadı.</p>
                )}
              </div>
              <span className="shrink-0 text-right text-sm font-semibold text-emerald-700">
                {formatTRY(priceOf(flight))}
              </span>
              <button
                type="button"
                onClick={() => onClearOutboundAt(idx)}
                className="shrink-0 text-[10px] text-slate-400 underline hover:text-slate-600"
              >
                Seçimi kaldır
              </button>
            </div>
          ))}
        </div>

        {isRoundTrip && selectedReturn && (
          <div className="space-y-2 pt-2">
            <p className="text-[11px] font-medium text-slate-500">Dönüş</p>
            {selectedReturn.map((flight, idx) => (
              <div
                key={`ret-${idx}`}
                className="flex items-center justify-between gap-3 rounded-lg bg-white/80 px-3 py-2"
              >
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="text-[11px] font-medium text-slate-600">
                    {passengerLabels[idx] ?? `Yolcu ${idx + 1}`}
                  </p>
                  {flight ? (
                    <>
                      <p className="truncate text-[11px] font-semibold text-slate-900">
                        {flight.airline}
                      </p>
                      <p className="truncate text-[11px] text-slate-700">
                        {flight.departTime}{' '}
                        {flight.departAirportCode ? `(${flight.departAirportCode})` : ''} →{' '}
                        {flight.arriveTime ?? '-'}{' '}
                        {flight.arriveAirportCode ? `(${flight.arriveAirportCode})` : ''}
                      </p>
                      {(flight.stopLabel || flight.stopsCount != null) && (
                        <p className="text-[10px] text-slate-500">
                          {flight.isDirect === false || flight.stopsCount
                            ? `${
                                (flight.stopLabel
                                  ? flight.stopLabel.toUpperCase()
                                  : '1 AKTARMA') +
                                (flight.stopoverCode ? ` • ${flight.stopoverCode}` : '')
                              }`
                            : flight.stopLabel
                              ? flight.stopLabel.toUpperCase()
                              : 'DİREKT'}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-[11px] text-slate-500">Henüz seçim yapılmadı.</p>
                  )}
                </div>
                <span className="shrink-0 text-right text-sm font-semibold text-emerald-700">
                  {formatTRY(priceOf(flight))}
                </span>
                <button
                  type="button"
                  onClick={() => onClearReturnAt?.(idx)}
                  className="shrink-0 text-[10px] text-slate-400 underline hover:text-slate-600"
                >
                  Seçimi kaldır
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-emerald-200/80 pt-3">
        <span className="text-sm font-semibold text-slate-800">Toplam</span>
        <span className="text-lg font-bold text-emerald-700">
          {formatTRY(totals.grandTotal)}
        </span>
      </div>
      {canContinue && (
        <button
          type="button"
          onClick={handleDevam}
          className="mt-3 w-full rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-600"
        >
          Devam et
        </button>
      )}
      {demoMessage && (
        <p className="mt-2 text-center text-[11px] text-slate-500">
          {demoMessage}
        </p>
      )}
    </div>
  );
}
