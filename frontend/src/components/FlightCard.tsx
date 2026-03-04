import { motion } from 'framer-motion';
import type { FlightResult } from '../lib/types';

interface FlightCardProps {
  flight: FlightResult;
  index: number;
}

export function FlightCard({ flight, index }: FlightCardProps) {
  const isPrimary = index === 0;

  return (
    <motion.article
      className={`flex items-center justify-between gap-4 rounded-3xl border px-4 py-3.5 text-sm shadow-sm md:px-5 md:py-4 ${
        isPrimary
          ? 'border-sky-500/60 bg-sky-500/10 shadow-sky-500/40'
          : 'border-slate-800/80 bg-slate-900/80 shadow-slate-950/40'
      }`}
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.35, delay: 0.04 * index }}
    >
      <div className="flex flex-1 items-center gap-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-950/80 text-xs font-semibold text-slate-100 ring-1 ring-slate-700">
          {flight.airline.slice(0, 2).toUpperCase()}
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              {flight.airline}
            </p>
            {flight.directOnly && (
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-300">
                Aktarmasız
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-200">
            <span className="text-base font-semibold text-slate-50">
              {flight.departTime}
            </span>
            {flight.arriveTime && (
              <>
                <span className="h-px w-6 bg-slate-700" />
                <span className="text-base font-semibold text-slate-50">
                  {flight.arriveTime}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col items-end gap-1">
        <p
          className={`text-sm font-semibold ${
            isPrimary ? 'text-sky-200' : 'text-slate-100'
          }`}
        >
          {flight.priceText}
        </p>
        <p className="text-[11px] text-slate-500">
          {flight.duration ? flight.duration : 'Süre bilgisi mevcut değil'}
        </p>
      </div>
    </motion.article>
  );
}

