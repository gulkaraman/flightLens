import * as Dialog from '@radix-ui/react-dialog';
import * as Slider from '@radix-ui/react-slider';
import * as Checkbox from '@radix-ui/react-checkbox';
import * as Switch from '@radix-ui/react-switch';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import type { FlightResult } from '../../lib/types';
import { formatTRY, parseTimeToMinutes } from '../../lib/format';
import { useFilterStore } from '../../store/filterContext';

interface AllFiltersDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  results: FlightResult[];
}

function normalizePrice(priceText: string): number | null {
  const digits = priceText.replace(/[^\d]/g, '');
  if (!digits) return null;
  const n = Number(digits);
  return Number.isNaN(n) ? null : n;
}

export function AllFiltersDrawer({ open, onOpenChange, results }: AllFiltersDrawerProps) {
  const { state, update } = useFilterStore();

  const prices = results
    .map((r) => normalizePrice(r.priceText))
    .filter((p): p is number => p !== null);
  const minPrice = prices.length ? Math.min(...prices) : 500;
  const maxPrice = prices.length ? Math.max(...prices) : 5000;
  const currentPriceRange = state.priceRange ?? [minPrice, maxPrice];

  const uniqAirlines = Array.from(new Set(results.map((r) => r.airline))).sort();

  const currentTimeRange = state.timeRange ?? [0, 23 * 60 + 59];

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm" />
        <Dialog.Content asChild>
          <motion.div
            className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-3xl rounded-t-3xl border border-slate-200 bg-white p-4 shadow-2xl"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
          >
            <div className="mb-3 flex items-center justify-between">
              <Dialog.Title className="text-sm font-semibold text-slate-900">
                Tüm filtreler
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
            <div className="grid gap-4 text-[11px] text-slate-700 md:grid-cols-2">
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Fiyat aralığı (kişi başı)
                </p>
                <Slider.Root
                  min={minPrice}
                  max={maxPrice}
                  step={50}
                  value={currentPriceRange}
                  onValueChange={([min, max]) => update({ priceRange: [min, max] })}
                  className="relative flex h-5 w-full items-center"
                >
                  <Slider.Track className="relative h-1 flex-1 rounded-full bg-slate-200">
                    <Slider.Range className="absolute h-1 rounded-full bg-emerald-500" />
                  </Slider.Track>
                  <Slider.Thumb className="h-3 w-3 rounded-full bg-white shadow ring-1 ring-slate-300" />
                  <Slider.Thumb className="h-3 w-3 rounded-full bg-white shadow ring-1 ring-slate-300" />
                </Slider.Root>
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>{formatTRY(currentPriceRange[0])}</span>
                  <span>{formatTRY(currentPriceRange[1])}</span>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Kalkış saati aralığı
                </p>
                <Slider.Root
                  min={0}
                  max={23 * 60 + 59}
                  step={30}
                  value={currentTimeRange}
                  onValueChange={([min, max]) => update({ timeRange: [min, max] })}
                  className="relative flex h-5 w-full items-center"
                >
                  <Slider.Track className="relative h-1 flex-1 rounded-full bg-slate-200">
                    <Slider.Range className="absolute h-1 rounded-full bg-sky-500" />
                  </Slider.Track>
                  <Slider.Thumb className="h-3 w-3 rounded-full bg-white shadow ring-1 ring-slate-300" />
                  <Slider.Thumb className="h-3 w-3 rounded-full bg-white shadow ring-1 ring-slate-300" />
                </Slider.Root>
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>En erken</span>
                  <span>En geç</span>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Havayolları
                </p>
                <div className="grid grid-cols-2 gap-1">
                  {uniqAirlines.map((airline) => {
                    const checked = state.airlines.includes(airline);
                    return (
                      <label
                        key={airline}
                        className="flex cursor-pointer items-center gap-1.5 rounded-full bg-slate-50 px-2 py-1 text-[10px] text-slate-700 hover:bg-slate-100"
                      >
                        <Checkbox.Root
                          checked={checked}
                          onCheckedChange={(v) => {
                            const next = v
                              ? [...state.airlines, airline]
                              : state.airlines.filter((a) => a !== airline);
                            update({ airlines: next });
                          }}
                          className="flex h-3.5 w-3.5 items-center justify-center rounded-[4px] border border-slate-300 bg-white data-[state=checked]:border-emerald-500 data-[state=checked]:bg-emerald-500"
                        >
                          <Checkbox.Indicator>
                            <Check className="h-2.5 w-2.5 text-white" />
                          </Checkbox.Indicator>
                        </Checkbox.Root>
                        <span className="truncate">{airline}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Bagaj (min. kg)
                  </p>
                  <Slider.Root
                    min={0}
                    max={30}
                    step={5}
                    value={[state.minBaggageKg ?? 0]}
                    onValueChange={([v]) => update({ minBaggageKg: v })}
                    className="relative flex h-5 w-full items-center"
                  >
                    <Slider.Track className="relative h-1 flex-1 rounded-full bg-slate-200">
                      <Slider.Range className="absolute h-1 rounded-full bg-slate-500" />
                    </Slider.Track>
                    <Slider.Thumb className="h-3 w-3 rounded-full bg-white shadow ring-1 ring-slate-300" />
                  </Slider.Root>
                  <p className="text-[10px] text-slate-500">
                    {state.minBaggageKg ?? 0} kg ve üzeri. Veri olmayan seferler bu filtrede
                    dışarıda kalabilir.
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Direkt uçuş
                  </p>
                  <div className="flex items-center gap-2">
                    <Switch.Root
                      checked={state.directOnly}
                      onCheckedChange={(v) => update({ directOnly: Boolean(v) })}
                      className="relative h-4 w-8 cursor-pointer rounded-full bg-slate-200 data-[state=checked]:bg-emerald-500"
                    >
                      <Switch.Thumb className="block h-3 w-3 translate-x-1 rounded-full bg-white transition-transform data-[state=checked]:translate-x-4" />
                    </Switch.Root>
                    <span className="text-[11px] text-slate-700">Sadece aktarmasız seferler</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

