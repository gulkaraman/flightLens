import { format, parse, isValid } from 'date-fns';
import { tr } from 'date-fns/locale';

export function formatTRY(amount: number): string {
  if (!Number.isFinite(amount)) return '';
  const formattedNumber = new Intl.NumberFormat('tr-TR', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
  return `₺ ${formattedNumber}`;
}

export function parseTryFromText(text: string): number | null {
  if (!text) return null;
  const cleaned = text.replace(/[^\d.,]/g, '').replace(/\s+/g, '').trim();
  if (!cleaned) return null;

  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');

  let normalized = cleaned;
  if (lastComma > lastDot && lastComma !== -1) {
    // "1.042,07" → "1042.07"
    normalized = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (lastDot > lastComma && lastDot !== -1) {
    // "1042.07" → "1042.07" (nadiren kullanılır)
    normalized = cleaned.replace(/,/g, '');
  } else {
    // Sadece tam sayı (örn "900") → 900
    normalized = cleaned.replace(/[^\d]/g, '');
  }

  const value = Number(normalized);
  if (Number.isNaN(value)) return null;
  return value;
}

export function formatDateTR(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (!isValid(date)) return '';
  return format(date, 'dd MMM yyyy', { locale: tr });
}

export function parseTimeToMinutes(time: string): number | null {
  const parsed = parse(time, 'HH:mm', new Date());
  if (!isValid(parsed)) return null;
  return parsed.getHours() * 60 + parsed.getMinutes();
}

