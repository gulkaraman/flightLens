import type { SearchParams } from '../types';

// Uçuş sonuçları için type-safe model.
// Not: Arama parametrelerinin yapısını değiştirirseniz README'deki config bölümünü güncelleyin
// ve bu tip ile backend/config/search.json örneğini senkron tutun.

export interface FlightResult {
  airline: string;
  departTime: string;
  arriveTime?: string;
  duration?: string;
  priceText: string;
  currency?: string;
  directOnly: boolean;
  /** Zorunlu mock/cache tarafında; scraper opsiyonel set edebilir */
  isDirect?: boolean;
  badges?: string[];
  /** Direkt = 0, 1 aktarma = 1 */
  stopsCount?: number;
  /** "Direkt" | "1 Aktarma" - UI'da gösterim için */
  stopLabel?: string;
  /** Süre (dakika) - sıralama/filtre için */
  durationMin?: number;
  /** Benzersiz satır id (mock: seed+index) */
  id?: string;
  /** Sayısal fiyat (TRY) - sıralama için */
  priceTry?: number;
  /** Gidiş-Dönüş: 'outbound' | 'return'; tek yön için yok veya 'outbound' */
  leg?: 'outbound' | 'return';
  /** Havalimanı kodu (kalkış) */
  departAirportCode?: string;
  /** Havalimanı kodu (varış) */
  arriveAirportCode?: string;
  departAirportName?: string;
  arriveAirportName?: string;
  /** Segment listesi (aktarmalı uçuşlarda) */
  legs?: Array<{ fromCode: string; toCode: string; departTime: string; arriveTime: string }>;
  /** Aktarma havalimanı kodu */
  stopoverCode?: string;
  /** Aktarmada bekleme süresi (dakika) */
  stopoverDurationMin?: number;
}

export interface ScrapeContext {
  params: SearchParams;
  debug?: boolean;
}

