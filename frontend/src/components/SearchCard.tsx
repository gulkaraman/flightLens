import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import type { SearchParams } from '../lib/types';
import { apiSearch } from '../lib/api';

const tripTypeSchema = z.enum(['oneWay', 'roundTrip']);

const passengersSchema = z.object({
  adults: z.number().int().min(1, 'En az 1 yetişkin'),
  children: z.number().int().min(0)
});

const searchSchema = z
  .object({
    tripType: tripTypeSchema,
    from: z.string().min(2, 'Nereden zorunlu'),
    to: z.string().min(2, 'Nereye zorunlu'),
    departDate: z.string().min(10, 'Gidiş tarihi zorunlu'),
    returnDate: z.string().optional(),
    passengers: passengersSchema
  })
  .refine(
    (v) => (v.tripType === 'oneWay' ? true : Boolean(v.returnDate && v.returnDate.length >= 10)),
    {
      message: 'Gidiş-dönüş için dönüş tarihi zorunlu',
      path: ['returnDate']
    }
  )
  .refine(
    (v) => {
      if (v.tripType === 'oneWay' || !v.returnDate) return true;
      try {
        return new Date(v.returnDate) >= new Date(v.departDate);
      } catch {
        return true;
      }
    },
    {
      message: 'Dönüş tarihi gidiş tarihinden önce olamaz',
      path: ['returnDate']
    }
  );

type SearchFormValues = z.infer<typeof searchSchema>;

interface SearchCardProps {
  initialValues?: Partial<SearchParams>;
}

export function SearchCard({ initialValues }: SearchCardProps) {
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<SearchFormValues>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      tripType: initialValues?.tripType ?? 'oneWay',
      from: initialValues?.from ?? '',
      to: initialValues?.to ?? '',
      departDate: initialValues?.departDate ?? '',
      returnDate: initialValues?.returnDate ?? '',
      passengers: {
        adults: initialValues?.passengers?.adults ?? 1,
        children: initialValues?.passengers?.children ?? 0
      }
    }
  });

  const tripType = watch('tripType');

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);

    const payload: SearchParams = {
      tripType: values.tripType,
      from: values.from.trim(),
      to: values.to.trim(),
      departDate: values.departDate,
      returnDate: values.tripType === 'roundTrip' ? values.returnDate || undefined : undefined,
      passengers: {
        adults: values.passengers.adults,
        children: values.passengers.children
      }
    };

    try {
      const response = await apiSearch(payload);

      navigate('/results', {
        state: {
          fromSearch: true,
          payload: response
        }
      });
    } catch (error) {
      setSubmitError(
        (error as Error).message ||
          'Sonuç alınamadı, lütfen parametreleri ve internet bağlantınızı kontrol edin.'
      );
    }
  });

  return (
    <motion.form
      onSubmit={onSubmit}
      className="mx-auto w-full max-w-3xl rounded-3xl border border-slate-800/80 bg-slate-900/80 p-4 shadow-2xl shadow-slate-950/70 backdrop-blur md:p-6"
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-slate-50 md:text-xl">
            Uçak bileti ara
          </h1>
          <p className="mt-1 text-xs text-slate-400 md:text-sm">
            FlightLens, Obilet uyumlu parametrelerle canlı sonuçları tarar.
          </p>
        </div>
        <div className="inline-flex rounded-full border border-sky-500/60 bg-sky-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-sky-300/90">
          Aktarmasız odaklı arama
        </div>
      </div>

      <div className="mb-4 inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900/80 p-1 text-xs font-medium text-slate-300">
        <button
          type="button"
          onClick={() => {
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            control.setValue('tripType', 'oneWay');
          }}
          className={`flex-1 rounded-full px-3 py-1.5 text-center transition ${
            tripType === 'oneWay'
              ? 'bg-slate-100 text-slate-900 shadow-sm'
              : 'text-slate-400 hover:text-slate-100'
          }`}
        >
          Tek yön
        </button>
        <button
          type="button"
          onClick={() => {
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            control.setValue('tripType', 'roundTrip');
          }}
          className={`flex-1 rounded-full px-3 py-1.5 text-center transition ${
            tripType === 'roundTrip'
              ? 'bg-slate-100 text-slate-900 shadow-sm'
              : 'text-slate-400 hover:text-slate-100'
          }`}
        >
          Gidiş-dönüş
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300">Nereden</label>
          <input
            {...register('from')}
            placeholder="İstanbul, SAW"
            className="w-full rounded-2xl border border-slate-700 bg-slate-900/70 px-3 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
          />
          {errors.from && (
            <p className="text-xs text-rose-400">{errors.from.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300">Nereye</label>
          <input
            {...register('to')}
            placeholder="İzmir, ADB"
            className="w-full rounded-2xl border border-slate-700 bg-slate-900/70 px-3 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
          />
          {errors.to && <p className="text-xs text-rose-400">{errors.to.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300">Gidiş tarihi</label>
          <input
            type="date"
            {...register('departDate')}
            className="w-full rounded-2xl border border-slate-700 bg-slate-900/70 px-3 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
          />
          {errors.departDate && (
            <p className="text-xs text-rose-400">{errors.departDate.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300">Dönüş tarihi</label>
          <input
            type="date"
            {...register('returnDate')}
            disabled={tripType === 'oneWay'}
            className="w-full rounded-2xl border border-slate-700 bg-slate-900/70 px-3 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40 disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-slate-900/50 disabled:text-slate-500"
          />
          {errors.returnDate && (
            <p className="text-xs text-rose-400">{errors.returnDate.message}</p>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 border-t border-slate-800/60 pt-4 md:flex-row md:items-center md:justify-between">
        <Controller
          control={control}
          name="passengers"
          render={({ field }) => {
            const { adults, children } = field.value;
            return (
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-200">
                <div className="flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/70 px-3 py-2">
                  <span className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                    Yetişkin
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        field.onChange({
                          adults: Math.max(1, adults - 1),
                          children
                        })
                      }
                      className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-700 text-xs text-slate-300 hover:border-slate-500 hover:text-slate-50"
                    >
                      −
                    </button>
                    <span className="w-5 text-center text-sm font-medium">{adults}</span>
                    <button
                      type="button"
                      onClick={() =>
                        field.onChange({
                          adults: adults + 1,
                          children
                        })
                      }
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-900 hover:bg-white"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/70 px-3 py-2">
                  <span className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                    Çocuk
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        field.onChange({
                          adults,
                          children: Math.max(0, children - 1)
                        })
                      }
                      className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-700 text-xs text-slate-300 hover:border-slate-500 hover:text-slate-50"
                    >
                      −
                    </button>
                    <span className="w-5 text-center text-sm font-medium">{children}</span>
                    <button
                      type="button"
                      onClick={() =>
                        field.onChange({
                          adults,
                          children: children + 1
                        })
                      }
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-900 hover:bg-white"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            );
          }}
        />

        <div className="flex flex-1 items-center justify-end gap-3">
          {errors.passengers && (
            <p className="text-xs text-rose-400">
              Yolcu bilgilerini kontrol edin (en az 1 yetişkin).
            </p>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-2xl bg-sky-500 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/40 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-200"
          >
            <span>{isSubmitting ? 'Aranıyor...' : 'Ara'}</span>
          </button>
        </div>
        {submitError && (
          <p className="text-xs text-rose-300 md:text-right">
            {submitError || 'Sonuç alınamadı, parametreleri kontrol edin.'}
          </p>
        )}
      </div>
    </motion.form>
  );
}

