import * as Dialog from '@radix-ui/react-dialog';
import { motion } from 'framer-motion';
import { Info } from 'lucide-react';
import type { FlightResult, SearchParams } from '../../lib/types';
import { formatTRY } from '../../lib/format';
import { FlightDetailsModal } from './FlightDetailsModal';
import { useState } from 'react';

interface FareOptionsModalProps {
  flight: FlightResult;
  params: SearchParams;
  children: React.ReactNode;
  leg?: 'outbound' | 'return';
}

function parsePrice(priceText: string): number {
  const digits = priceText.replace(/[^\d]/g, '');
  const n = Number(digits);
  if (!digits || Number.isNaN(n)) return 1500;
  return n;
}

export function FareOptionsModal({ flight, params, children, leg }: FareOptionsModalProps) {
  const base = parsePrice(flight.priceText);
  const std = base;
  const flex = Math.round(base * 1.12);
  const prem = Math.round(base * 1.35);

  const [detailsOpen, setDetailsOpen] = useState(false);

  const effectiveLeg = leg ?? flight.leg;
  const isReturn = effectiveLeg === 'return';
  const routeFrom = isReturn ? params.to : params.from;
  const routeTo = isReturn ? params.from : params.to;

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm" />
        <Dialog.Content asChild>
          <motion.div
            className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-4xl rounded-t-3xl border border-slate-200 bg-white p-4 shadow-2xl"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="space-y-1 text-xs">
                {effectiveLeg && (
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    {effectiveLeg === 'return' ? 'Dönüş' : 'Gidiş'}
                  </p>
                )}
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {flight.airline}
                </p>
                <p className="text-sm font-semibold text-slate-900">
                  {flight.departTime} · {routeFrom} → {flight.arriveTime ?? '-'} · {routeTo}
                </p>
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="text-xs text-slate-500 hover:text-slate-700"
                >
                  Kapat
                </button>
              </Dialog.Close>
            </div>

            {flight.legs && flight.legs.length > 0 && (
              <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Uçuş segmentleri
                </p>
                <div className="space-y-2">
                  {flight.legs.map((seg, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-[11px] text-slate-700"
                    >
                      <span className="font-medium">
                        {seg.fromCode} {seg.departTime}
                      </span>
                      <span className="text-slate-400">→</span>
                      <span className="font-medium">
                        {seg.toCode} {seg.arriveTime}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-3 text-[11px] text-slate-700 md:grid-cols-3">
              <FareCard
                title="Standart"
                description="Temel paket, iade ve değişiklik hakkı yoktur."
                bullets={[
                  'İade: Yok',
                  'Değişiklik: Yok',
                  'Kabin bagajı: 8 kg',
                  'Kayıtlı bagaj: 15 kg'
                ]}
                price={std}
                onDetails={() => setDetailsOpen(true)}
              />
              <FareCard
                title="Flex"
                description="Sınırlı değişiklik hakkı, esnek planlar için ideal."
                bullets={[
                  'İade: Kısmen, ücret kesintili',
                  'Değişiklik: 1 kez ücretsiz',
                  'Kabin bagajı: 8 kg',
                  'Kayıtlı bagaj: 20 kg'
                ]}
                price={flex}
                highlight
                onDetails={() => setDetailsOpen(true)}
              />
              <FareCard
                title="Premium"
                description="Cezalı iade ve değişiklik, öncelikli hizmetler."
                bullets={[
                  'İade: Ücret kesintili, koşullu',
                  'Değişiklik: Sınırlı, düşük ceza ile',
                  'Kabin bagajı: 10 kg',
                  'Kayıtlı bagaj: 25 kg',
                  'Öncelikli boarding ve ikram'
                ]}
                price={prem}
                onDetails={() => setDetailsOpen(true)}
              />
            </div>

            <p className="mt-3 flex items-center gap-1 text-[10px] text-slate-500">
              <Info className="h-3 w-3" />
              Bu paketler demo amaçlıdır; gerçek şartlar havayoluna göre değişir.
            </p>

            <FlightDetailsModal
              open={detailsOpen}
              onOpenChange={setDetailsOpen}
              flight={flight}
              params={params}
            />
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

interface FareCardProps {
  title: string;
  description: string;
  bullets: string[];
  price: number;
  highlight?: boolean;
  onDetails: () => void;
}

function FareCard({
  title,
  description,
  bullets,
  price,
  highlight,
  onDetails
}: FareCardProps) {
  return (
    <div
      className={`flex flex-col rounded-2xl border p-3 ${
        highlight
          ? 'border-emerald-500 bg-emerald-50 shadow-md'
          : 'border-slate-200 bg-slate-50'
      }`}
    >
      <p className="text-xs font-semibold text-slate-900">{title}</p>
      <p className="mt-1 text-[10px] text-slate-500">{description}</p>
      <ul className="mt-2 space-y-1 text-[10px] text-slate-600">
        {bullets.map((b) => (
          <li key={b}>• {b}</li>
        ))}
      </ul>
      <div className="mt-auto pt-3">
        <button
          type="button"
          className="inline-flex w-full items-center justify-center rounded-2xl bg-emerald-500 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm hover:bg-emerald-600"
        >
          {formatTRY(price)} · Seç
        </button>
        <button
          type="button"
          onClick={onDetails}
          className="mt-1 w-full text-[10px] text-slate-600 underline hover:text-slate-800"
        >
          Detaylı bilgi
        </button>
      </div>
    </div>
  );
}

