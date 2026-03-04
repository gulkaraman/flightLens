import { zodResolver } from '@hookform/resolvers/zod';
import * as Checkbox from '@radix-ui/react-checkbox';
import * as Switch from '@radix-ui/react-switch';
import { motion } from 'framer-motion';
import { ArrowLeftRight, Check, Info } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { cn } from '../../lib/cn';
import type { PassengerCounts, SearchParams, TripType } from '../../lib/types';
import { useSearchStore } from '../../store/searchContext';
import { DateButton } from './DateButton';
import { PassengerPicker } from './PassengerPicker';

const passengersSchema = z.object({
  adults: z.number().int().min(1, 'En az 1 yetişkin'),
  children: z.number().int().min(0)
});

const formSchema = z
  .object({
    tripType: z.enum(['oneWay', 'roundTrip']),
    directOnly: z.boolean().optional(),
    from: z.string().min(2, 'Nereden zorunlu'),
    to: z.string().min(2, 'Nereye zorunlu'),
    departDate: z.date({ required_error: 'Gidiş tarihi zorunlu' }),
    returnDate: z.date().optional(),
    passengers: passengersSchema,
    includeHotels: z.boolean().optional()
  })
  .refine(
    (v) => (v.tripType === 'oneWay' ? true : Boolean(v.returnDate)),
    {
      message: 'Gidiş-dönüş için dönüş tarihi zorunlu',
      path: ['returnDate']
    }
  )
  .refine(
    (v) => {
      if (v.tripType === 'oneWay' || !v.returnDate) return true;
      return v.returnDate >= v.departDate;
    },
    {
      message: 'Dönüş tarihi gidiş tarihinden önce olamaz',
      path: ['returnDate']
    }
  );

type FormValues = z.infer<typeof formSchema>;

export interface FlightSearchPreset {
  from?: string;
  to?: string;
  departDate?: Date;
  returnDate?: Date;
  passengers?: PassengerCounts;
}

interface FlightSearchBarProps {
  initial?: Partial<SearchParams>;
  preset?: FlightSearchPreset;
  onSubmit: (params: SearchParams) => void;
}

export function FlightSearchBar({ initial, preset, onSubmit }: FlightSearchBarProps) {
  const { setLastSearch } = useSearchStore();
  const [hotelsHintVisible, setHotelsHintVisible] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tripType: initial?.tripType ?? 'oneWay',
      directOnly: initial?.directOnly ?? false,
      from: initial?.from ?? '',
      to: initial?.to ?? '',
      departDate: initial?.departDate ? new Date(initial.departDate) : new Date(),
      returnDate: initial?.returnDate ? new Date(initial.returnDate) : undefined,
      passengers: initial?.passengers ?? { adults: 1, children: 0 },
      includeHotels: false
    }
  });

  const tripType = watch('tripType');

  useEffect(() => {
    if (!preset) return;
    if (preset.from !== undefined) {
      setValue('from', preset.from);
    }
    if (preset.to !== undefined) {
      setValue('to', preset.to);
    }
    if (preset.departDate) {
      setValue('departDate', preset.departDate);
    }
    if (preset.returnDate) {
      setValue('returnDate', preset.returnDate);
    }
    if (preset.passengers) {
      setValue('passengers', preset.passengers);
    }
  }, [preset, setValue]);

  const submitHandler = handleSubmit((values) => {
    const params: SearchParams = {
      tripType: values.tripType,
      from: values.from.trim(),
      to: values.to.trim(),
      departDate: values.departDate.toISOString().slice(0, 10),
      returnDate:
        values.tripType === 'roundTrip' && values.returnDate
          ? values.returnDate.toISOString().slice(0, 10)
          : undefined,
      passengers: values.passengers,
      directOnly: values.directOnly
    };

    // global store
    setLastSearch(params);
    // parent callback
    onSubmit(params);
    // debug
    // eslint-disable-next-line no-console
    console.log('SearchParams from FlightSearchBar: tripType=%s directOnly=%s', params.tripType, params.directOnly);
  });

  const swapRoute = () => {
    const currentFrom = watch('from');
    const currentTo = watch('to');
    setValue('from', currentTo);
    setValue('to', currentFrom);
  };

  const setTripType = (type: TripType) => {
    setValue('tripType', type, { shouldValidate: true });
  };

  return (
    <motion.form
      onSubmit={submitHandler}
      className="fl-surface mx-auto w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-4 shadow-md md:p-5"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <div className="mb-3 flex items-center justify-between gap-3 text-xs">
        <div className="inline-flex items-center gap-1 rounded-full bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setTripType('oneWay')}
            className={cn(
              'rounded-full px-3 py-1 font-medium transition',
              tripType === 'oneWay'
                ? 'bg-slate-900 text-slate-50'
                : 'text-slate-500 hover:text-slate-900'
            )}
          >
            Tek yön
          </button>
          <button
            type="button"
            onClick={() => setTripType('roundTrip')}
            className={cn(
              'rounded-full px-3 py-1 font-medium transition',
              tripType === 'roundTrip'
                ? 'bg-slate-900 text-slate-50'
                : 'text-slate-500 hover:text-slate-900'
            )}
          >
            Gidiş-dönüş
          </button>
        </div>

        <Controller
          control={control}
          name="directOnly"
          render={({ field }) => (
            <label className="inline-flex cursor-pointer items-center gap-2 text-[11px] text-slate-600">
              <Checkbox.Root
                checked={field.value ?? false}
                onCheckedChange={(v) => field.onChange(Boolean(v))}
                className="flex h-4 w-4 items-center justify-center rounded-[4px] border border-slate-300 bg-white data-[state=checked]:border-emerald-500 data-[state=checked]:bg-emerald-500"
              >
                <Checkbox.Indicator>
                  <Check className="h-3 w-3 text-white" />
                </Checkbox.Indicator>
              </Checkbox.Root>
              <span>Aktarmasız</span>
            </label>
          )}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-[minmax(0,2fr)_auto_minmax(0,2fr)_minmax(0,2fr)]">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
            Nereden
          </span>
          <Controller
            control={control}
            name="from"
            render={({ field }) => (
              <input
                {...field}
                placeholder="İstanbul, SAW"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-slate-400"
              />
            )}
          />
          {errors.from && (
            <p className="text-[11px] text-rose-500">{errors.from.message}</p>
          )}
        </div>

        <div className="flex items-end justify-center">
          <button
            type="button"
            onClick={swapRoute}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
          >
            <ArrowLeftRight className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
            Nereye
          </span>
          <Controller
            control={control}
            name="to"
            render={({ field }) => (
              <input
                {...field}
                placeholder="İzmir, ADB"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-slate-400"
              />
            )}
          />
          {errors.to && <p className="text-[11px] text-rose-500">{errors.to.message}</p>}
        </div>

        <div className="flex flex-col gap-1 md:pl-2">
          <Controller
            control={control}
            name="departDate"
            render={({ field }) => (
              <DateButton
                label="Gidiş"
                value={field.value}
                onChange={(d) => field.onChange(d)}
                placeholder="Gidiş tarihi"
              />
            )}
          />
          {errors.departDate && (
            <p className="text-[11px] text-rose-500">
              {errors.departDate.message?.toString()}
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="w-full max-w-[180px]">
            {tripType === 'oneWay' ? (
              <button
                type="button"
                onClick={() => setTripType('roundTrip')}
                className="mt-4 inline-flex w-full items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-[11px] font-medium text-slate-600 hover:border-slate-400"
              >
                + Dönüş ekle
              </button>
            ) : (
              <Controller
                control={control}
                name="returnDate"
                render={({ field }) => (
                  <DateButton
                    label="Dönüş"
                    value={field.value}
                    onChange={(d) => field.onChange(d)}
                    placeholder="Dönüş tarihi"
                  />
                )}
              />
            )}
            {errors.returnDate && (
              <p className="mt-1 text-[11px] text-rose-500">
                {errors.returnDate.message?.toString()}
              </p>
            )}
          </div>

          <div className="w-full max-w-xs">
            <Controller
              control={control}
              name="passengers"
              render={({ field }) => (
                <PassengerPicker value={field.value} onChange={field.onChange} />
              )}
            />
          </div>
        </div>

        <div className="flex items-end gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center rounded-2xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-400/40 transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isSubmitting ? 'Aranıyor...' : 'Uçuş Ara'}
          </button>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-600">
        <Controller
          control={control}
          name="includeHotels"
          render={({ field }) => (
            <div className="flex items-center gap-2">
              <Switch.Root
                checked={field.value ?? false}
                onCheckedChange={(v) => {
                  field.onChange(Boolean(v));
                  setHotelsHintVisible(true);
                }}
                className="relative h-4 w-8 cursor-pointer rounded-full bg-slate-200 data-[state=checked]:bg-emerald-500"
              >
                <Switch.Thumb className="block h-3 w-3 translate-x-1 rounded-full bg-white transition-transform data-[state=checked]:translate-x-4" />
              </Switch.Root>
              <span>Varış noktasındaki otelleri listele</span>
            </div>
          )}
        />

        {hotelsHintVisible && (
          <div className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[10px] text-slate-500">
            <Info className="h-3 w-3" />
            <span>Oteller entegrasyonu yakında · şu an sadece UI</span>
          </div>
        )}
      </div>
    </motion.form>
  );
}

