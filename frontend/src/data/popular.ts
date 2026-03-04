import { addDays } from 'date-fns';
import type { FlightSearchPreset } from '../components/search/FlightSearchBar';

export interface PopularRoute {
  from: string;
  to: string;
  price: number;
}

export const popularRoutes: PopularRoute[] = [
  { from: 'İstanbul', to: 'İzmir', price: 1249 },
  { from: 'İstanbul', to: 'Ankara', price: 899 },
  { from: 'İzmir', to: 'Antalya', price: 1149 },
  { from: 'Ankara', to: 'Trabzon', price: 1399 },
  { from: 'İstanbul', to: 'Diyarbakır', price: 1599 },
  { from: 'İzmir', to: 'Gaziantep', price: 1699 }
];

export interface PopularTabSection {
  key: string;
  label: string;
  routes: PopularRoute[];
}

export const domesticTabs: PopularTabSection[] = [
  {
    key: 'izmir',
    label: 'İzmir',
    routes: [
      { from: 'İstanbul', to: 'İzmir', price: 1249 },
      { from: 'Ankara', to: 'İzmir', price: 1299 },
      { from: 'Trabzon', to: 'İzmir', price: 1899 },
      { from: 'Adana', to: 'İzmir', price: 1599 },
      { from: 'Diyarbakır', to: 'İzmir', price: 1999 },
      { from: 'Gaziantep', to: 'İzmir', price: 1899 },
      { from: 'Kayseri', to: 'İzmir', price: 1499 },
      { from: 'Samsun', to: 'İzmir', price: 1399 }
    ]
  },
  {
    key: 'ankara',
    label: 'Ankara',
    routes: [
      { from: 'İstanbul', to: 'Ankara', price: 899 },
      { from: 'İzmir', to: 'Ankara', price: 1199 },
      { from: 'Antalya', to: 'Ankara', price: 1299 },
      { from: 'Trabzon', to: 'Ankara', price: 1499 },
      { from: 'Diyarbakır', to: 'Ankara', price: 1699 },
      { from: 'Adana', to: 'Ankara', price: 1399 },
      { from: 'Gaziantep', to: 'Ankara', price: 1599 },
      { from: 'Van', to: 'Ankara', price: 1799 }
    ]
  },
  {
    key: 'istanbul',
    label: 'İstanbul',
    routes: [
      { from: 'İzmir', to: 'İstanbul', price: 1249 },
      { from: 'Antalya', to: 'İstanbul', price: 1149 },
      { from: 'Ankara', to: 'İstanbul', price: 899 },
      { from: 'Trabzon', to: 'İstanbul', price: 1399 },
      { from: 'Adana', to: 'İstanbul', price: 1299 },
      { from: 'Kayseri', to: 'İstanbul', price: 1199 },
      { from: 'Diyarbakır', to: 'İstanbul', price: 1699 },
      { from: 'Gaziantep', to: 'İstanbul', price: 1599 }
    ]
  },
  {
    key: 'antalya',
    label: 'Antalya',
    routes: [
      { from: 'İstanbul', to: 'Antalya', price: 1149 },
      { from: 'Ankara', to: 'Antalya', price: 1199 },
      { from: 'İzmir', to: 'Antalya', price: 1149 },
      { from: 'Kayseri', to: 'Antalya', price: 1399 },
      { from: 'Trabzon', to: 'Antalya', price: 1599 },
      { from: 'Samsun', to: 'Antalya', price: 1499 },
      { from: 'Adana', to: 'Antalya', price: 1299 },
      { from: 'Gaziantep', to: 'Antalya', price: 1699 }
    ]
  },
  {
    key: 'adana',
    label: 'Adana',
    routes: [
      { from: 'İstanbul', to: 'Adana', price: 1299 },
      { from: 'Ankara', to: 'Adana', price: 1199 },
      { from: 'İzmir', to: 'Adana', price: 1599 },
      { from: 'Antalya', to: 'Adana', price: 1299 },
      { from: 'Trabzon', to: 'Adana', price: 1699 },
      { from: 'Samsun', to: 'Adana', price: 1499 },
      { from: 'Gaziantep', to: 'Adana', price: 1199 },
      { from: 'Kayseri', to: 'Adana', price: 1099 }
    ]
  }
];

export const internationalTabs: PopularTabSection[] = [
  {
    key: 'baku',
    label: 'Bakü',
    routes: [
      { from: 'İstanbul', to: 'Bakü', price: 2599 },
      { from: 'Ankara', to: 'Bakü', price: 2399 },
      { from: 'İzmir', to: 'Bakü', price: 2699 },
      { from: 'Antalya', to: 'Bakü', price: 2499 },
      { from: 'Adana', to: 'Bakü', price: 2599 },
      { from: 'Gaziantep', to: 'Bakü', price: 2699 },
      { from: 'Trabzon', to: 'Bakü', price: 2299 },
      { from: 'Kayseri', to: 'Bakü', price: 2399 }
    ]
  },
  {
    key: 'cidde',
    label: 'Cidde',
    routes: [
      { from: 'İstanbul', to: 'Cidde', price: 3499 },
      { from: 'Ankara', to: 'Cidde', price: 3699 },
      { from: 'İzmir', to: 'Cidde', price: 3799 },
      { from: 'Antalya', to: 'Cidde', price: 3599 },
      { from: 'Adana', to: 'Cidde', price: 3399 },
      { from: 'Gaziantep', to: 'Cidde', price: 3599 },
      { from: 'Kayseri', to: 'Cidde', price: 3499 },
      { from: 'Trabzon', to: 'Cidde', price: 3699 }
    ]
  },
  {
    key: 'belgrad',
    label: 'Belgrad',
    routes: [
      { from: 'İstanbul', to: 'Belgrad', price: 2199 },
      { from: 'Ankara', to: 'Belgrad', price: 2399 },
      { from: 'İzmir', to: 'Belgrad', price: 2499 },
      { from: 'Antalya', to: 'Belgrad', price: 2299 },
      { from: 'Adana', to: 'Belgrad', price: 2599 },
      { from: 'Gaziantep', to: 'Belgrad', price: 2699 },
      { from: 'Kayseri', to: 'Belgrad', price: 2399 },
      { from: 'Trabzon', to: 'Belgrad', price: 2599 }
    ]
  },
  {
    key: 'dubai',
    label: 'Dubai',
    routes: [
      { from: 'İstanbul', to: 'Dubai', price: 3299 },
      { from: 'Ankara', to: 'Dubai', price: 3399 },
      { from: 'İzmir', to: 'Dubai', price: 3499 },
      { from: 'Antalya', to: 'Dubai', price: 3299 },
      { from: 'Adana', to: 'Dubai', price: 3399 },
      { from: 'Gaziantep', to: 'Dubai', price: 3599 },
      { from: 'Kayseri', to: 'Dubai', price: 3399 },
      { from: 'Trabzon', to: 'Dubai', price: 3499 }
    ]
  },
  {
    key: 'batum',
    label: 'Batum',
    routes: [
      { from: 'İstanbul', to: 'Batum', price: 1799 },
      { from: 'Ankara', to: 'Batum', price: 1899 },
      { from: 'İzmir', to: 'Batum', price: 1999 },
      { from: 'Antalya', to: 'Batum', price: 1899 },
      { from: 'Adana', to: 'Batum', price: 1999 },
      { from: 'Gaziantep', to: 'Batum', price: 2099 },
      { from: 'Kayseri', to: 'Batum', price: 1899 },
      { from: 'Trabzon', to: 'Batum', price: 1699 }
    ]
  }
];

export const popularAirports = [
  'İstanbul Sabiha Gökçen',
  'İstanbul Havalimanı',
  'İzmir Adnan Menderes',
  'Ankara Esenboğa',
  'Antalya Havalimanı',
  'Adana Şakirpaşa',
  'Trabzon Havalimanı',
  'Gaziantep Havalimanı'
];

export interface PopularAirline {
  code: string;
  name: string;
}

export const popularAirlines: PopularAirline[] = [
  { code: 'FL', name: 'FlyLight Air' },
  { code: 'SA', name: 'SkyAtlas Airlines' },
  { code: 'NT', name: 'NorthTrail Airways' },
  { code: 'AE', name: 'AeroEast Lines' },
  { code: 'CR', name: 'CloudRunner' },
  { code: 'BL', name: 'BlueLumen Air' }
];

export function routeToPreset(route: PopularRoute): FlightSearchPreset {
  return {
    from: route.from,
    to: route.to,
    departDate: addDays(new Date(), 7)
  };
}

