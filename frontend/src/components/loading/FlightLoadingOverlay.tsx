import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';

interface FlightLoadingOverlayProps {
  open: boolean;
}

export function FlightLoadingOverlay({ open }: FlightLoadingOverlayProps) {
  useEffect(() => {
    if (open) {
      const previous = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = previous;
      };
    }
    return undefined;
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="flight-loading-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/25 backdrop-blur-md pointer-events-auto"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
        >
          <div className="flex flex-col items-center gap-4 rounded-2xl bg-white px-8 py-6 shadow-2xl">
            <div className="relative h-28 w-28">
              <svg
                viewBox="0 0 120 120"
                className="h-28 w-28 text-emerald-500"
                aria-hidden="true"
              >
                <circle
                  cx="60"
                  cy="60"
                  r="34"
                  className="flight-orbit-circle"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.8}
                />
                <g className="flight-orbit-plane" transform="translate(60,60)">
                  <path
                    d="M0-10 L3 0 L0 2 L-3 0 Z"
                    fill="currentColor"
                  />
                </g>
              </svg>
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="flight-spinner h-6 w-6 border-2 border-emerald-500/70 border-t-white bg-white/80" />
              </div>
            </div>
            <div className="text-center text-xs">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                FlightLens
              </p>
              <p className="mt-1 text-sm font-medium text-slate-700">
                Seferler yükleniyor
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

