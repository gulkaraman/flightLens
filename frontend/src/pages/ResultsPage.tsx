import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { FlightResult, SearchParams, SearchResponse, FilterState } from '../lib/types';
import { apiLatest, apiSearch, API_BASE, type ApiError } from '../lib/api';
import { FlightCard } from '../components/results/FlightCard';
import { PageTransition } from '../components/PageTransition';
import { Skeleton } from '../components/Skeleton';
import { FlightLoadingOverlay } from '../components/loading/FlightLoadingOverlay';
import { ResultsToolbar } from '../components/results/ResultsToolbar';
import { DailyPriceStrip } from '../components/results/DailyPriceStrip';
import { QuickFiltersRow } from '../components/results/QuickFiltersRow';
import { AllFiltersDrawer } from '../components/results/AllFiltersDrawer';
import { TripSelectionSummary } from '../components/results/TripSelectionSummary';
import { SearchSummary } from '../components/results/SearchSummary';
import { formatTRY } from '../lib/format';
import { useFilterStore } from '../store/filterContext';
import { useSearchStore } from '../store/searchContext';

type LocationState =
  | {
      fromSearch?: boolean;
      payload?: SearchResponse;
      params?: never;
    }
  | {
      fromSearch?: boolean;
      payload?: never;
      params: SearchParams;
    };

function formatDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

function formatPassengers(p: SearchParams['passengers']) {
  const parts = [`${p.adults} yetişkin`];
  if (p.children > 0) parts.push(`${p.children} çocuk`);
  return parts.join(' · ');
}

function normalizePrice(priceText: string): number | null {
  const digits = priceText.replace(/[^\d]/g, '');
  if (!digits) return null;
  const n = Number(digits);
  return Number.isNaN(n) ? null : n;
}

export function ResultsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState | null;
  const { lastSearch, setLastSearch } = useSearchStore();

  const [data, setData] = useState<SearchResponse | null>(state?.payload ?? null);
  const [loading, setLoading] = useState<boolean>(() =>
    state?.params || lastSearch ? true : false
  );
  const [error, setError] = useState<string | null>(null);
  const [dailyPricesOpen, setDailyPricesOpen] = useState(false);
  const [allFiltersOpen, setAllFiltersOpen] = useState(false);
  const [applyAllPassengers, setApplyAllPassengers] = useState<boolean>(true);
  const [activePassengerIndex, setActivePassengerIndex] = useState<number>(0);
  const [selectedOutboundByPassenger, setSelectedOutboundByPassenger] = useState<
    Array<FlightResult | null>
  >([]);
  const [selectedReturnByPassenger, setSelectedReturnByPassenger] = useState<
    Array<FlightResult | null>
  >([]);
  const { state: filterState } = useFilterStore();

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        if (state?.payload) {
          if (!cancelled) {
            setData(state.payload);
            setError(null);
            setLoading(false);
          }
          return;
        }

        const searchParams: SearchParams | null = state?.params ?? lastSearch ?? null;

        if (searchParams) {
          // debug
          // eslint-disable-next-line no-console
          console.log('SUBMIT /api/search directOnly=', searchParams.directOnly, 'tripType=', searchParams.tripType);
          const res = await apiSearch(searchParams);
          if (!cancelled) {
            setData(res);
            setError(null);
          }
        } else {
          try {
            const latest = await apiLatest();
            if (!cancelled) {
              setData(latest);
              setError(null);
            }
          } catch (err) {
            const apiErr = err as ApiError;
            if (!cancelled) {
              // latest yoksa veya 404 ise, sadece empty state göster; kırmızı hata kutusu gösterme.
              if (apiErr.status === 404) {
                setData(null);
                setError(null);
              } else {
                setError(apiErr.message ?? 'Sonuçlar getirilemedi.');
              }
            }
          }
        }
      } catch (err) {
        if (!cancelled) {
          const apiErr = err as ApiError;
          if (apiErr.status === 0) {
            setError("API'ye ulaşılamadı (backend çalışıyor mu?)");
          } else {
            setError(apiErr.message ?? 'Sonuçlar getirilemedi.');
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [state]);

  useEffect(() => {
    if (!data) return;
    const flights = data.results ?? [];
    const directCount = flights.filter((f) => f.isDirect).length;
    // debug
    // eslint-disable-next-line no-console
    console.log('RESULT isDirect counts', directCount, flights.length);
  }, [data]);

  const filteredAndSorted: FlightResult[] = useMemo(() => {
    if (!data) return [];
    const arr = [...data.results];

    const applyFilters = (items: FlightResult[], filters: FilterState) =>
      items.filter((flight) => {
        // Aktarmasız filtresi:
        // directOnly === true -> sadece 0 aktarmalı uçuşlar (segments.length - 1 === 0)
        // directOnly === false -> aktarma sayısına göre filtreleme yapılmaz
        const segments: any[] =
          ((flight as any).legs as any[]) ??
          ((flight as any).segments as any[]) ??
          ((flight as any).itineraries?.[0]?.segments as any[]) ??
          [];

        const stops =
          Array.isArray(segments) && segments.length > 0
            ? segments.length - 1
            : flight.stopsCount != null
              ? flight.stopsCount
              : flight.isDirect === false
                ? 1
                : 0;

        if (filters.directOnly && stops > 0) {
          return false;
        }

        const price = normalizePrice(flight.priceText);
        if (filters.priceRange && price != null) {
          const [min, max] = filters.priceRange;
          if (price < min || price > max) return false;
        }

        if (filters.airlines.length > 0 && !filters.airlines.includes(flight.airline)) {
          return false;
        }

        if (filters.timeRange) {
          const match = /^(\d{2}):(\d{2})/.exec(flight.departTime);
          if (match) {
            const mins = Number(match[1]) * 60 + Number(match[2]);
            const [start, end] = filters.timeRange;
            if (mins < start || mins > end) return false;
          }
        }

        if (filters.minBaggageKg && filters.minBaggageKg > 0) {
          // Şu an backend bagaj verisi sağlamıyor; bu durumda min bagaj > 0 ise tüm "unknown" seferler filtre dışı kalır.
          return false;
        }

        return true;
      });

    const filtered = applyFilters(arr, filterState);

    const sortMode = filterState.sortBy;

    return filtered.sort((a, b) => {
      if (sortMode === 'priceAsc' || sortMode === 'priceDesc') {
        const pa = a.priceTry ?? normalizePrice(a.priceText) ?? Number.MAX_SAFE_INTEGER;
        const pb = b.priceTry ?? normalizePrice(b.priceText) ?? Number.MAX_SAFE_INTEGER;
        return sortMode === 'priceAsc' ? pa - pb : pb - pa;
      }

      if (sortMode === 'time') {
        const ta = a.departTime ?? '';
        const tb = b.departTime ?? '';
        return ta.localeCompare(tb);
      }

      const parseDurationMin = (f: FlightResult): number => {
        if (f.durationMin != null) return f.durationMin;
        const d = f.duration;
        if (!d) return Number.MAX_SAFE_INTEGER;
        const hoursMatch = d.match(/(\d+)\s*s(aat)?/);
        const minsMatch = d.match(/(\d+)\s*dk/);
        const h = hoursMatch ? Number(hoursMatch[1]) : 0;
        const m = minsMatch ? Number(minsMatch[1]) : 0;
        return h * 60 + m;
      };
      return parseDurationMin(a) - parseDurationMin(b);
    });
  }, [data, filterState]);

  const params = data?.params ?? state?.params ?? lastSearch ?? undefined;

  const isRoundTrip = params?.tripType === 'roundTrip';
  const outboundFlights = useMemo(
    () => filteredAndSorted.filter((f) => (f.leg ?? 'outbound') !== 'return'),
    [filteredAndSorted]
  );
  const returnFlights = useMemo(
    () => filteredAndSorted.filter((f) => f.leg === 'return'),
    [filteredAndSorted]
  );

  const totalPassengers = useMemo(() => {
    if (!params) return 1;
    const adults = params.passengers?.adults ?? 1;
    const children = params.passengers?.children ?? 0;
    return Math.max(1, adults + children);
  }, [params]);

  const passengerLabels = useMemo(() => {
    if (!params) return ['Yolcu 1'];
    const adults = params.passengers?.adults ?? 1;
    const children = params.passengers?.children ?? 0;
    const labels: string[] = [];
    for (let i = 0; i < adults; i += 1) labels.push(`Yolcu ${labels.length + 1} (Yetişkin)`);
    for (let i = 0; i < children; i += 1) labels.push(`Yolcu ${labels.length + 1} (Çocuk)`);
    return labels.length > 0 ? labels : ['Yolcu 1'];
  }, [params]);

  useEffect(() => {
    // Passenger sayısı değişince dizileri resize et
    const size = totalPassengers;
    setSelectedOutboundByPassenger((prev) => {
      const next = prev.slice(0, size);
      while (next.length < size) next.push(null);
      return next;
    });
    setSelectedReturnByPassenger((prev) => {
      const next = prev.slice(0, size);
      while (next.length < size) next.push(null);
      return next;
    });
    setActivePassengerIndex((prev) => Math.max(0, Math.min(prev, size - 1)));
  }, [totalPassengers]);

  const empty = !loading && filteredAndSorted.length === 0;

  const meta = data?.meta;

  const fromCode = params ? params.from.slice(0, 3).toUpperCase() : '';
  const toCode = params ? params.to.slice(0, 3).toUpperCase() : '';

  const startSearch = (nextParams: SearchParams) => {
    setLastSearch(nextParams);

    const nextTotal =
      (nextParams.passengers?.adults ?? 1) + (nextParams.passengers?.children ?? 0);
    const size = Math.max(1, nextTotal);
    setSelectedOutboundByPassenger(Array(size).fill(null));
    setSelectedReturnByPassenger(Array(size).fill(null));
    setActivePassengerIndex(0);
    setLoading(true);
    setError(null);

    navigate('/results', {
      state: {
        fromSearch: true,
        params: nextParams
      }
    });
  };

  const sameFlight = (a: FlightResult | null, b: FlightResult | null): boolean => {
    if (!a || !b) return false;
    if (a.id && b.id) return a.id === b.id;
    return (
      a.airline === b.airline &&
      a.departTime === b.departTime &&
      (a.arriveTime ?? '') === (b.arriveTime ?? '') &&
      (a.priceText ?? '') === (b.priceText ?? '')
    );
  };

  const currentOutboundSelection = applyAllPassengers
    ? selectedOutboundByPassenger[0] ?? null
    : selectedOutboundByPassenger[activePassengerIndex] ?? null;
  const currentReturnSelection = applyAllPassengers
    ? selectedReturnByPassenger[0] ?? null
    : selectedReturnByPassenger[activePassengerIndex] ?? null;

  const selectOutbound = (flight: FlightResult) => {
    setSelectedOutboundByPassenger((prev) => {
      const next = [...prev];
      if (applyAllPassengers) {
        for (let i = 0; i < next.length; i += 1) next[i] = flight;
      } else {
        next[activePassengerIndex] = flight;
      }
      return next;
    });
  };

  const selectReturn = (flight: FlightResult) => {
    setSelectedReturnByPassenger((prev) => {
      const next = [...prev];
      if (applyAllPassengers) {
        for (let i = 0; i < next.length; i += 1) next[i] = flight;
      } else {
        next[activePassengerIndex] = flight;
      }
      return next;
    });
  };

  const clearOutboundAt = (idx: number) => {
    setSelectedOutboundByPassenger((prev) => {
      const next = [...prev];
      if (applyAllPassengers) {
        for (let i = 0; i < next.length; i += 1) next[i] = null;
      } else {
        next[idx] = null;
      }
      return next;
    });
  };

  const clearReturnAt = (idx: number) => {
    setSelectedReturnByPassenger((prev) => {
      const next = [...prev];
      if (applyAllPassengers) {
        for (let i = 0; i < next.length; i += 1) next[i] = null;
      } else {
        next[idx] = null;
      }
      return next;
    });
  };

  return (
    <PageTransition>
      <FlightLoadingOverlay open={loading && Boolean(state?.params)} />
      <ResultsToolbar
        params={params}
        onEditSearch={(nextParams) => {
          startSearch(nextParams);
        }}
        dailyPricesOpen={dailyPricesOpen}
        onToggleDailyPrices={() => setDailyPricesOpen((v) => !v)}
      />
      {dailyPricesOpen && params && data && (
        <DailyPriceStrip
          params={params}
          results={data.results}
          onSelectDate={(dateISO) => {
            startSearch({
              ...params,
              departDate: dateISO
            });
          }}
        />
      )}
      <QuickFiltersRow onOpenAllFilters={() => setAllFiltersOpen(true)} />
      <AllFiltersDrawer
        open={allFiltersOpen}
        onOpenChange={setAllFiltersOpen}
        results={data?.results ?? []}
      />
      <div className="flex flex-1 flex-col gap-4 py-4 md:flex-row md:gap-6 md:py-6">
      <aside className="md:w-72">
        <div className="sticky top-4 space-y-4">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-xs font-medium text-sky-300 hover:text-sky-200"
          >
            ← Yeni arama yap
          </button>

          <div className="rounded-3xl border border-slate-800/80 bg-slate-900/80 p-4 text-xs">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Arama özeti
            </p>
            {params ? (
              <div className="mt-2 space-y-2 text-slate-200">
                <p className="text-sm font-medium text-slate-50">
                  {params.from} → {params.to}
                </p>
                <p className="text-xs text-slate-400">
                  {formatDate(params.departDate)}
                  {params.tripType === 'roundTrip' && params.returnDate
                    ? ` · ${formatDate(params.returnDate)}`
                    : ''}
                </p>
                <p className="text-xs text-slate-400">{formatPassengers(params.passengers)}</p>
                {data?.runAtISO && (
                  <p className="mt-3 text-[11px] text-slate-500">
                    Son çalıştırma:{' '}
                    {new Date(data.runAtISO).toLocaleString('tr-TR', {
                      hour: '2-digit',
                      minute: '2-digit',
                      day: '2-digit',
                      month: 'short'
                    })}
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-2 text-xs text-slate-500">
                Henüz arama parametresi bulunamadı. Ana sayfadan yeni bir arama başlat.
              </p>
            )}
          </div>

          {!isRoundTrip && (
            <SearchSummary selectedFlight={currentOutboundSelection} />
          )}

          {params && (
            <TripSelectionSummary
              params={params}
              totalPassengers={totalPassengers}
              passengerLabels={passengerLabels}
              applyAllPassengers={applyAllPassengers}
              activePassengerIndex={activePassengerIndex}
              onSetActivePassengerIndex={setActivePassengerIndex}
              onToggleApplyAllPassengers={(next) => setApplyAllPassengers(next)}
              selectedOutbound={selectedOutboundByPassenger}
              selectedReturn={isRoundTrip ? selectedReturnByPassenger : undefined}
              onClearOutboundAt={clearOutboundAt}
              onClearReturnAt={isRoundTrip ? clearReturnAt : undefined}
            />
          )}
        </div>
      </aside>

      <section className="flex-1 space-y-3">
        {!loading && !error && meta?.source === 'cache' && (
          <div className="mb-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900 shadow-sm">
            <p className="font-semibold">Önbellekten sonuçlar gösteriliyor</p>
            <p className="mt-1 text-amber-800">
              Canlı arama başarısız oldu, en son kayıtlı sonuçlar gösteriliyor.
            </p>
          </div>
        )}
        {!loading && !error && meta?.source === 'mock' && (
          <div className="mb-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs text-sky-900 shadow-sm">
            <p className="font-semibold">Demo mod: örnek sonuçlar</p>
            <p className="mt-1 text-sky-800">
              Canlı kaynağa erişilemedi, demo amaçlı örnek uçuşlar gösteriliyor.
            </p>
          </div>
        )}
        {!loading && !error && meta && (meta.warnings?.length ?? 0) > 0 && (
          <details className="mb-2 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-xs text-slate-50 shadow-sm">
            <summary className="flex cursor-pointer items-center justify-between text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-100">
              <span>Detaylar</span>
              <span className="text-slate-400">▼</span>
            </summary>
            <div className="mt-2 space-y-1 border-t border-slate-700 pt-2">
              <p className="text-[10px] text-slate-300">
                Kaynak:{' '}
                <span className="inline-flex rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-100">
                  {meta.source}
                </span>
              </p>
              {meta.warnings && (
                <ul className="mt-1 list-disc space-y-1 pl-4 text-[11px] text-slate-200">
                  {meta.warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              )}
              {meta.runAtISO && (
                <p className="mt-1 text-[10px] text-slate-400">
                  Son çalıştırma: {new Date(meta.runAtISO).toLocaleString('tr-TR')}
                </p>
              )}
            </div>
          </details>
        )}

        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-slate-50 md:text-base">
              {isRoundTrip
                ? 'Gidiş ve dönüş uçuşları'
                : (meta?.directOnlyRequested ?? filterState.directOnly)
                  ? 'Sadece aktarmasız uçuş sonuçları'
                  : 'Tüm uçuşlar (aktarmalı + aktarmasız)'}
            </h2>
            <p className="text-[11px] text-slate-500">
              Filtre:{' '}
              {(meta?.directOnlyRequested ?? filterState.directOnly)
                ? 'Aktarmasız'
                : 'Tümü (aktarmalı + aktarmasız)'}
            </p>
            {import.meta.env.DEV && (
              <p className="text-[10px] text-slate-500/80">
                Debug API base:{' '}
                {API_BASE && API_BASE.length > 0 ? API_BASE : '(relative /api)'}
              </p>
            )}
          </div>
          {data && !empty && (
            <span className="text-[11px] text-slate-400">
              {filteredAndSorted.length} sonuç
            </span>
          )}
        </div>

        {loading && (
          <div className="mt-6 space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-20 rounded-3xl border border-slate-800/80">
                <div className="relative z-10 flex h-full items-center justify-between gap-4 px-4 py-3 text-sm text-slate-500 md:px-5">
                  <div className="space-y-2">
                    <div className="h-3 w-32 rounded-full bg-slate-700/80" />
                    <div className="h-3 w-40 rounded-full bg-slate-800/80" />
                  </div>
                  <div className="h-4 w-16 rounded-full bg-slate-700/80" />
                </div>
              </Skeleton>
            ))}
          </div>
        )}

        {error && !loading && (
          <div className="mt-6 rounded-3xl border border-rose-500/40 bg-rose-950/40 p-4 text-xs text-rose-100">
            <p className="font-semibold">Sonuçlar getirilemedi</p>
            <p className="mt-1 text-rose-200">{error}</p>
            {import.meta.env.DEV && (
              <p className="mt-1 text-[10px] text-rose-300">
                Debug: {API_BASE}/api/search
              </p>
            )}
          </div>
        )}

        {empty && !error && (
          <div className="mt-6 rounded-3xl border border-slate-800/80 bg-slate-900/80 p-6 text-sm text-slate-300">
            <p className="font-semibold text-slate-50">Sonuç bulunamadı</p>
            <p className="mt-1 text-xs text-slate-400">
              Aktarmasız uçuş bulunmamış olabilir veya sayfa yapısı değişmiş olabilir. Ana sayfadan
              farklı bir tarih ya da rota ile tekrar deneyebilirsin.
            </p>
          </div>
        )}

        {!loading && !error && filteredAndSorted.length > 0 && params && (
          <div className="mt-4 space-y-6">
            {import.meta.env.DEV &&
              // debug: uçuş listesinin ham API yapısını incelemek için
              // eslint-disable-next-line no-console
              console.log('FLIGHTS JSON:', JSON.stringify(filteredAndSorted, null, 2))}
            {isRoundTrip ? (
              <>
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Gidiş uçuşları ({fromCode} → {toCode})
                  </h3>
                  <div className="space-y-3">
                    {outboundFlights.map((flight, idx) => {
                      if (import.meta.env.DEV) {
                        const segments: any[] =
                          // backend FlightResult.legs veya harici segments
                          ((flight as any).legs as any[]) ??
                          ((flight as any).segments as any[]) ??
                          ((flight as any).itineraries?.[0]?.segments as any[]) ??
                          [];
                        const stops =
                          Array.isArray(segments) && segments.length > 0
                            ? segments.length - 1
                            : (flight as any).stops ?? (flight as any).stopsCount ?? 0;
                        // eslint-disable-next-line no-console
                        console.log('Stops:', stops, flight);
                      }

                      return (
                        <FlightCard
                          key={`out-${flight.id ?? flight.airline}-${flight.departTime}-${idx}`}
                          flight={flight}
                          index={idx}
                          params={params}
                          leg="outbound"
                          isSelected={sameFlight(currentOutboundSelection, flight)}
                          onSelect={() => selectOutbound(flight)}
                          selectLabel="Gidişi seç"
                        />
                      );
                    })}
                  </div>
                </div>
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Dönüş uçuşları ({toCode} → {fromCode})
                  </h3>
                  <div className="space-y-3">
                    {returnFlights.length === 0 ? (
                      <div className="rounded-3xl border border-amber-200/60 bg-amber-950/30 px-4 py-5 text-center text-sm text-amber-200">
                        <p className="font-medium">Dönüş uçuşu bulunamadı</p>
                        <p className="mt-1 text-xs text-amber-300/90">
                          Seçilen dönüş tarihi için uçuş listelenemedi. Farklı bir dönüş tarihi veya
                          rota deneyebilirsiniz.
                        </p>
                      </div>
                    ) : (
                      returnFlights.map((flight, idx) => (
                        <FlightCard
                          key={`ret-${flight.id ?? flight.airline}-${flight.departTime}-${idx}`}
                          flight={flight}
                          index={idx}
                          params={params}
                          leg="return"
                          isSelected={sameFlight(currentReturnSelection, flight)}
                          onSelect={() => selectReturn(flight)}
                          selectLabel="Dönüşü seç"
                        />
                      ))
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                {filteredAndSorted.map((flight, idx) => {
                  if (import.meta.env.DEV) {
                    const segments: any[] =
                      ((flight as any).legs as any[]) ??
                      ((flight as any).segments as any[]) ??
                      ((flight as any).itineraries?.[0]?.segments as any[]) ??
                      [];
                    const stops =
                      Array.isArray(segments) && segments.length > 0
                        ? segments.length - 1
                        : (flight as any).stops ?? (flight as any).stopsCount ?? 0;
                    // eslint-disable-next-line no-console
                    console.log('Stops:', stops, flight);
                  }

                  const cardId = flight.id ?? `${flight.airline}-${flight.departTime}-${idx}`;
                  const isSelectedCard = sameFlight(currentOutboundSelection, flight);
                  return (
                    <FlightCard
                      key={cardId}
                      flight={flight}
                      index={idx}
                      params={params}
                      selected={isSelectedCard}
                      actionLabel="Gidişi seç"
                      onSelect={() => {
                        selectOutbound(flight);
                        void cardId;
                      }}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>
      </div>
    </PageTransition>
  );
}

