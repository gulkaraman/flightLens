export type TripType = 'oneWay' | 'roundTrip';

export interface PassengerCounts {
  adults: number;
  children: number;
}

export interface SearchParams {
  tripType: TripType;
  from: string;
  to: string;
  departDate: string;
  returnDate?: string;
  passengers: PassengerCounts;
  directOnly: boolean;
}

export interface FlightResult {
  airline: string;
  departTime: string;
  arriveTime?: string;
  duration?: string;
  priceText: string;
  currency?: string;
  directOnly: boolean;
  isDirect?: boolean;
  badges?: string[];
  stopsCount?: number;
  stopLabel?: string;
  durationMin?: number;
  id?: string;
  priceTry?: number;
  leg?: 'outbound' | 'return';
  departAirportCode?: string;
  arriveAirportCode?: string;
  departAirportName?: string;
  arriveAirportName?: string;
  legs?: Array<{ fromCode: string; toCode: string; departTime: string; arriveTime: string }>;
  stopoverCode?: string;
  stopoverDurationMin?: number;
}

export interface FareOption {
  label: string;
  description?: string;
  priceText: string;
  selected?: boolean;
}

export type SortMode = 'priceAsc' | 'priceDesc' | 'time' | 'duration';

export interface FilterState {
  sortBy: SortMode;
  directOnly: boolean;
  priceRange?: [number, number];
  timeRange?: [number, number]; // minutes since midnight
  airlines: string[];
  minBaggageKg?: number;
}

export interface SearchMeta {
  source: 'live' | 'cache' | 'mock';
  warnings?: string[];
  directOnlyRequested?: boolean;
}

export interface SearchResponse {
  runAtISO: string;
  params: SearchParams;
  results: FlightResult[];
  meta?: SearchMeta;
}

