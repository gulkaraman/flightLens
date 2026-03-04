import * as Dialog from '@radix-ui/react-dialog';
import { motion } from 'framer-motion';
import { Plane } from 'lucide-react';
import type { FlightResult, SearchParams } from '../../lib/types';
import { formatTRY, parseTimeToMinutes, parseTryFromText } from '../../lib/format';
import { FareOptionsModal } from './FareOptionsModal';

interface FlightCardProps {
  flight: FlightResult;
  index: number;
  params: SearchParams;
  leg?: 'outbound' | 'return';
  // Eski API (geri uyum için tutuluyor)
  isSelected?: boolean;
  selectLabel?: string;
  // Yeni, daha açık API
  selected?: boolean;
  actionLabel?: string;
  onSelect?: () => void;
}

export function FlightCard({
  flight,
  index,
  params,
  leg,
  isSelected,
  selectLabel,
  selected,
  actionLabel,
  onSelect
}: FlightCardProps) {
  const isPrimary = index === 0;

  const effectiveSelected = selected ?? isSelected ?? false;
  const effectiveActionLabel = actionLabel ?? selectLabel ?? 'Gidişi seç';

  const isReturn = leg === 'return';
  const fromCode =
    flight.departAirportCode ??
    (isReturn ? params.to : params.from).slice(0, 3).toUpperCase();
  const toCode =
    flight.arriveAirportCode ??
    (isReturn ? params.from : params.to).slice(0, 3).toUpperCase();

  const segments: Array<{
    fromCode: string;
    toCode: string;
    departTime: string;
    arriveTime: string;
  }> =
    (flight as any).segments ?? (flight.legs as any) ?? [];

  const computedStops =
    Array.isArray(segments) && segments.length > 0
      ? segments.length - 1
      : flight.stopsCount != null
        ? flight.stopsCount
        : undefined;

  const isNonstop =
    typeof flight.isDirect === 'boolean' ? flight.isDirect : undefined;

  const hasStops =
    isNonstop === false
      ? true
      : isNonstop === true
        ? false
        : (computedStops ?? 0) > 0;

  const primaryStopCode =
    flight.stopoverCode ||
    (segments.length > 1 ? segments[0]?.toCode : undefined) ||
    undefined;

  let totalDurationLabel: string | null = null;
  if (flight.durationMin != null) {
    const h = Math.floor(flight.durationMin / 60);
    const m = flight.durationMin % 60;
    totalDurationLabel = `${h}sa ${m}dk`;
  } else if (segments.length > 0) {
    const first = segments[0];
    const last = segments[segments.length - 1];
    const startMin = parseTimeToMinutes(first.departTime);
    const endMin = parseTimeToMinutes(last.arriveTime);
    if (startMin != null && endMin != null) {
      let diff = endMin - startMin;
      if (diff < 0) {
        // geceyi aşan uçuşlar için +24 saat
        diff += 24 * 60;
      }
      if (diff > 0) {
        const h = Math.floor(diff / 60);
        const m = diff % 60;
        totalDurationLabel = `${h}sa ${m}dk`;
      }
    }
  } else if (flight.departTime && flight.arriveTime) {
    const startMin = parseTimeToMinutes(flight.departTime);
    const endMin = parseTimeToMinutes(flight.arriveTime);
    if (startMin != null && endMin != null) {
      let diff = endMin - startMin;
      if (diff < 0) {
        diff += 24 * 60;
      }
      if (diff > 0) {
        const h = Math.floor(diff / 60);
        const m = diff % 60;
        totalDurationLabel = `${h}sa ${m}dk`;
      }
    }
  }

  // Fiyat türetme: öncelik nested fiyat alanları, sonra backend'in canonical alanları
  const rawPriceText = flight.priceText?.trim() ?? '';
  const isMissingPrice =
    !rawPriceText || /fiyat bulunamadı/i.test(rawPriceText);

  const nestedPrice =
    (flight as any)?.pricing?.total ??
    (flight as any)?.price?.amount ??
    null;

  const numericFromText =
    !nestedPrice && !isMissingPrice && rawPriceText.length > 0
      ? parseTryFromText(rawPriceText) ?? undefined
      : undefined;

  const effectiveNumericPrice =
    typeof nestedPrice === 'number'
      ? nestedPrice
      : typeof flight.priceTry === 'number'
        ? flight.priceTry
        : numericFromText;

  const priceLabel = isMissingPrice
    ? 'Fiyat bulunamadı'
    : effectiveNumericPrice != null
      ? formatTRY(effectiveNumericPrice)
      : rawPriceText;

  if (import.meta.env.DEV) {
    // debug: render edilen flight objesini incelemek için
    // eslint-disable-next-line no-console
    console.log('FlightCard flight:', flight, 'priceLabel:', priceLabel);
  }

  return (
    <FareOptionsModal flight={flight} params={params} leg={leg ?? flight.leg}>
      <Dialog.Trigger asChild>
        <motion.article
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              (e.currentTarget as HTMLElement).click();
            }
          }}
          className={`flex cursor-pointer items-center justify-between gap-4 rounded-3xl border px-4 py-3.5 text-sm shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 md:px-5 md:py-4 ${
            effectiveSelected
              ? 'ring-2 ring-emerald-500 bg-emerald-50 border-emerald-300'
              : isPrimary
                ? 'border-emerald-500/70 bg-emerald-500/10 shadow-emerald-500/40'
                : 'border-slate-200 bg-white shadow-slate-200/60'
          }`}
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          whileHover={{ y: -4, scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          transition={{ duration: 0.35, delay: 0.04 * index }}
        >
          <div className="flex flex-1 items-center gap-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-900 text-xs font-semibold text-slate-50 ring-1 ring-slate-800">
              <Plane className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
                  {flight.airline}
                </p>
              </div>

              {hasStops && primaryStopCode ? (
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-800">
                  <span className="text-base font-semibold text-slate-900">
                    {fromCode} {flight.departTime}
                  </span>
                  <span className="h-px w-6 bg-slate-300" />
                  <span className="text-[11px] font-semibold text-slate-700">
                    {primaryStopCode}
                  </span>
                  <span className="h-px w-6 bg-slate-300" />
                  <span className="text-base font-semibold text-slate-900">
                    {toCode} {flight.arriveTime ?? '-'}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-3 text-xs text-slate-800">
                  <span className="text-base font-semibold text-slate-900">
                    {flight.departTime}
                  </span>
                  <span className="text-[11px] text-slate-500">{fromCode}</span>
                  <span className="h-px w-6 bg-slate-300" />
                  <span className="text-base font-semibold text-slate-900">
                    {flight.arriveTime ?? '-'}
                  </span>
                  <span className="text-[11px] text-slate-500">{toCode}</span>
                </div>
              )}

              {isNonstop === true ? (
                <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
                  DİREKT
                </span>
              ) : isNonstop === false ? (
                <div className="space-y-0.5 text-[11px]">
                  <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-700">
                    AKTARMALI
                  </span>
                  <p className="text-slate-600">
                    {(computedStops ?? 1)} Aktarma
                    {primaryStopCode ? ` (${primaryStopCode})` : ''}
                    {totalDurationLabel ? ` • ${totalDurationLabel}` : ''}
                  </p>
                </div>
              ) : (
                <span className="inline-flex rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                  BİLİNMİYOR
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-1">
            <p
              className={
                isMissingPrice
                  ? 'text-[11px] font-medium text-slate-400'
                  : 'text-sm font-bold text-slate-900'
              }
            >
              {priceLabel}
            </p>
            {onSelect && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect();
                }}
                className="w-full rounded-xl border border-emerald-500 bg-white px-3 py-1 text-[11px] font-medium text-emerald-600 hover:bg-emerald-50"
              >
                {effectiveActionLabel}
              </button>
            )}
            <p className="text-[11px] text-slate-500">
              {totalDurationLabel ?? flight.duration ?? 'Süre bilgisi mevcut değil'}
            </p>
          </div>
        </motion.article>
      </Dialog.Trigger>
    </FareOptionsModal>
  );
}

