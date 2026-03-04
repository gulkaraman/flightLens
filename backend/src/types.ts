// Bu dosya, Zod şemalarından türetilmiş type-safe arayüzleri dışa aktarır.
// Not: Config yapısını değiştirirseniz README'deki config dokümantasyonunu da güncelleyin.

import { z } from 'zod';
import { TripTypeSchema, SearchParamsSchema } from './config/schema';

export type TripType = z.infer<typeof TripTypeSchema>; // "oneWay" | "roundTrip"

export type SearchParams = z.infer<typeof SearchParamsSchema>;

