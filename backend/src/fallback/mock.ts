import type { SearchParams } from '../types';
import type { FlightResult } from '../scraper/types';

/** Basit string hash => seed (deterministik) */
function stringToSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) || 1;
}

/** Mulberry32: seed => 0..1 arası deterministik RNG */
function mulberry32(seed: number): () => number {
  let state = seed;
  return function () {
    let t = (state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const AIRLINES = ['THY', 'Pegasus', 'SunExpress', 'AJet', 'AnadoluJet'];
const DIRECT_LABEL = 'Direkt';
const ONE_STOP_LABEL = '1 Aktarma';

/** Şehir adı -> havalimanı kodu(ları). İstanbul için SAW/IST seçimi seed ile. */
const CITY_TO_CODES: Record<string, string | string[]> = {
  istanbul: ['SAW', 'IST'],
  izmir: 'ADB',
  ankara: 'ESB',
  antalya: 'AYT',
  adana: 'ADA',
  trabzon: 'TZX',
  gaziantep: 'GZT',
  kayseri: 'ASR',
  diyarbakır: 'DIY',
  diyarbakir: 'DIY',
  samsun: 'SZF',
  van: 'VAN',
  bakü: 'GYD',
  baku: 'GYD',
  cidde: 'JED',
  jeddah: 'JED',
  belgrad: 'BEG',
  belgrade: 'BEG',
  dubai: 'DXB',
  batum: 'BUS',
  batumi: 'BUS'
};

function normalizeCity(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g');
}

function getAirportCode(city: string, rand: () => number): string {
  const key = normalizeCity(city);
  const val = CITY_TO_CODES[key];
  if (!val) return city.slice(0, 3).toUpperCase();
  if (Array.isArray(val)) return val[Math.floor(rand() * val.length)];
  return val;
}

const DOMESTIC_CITIES = new Set([
  'istanbul', 'izmir', 'ankara', 'antalya', 'adana', 'trabzon', 'gaziantep', 'kayseri',
  'diyarbakır', 'diyarbakir', 'samsun', 'van'
]);

function isInternational(from: string, to: string): boolean {
  const f = normalizeCity(from);
  const t = normalizeCity(to);
  return !DOMESTIC_CITIES.has(f) || !DOMESTIC_CITIES.has(t);
}

function minutesToTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function generateLegFlights(
  from: string,
  to: string,
  dateSeed: string,
  leg: 'outbound' | 'return',
  directOnly: boolean,
  baseSeed: number,
  count: number,
  adults: number,
  children: number
): FlightResult[] {
  const seed = stringToSeed(String(baseSeed) + '|' + dateSeed + '|' + leg);
  const rand = mulberry32(seed);
  const flights: FlightResult[] = [];
  const international = isInternational(from, to);

  // Deterministik zaman ve fiyat şablonları
  const baseHours = [6, 9, 12, 15, 18]; // 06:xx, 09:xx, ...
  const domesticDurations = [60, 80, 95, 110, 130];
  const internationalDurations = [140, 170, 190, 210, 220];
  const domesticPrices = [900, 1100, 1350, 1550, 1800];
  const internationalPrices = [2500, 3200, 3900, 4600, 5400];
  const stopoverPool = ['IST', 'ESB', 'SAW', 'ADB'];

  for (let i = 0; i < count; i += 1) {
    const airline = AIRLINES[i % AIRLINES.length];
    // directOnly=false ise ilk 5 için: D, D, D, 1A, 1A
    const pattern = [true, true, true, false, false];
    const isDirect = directOnly ? true : pattern[i % pattern.length];
    const stopsCount = isDirect ? 0 : 1;
    const stopLabel = isDirect ? DIRECT_LABEL : ONE_STOP_LABEL;

    const departCode = getAirportCode(from, rand);
    const arriveCode = getAirportCode(to, rand);

    const hour = baseHours[i % baseHours.length];
    const minute = (i * 7) % 60; // 06:00, 09:07, 12:14, ...
    const departTotal = hour * 60 + minute;
    const departTime = minutesToTime(departTotal);

    let durationMin: number;
    let arriveTime: string;
    let legs: FlightResult['legs'];
    let stopoverCode: string | undefined;
    let stopoverDurationMin: number | undefined;

    if (isDirect) {
      durationMin = international
        ? internationalDurations[i % internationalDurations.length]
        : domesticDurations[i % domesticDurations.length];
      const arriveTotal = departTotal + durationMin;
      arriveTime = minutesToTime(arriveTotal);
      legs = [{ fromCode: departCode, toCode: arriveCode, departTime, arriveTime }];
    } else {
      let chosenStopover = stopoverPool[i % stopoverPool.length];
      if (chosenStopover === departCode || chosenStopover === arriveCode) {
        chosenStopover = 'ESB';
      }
      stopoverCode = chosenStopover;

      const baseDur = international
        ? internationalDurations[i % internationalDurations.length]
        : domesticDurations[i % domesticDurations.length] + 40; // aktarmalılar biraz daha uzun

      const seg1Min = Math.floor(baseDur * 0.4);
      const stopoverMin = 45;
      const seg2Min = baseDur - seg1Min - stopoverMin;

      stopoverDurationMin = stopoverMin;
      durationMin = seg1Min + stopoverMin + seg2Min;

      const arr1 = departTotal + seg1Min;
      const dep2 = arr1 + stopoverMin;
      const arr2 = dep2 + seg2Min;
      const t1 = minutesToTime(departTotal);
      const t2 = minutesToTime(arr1);
      const t3 = minutesToTime(dep2);
      const t4 = minutesToTime(arr2);
      arriveTime = t4;
      legs = [
        { fromCode: departCode, toCode: stopoverCode, departTime: t1, arriveTime: t2 },
        { fromCode: stopoverCode, toCode: arriveCode, departTime: t3, arriveTime: t4 }
      ];
    }

    const basePriceTable = international ? internationalPrices : domesticPrices;
    const baseRoute = basePriceTable[i % basePriceTable.length];
    const paxFactor = adults + children * 0.75 || 1;
    const priceTry = Math.round(baseRoute * paxFactor);
    const priceText = `${priceTry.toLocaleString('tr-TR')} TL`;
    const durationFormatted = `${Math.floor(durationMin / 60)} sa ${durationMin % 60} dk`;

    flights.push({
      airline,
      departTime,
      arriveTime,
      duration: durationFormatted,
      priceText,
      currency: 'TRY',
      directOnly,
      isDirect,
      badges: [stopLabel],
      stopsCount,
      stopLabel,
      durationMin,
      id: `mock-${seed}-${leg}-${i}`,
      priceTry,
      leg,
      departAirportCode: departCode,
      arriveAirportCode: arriveCode,
      legs,
      stopoverCode,
      stopoverDurationMin
    });
  }

  return flights;
}

export function generateMockFlights(params: SearchParams, count = 5): FlightResult[] {
  const salt = process.env.MOCK_SEED_SALT ?? 'flightlens';
  const adults = params.passengers?.adults ?? 1;
  const children = params.passengers?.children ?? 0;
  const seedString =
    salt +
    '|' +
    params.from +
    '|' +
    params.to +
    '|' +
    params.departDate +
    '|' +
    params.tripType +
    '|' +
    (params.returnDate ?? '') +
    '|' +
    String(adults) +
    '|' +
    String(children);

  const baseSeed = stringToSeed(seedString);
  const directOnly = params.directOnly ?? false;

  if (params.tripType === 'roundTrip' && params.returnDate) {
    const outbound = generateLegFlights(
      params.from,
      params.to,
      params.departDate,
      'outbound',
      directOnly,
      baseSeed,
      count,
      adults,
      children
    );
    const returnFlights = generateLegFlights(
      params.to,
      params.from,
      params.returnDate,
      'return',
      directOnly,
      baseSeed,
      count,
      adults,
      children
    );
    return [...outbound, ...returnFlights];
  }

  return generateLegFlights(
    params.from,
    params.to,
    params.departDate,
    'outbound',
    directOnly,
    baseSeed,
    count,
    adults,
    children
  );
}
