// Bu şema, `backend/config/search.json` dosyasını doğrulamak için kullanılır.
// Not: Config alanlarını değiştirdiğinizde README içinde planlanan "Config" bölümünü de güncelleyin.

import { z } from 'zod';

export const TripTypeSchema = z.enum(['oneWay', 'roundTrip']);

const DateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

export const PassengersSchema = z.object({
  adults: z.number().int().min(1),
  children: z.number().int().min(0).default(0)
});

export const SearchParamsSchema = z
  .object({
    tripType: TripTypeSchema,
    from: z.string().min(1, 'From is required'),
    to: z.string().min(1, 'To is required'),
    departDate: DateStringSchema,
    returnDate: DateStringSchema.optional(),
    passengers: PassengersSchema,
    directOnly: z.boolean().default(false)
  })
  .superRefine((value, ctx) => {
    if (value.tripType === 'roundTrip') {
      if (!value.returnDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['returnDate'],
          message: 'returnDate is required for roundTrip'
        });
        return;
      }

      if (value.returnDate < value.departDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['returnDate'],
          message: 'returnDate cannot be before departDate'
        });
      }
    }
  });

