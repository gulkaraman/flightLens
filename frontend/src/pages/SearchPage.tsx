import { motion } from 'framer-motion';
import { useState } from 'react';
import { addDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { HeroAnimation } from '../components/HeroAnimation';
import { PageTransition } from '../components/PageTransition';
import { FlightSearchBar, type FlightSearchPreset } from '../components/search/FlightSearchBar';
import { useSearchStore } from '../store/searchContext';
import { PopularRoutes } from '../components/home/PopularRoutes';
import { PopularTabs } from '../components/home/PopularTabs';
import { PopularAirports } from '../components/home/PopularAirports';
import { PopularAirlines } from '../components/home/PopularAirlines';
import { domesticTabs, internationalTabs } from '../data/popular';
import type { SearchParams } from '../lib/types';

export function SearchPage() {
  const { lastSearch } = useSearchStore();
  const navigate = useNavigate();
  const [preset, setPreset] = useState<FlightSearchPreset | undefined>(() => {
    if (!lastSearch) return undefined;
    return {
      from: lastSearch.from,
      to: lastSearch.to,
      departDate: new Date(lastSearch.departDate),
      returnDate: lastSearch.returnDate ? new Date(lastSearch.returnDate) : undefined,
      passengers: lastSearch.passengers
    };
  });

  const handlePresetSearch = (p: FlightSearchPreset) => {
    const depart = p.departDate ?? addDays(new Date(), 7);

    const params: SearchParams = {
      tripType: 'oneWay',
      from: (p.from ?? '').trim(),
      to: (p.to ?? '').trim(),
      departDate: depart.toISOString().slice(0, 10),
      passengers: p.passengers ?? { adults: 1, children: 0 },
      directOnly: false
    };

    setPreset(p);

    navigate('/results', {
      state: {
        fromSearch: true,
        params
      }
    });
  };

  return (
    <PageTransition>
      <div className="flex flex-1 flex-col gap-6 bg-slate-100 py-4 md:py-6">
        <section className="mx-auto flex w-full max-w-3xl flex-col gap-3 text-center md:gap-4">
          <motion.h1
            className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            Akıllı uçuş keşfi ile{' '}
            <span className="bg-gradient-to-r from-sky-400 via-cyan-300 to-emerald-300 bg-clip-text text-transparent">
              en temiz rotayı
            </span>{' '}
            bul.
          </motion.h1>
          <motion.p
            className="text-xs text-slate-500 md:text-sm"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut', delay: 0.08 }}
          >
            FlightLens, Obilet uçak bileti sayfasını tarayıp aktarmasız uçuşları öne çıkarır. Arama
            parametrelerin backend tarafında type-safe olarak doğrulanır.
          </motion.p>
          <HeroAnimation />
        </section>

        <FlightSearchBar
          initial={lastSearch ?? undefined}
          preset={preset}
          onSubmit={(params) => {
            navigate('/results', {
              state: {
                fromSearch: true,
                params
              }
            });
          }}
        />

        <PopularRoutes onPreset={handlePresetSearch} />

        <PopularTabs
          title="Popüler Yurt İçi Uçak Biletleri"
          sections={domesticTabs}
          onPreset={handlePresetSearch}
        />

        <PopularTabs
          title="Popüler Yurt Dışı Uçak Biletleri"
          sections={internationalTabs}
          onPreset={handlePresetSearch}
        />

        <PopularAirports onPreset={(p) => setPreset({ ...(preset ?? {}), ...p })} />

        <PopularAirlines />
      </div>
    </PageTransition>
  );
}

