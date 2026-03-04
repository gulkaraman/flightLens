import * as Dialog from '@radix-ui/react-dialog';
import { motion } from 'framer-motion';
import type { FlightResult, SearchParams } from '../../lib/types';

interface FlightDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flight: FlightResult;
  params: SearchParams;
}

export function FlightDetailsModal({
  open,
  onOpenChange,
  flight,
  params
}: FlightDetailsModalProps) {
  const flightNo = `${flight.airline.slice(0, 2).toUpperCase()} ${Math.floor(
    Math.random() * 900 + 100
  )}`;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm" />
        <Dialog.Content asChild>
          <motion.div
            className="fixed inset-x-0 top-1/2 z-50 mx-auto w-full max-w-md -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.2 }}
          >
            <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-2">
              <Dialog.Title className="text-sm font-semibold text-slate-900">
                Detaylı Bilgi
              </Dialog.Title>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="text-xs text-slate-500 hover:text-slate-700"
                >
                  Kapat
                </button>
              </Dialog.Close>
            </div>
            <div className="space-y-3 text-[11px] text-slate-700">
              <p>
                <span className="font-semibold">{flight.airline}</span> · Uçuş no:{' '}
                <span className="font-mono">{flightNo}</span>
              </p>
              <p>Cabin sınıfı: Ekonomi (demo)</p>
              <p>Bagaj hakkı: 15 kg kayıtlı bagaj + 8 kg kabin (demo)</p>
              <div className="mt-3 space-y-2 rounded-xl bg-slate-50 p-2.5">
                {flight.legs && flight.legs.length > 0 ? (
                  <div className="relative pl-4">
                    <div className="absolute left-1 top-1 bottom-1 w-px bg-slate-300" />
                    <div className="space-y-2">
                      {flight.legs.map((seg, idx) => (
                        <div key={idx} className="relative flex items-center gap-3 text-xs">
                          <div className="absolute -left-1.5 h-2.5 w-2.5 rounded-full bg-emerald-500" />
                          <div>
                            <p className="text-[11px] font-semibold text-slate-900">
                              {seg.fromCode} {seg.departTime} → {seg.toCode} {seg.arriveTime}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <p className="text-[11px] font-semibold text-slate-900">
                        {flight.departTime}{' '}
                      </p>
                      <p className="text-[11px] text-slate-600">{params.from}</p>
                    </div>
                    <div className="text-[11px] text-slate-400">→</div>
                    <div className="text-right">
                      <p className="text-[11px] font-semibold text-slate-900">
                        {flight.arriveTime ?? '-'}{' '}
                      </p>
                      <p className="text-[11px] text-slate-600">{params.to}</p>
                    </div>
                  </div>
                )}
                <p className="mt-1 text-[10px] text-slate-500">
                  Bu bilgiler demo amaçlıdır; gerçek sefer detayları rezervasyon adımında
                  görüntülenmelidir.
                </p>
              </div>
            </div>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

