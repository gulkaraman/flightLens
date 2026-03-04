/* eslint-disable no-console */
import { getFlights } from '../data/DataService';

async function main() {
  const res = await getFlights({
    from: 'IST',
    to: 'ESB',
    departDate: new Date().toISOString().slice(0, 10),
    adults: 1
  });

  const count = res.itineraries.length;
  const prices = res.itineraries
    .map((it) => it.totalPrice.amount)
    .filter((n) => typeof n === 'number' && !Number.isNaN(n));
  const minPrice = prices.length > 0 ? Math.min(...prices) : null;

  console.log('DataService smoke (flights):');
  console.log('  itineraries:', count);
  console.log('  minPrice:', minPrice);
}

main().catch((err) => {
  console.error('smoke.ts failed:', err);
  process.exit(1);
});

