/* eslint-disable no-console */
import { searchObiletFlights } from '../obiletScraper';

async function main() {
  const response = await searchObiletFlights({
    from: 'IST',
    to: 'ESB',
    departDate: '2026-03-10',
    adults: 1
  });

  const count = response.itineraries.length;
  const prices = response.itineraries
    .map((it) => it.totalPrice.amount)
    .filter((n) => typeof n === 'number' && !Number.isNaN(n));

  const minPrice = prices.length > 0 ? Math.min(...prices) : null;

  console.log('Obilet smoke check:');
  console.log('  itineraries:', count);
  console.log('  minPrice:', minPrice);
}

main().catch((err) => {
  console.error('obiletSmoke failed:', err);
  process.exit(1);
});

