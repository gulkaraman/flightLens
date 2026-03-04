import { launchBrowser } from '../scraper/browser';
import {
  fromInputCandidates,
  toInputCandidates,
  departDateInputCandidates,
  returnDateInputCandidates,
  passengerOpenCandidates,
  oneWayTripTypeCandidates,
  roundTripTypeCandidates,
  searchButtonCandidates,
  type SelectorCandidate,
  selectorSummary
} from '../scraper/selectors';

const BASE_URL = 'https://www.obilet.com/ucak-bileti';

interface CheckItem {
  label: string;
  candidates: SelectorCandidate[];
}

async function hasAnyElement(
  page: import('puppeteer').Page,
  candidates: SelectorCandidate[]
): Promise<{ ok: boolean; detail?: string }> {
  for (const candidate of candidates) {
    try {
      if (candidate.kind === 'css') {
        const el = await page.$(candidate.selector);
        if (el) {
          return { ok: true, detail: candidate.selector };
        }
      } else {
        const nodes = await (page as any).$x(candidate.selector);
        if (nodes.length > 0) {
          return { ok: true, detail: candidate.selector };
        }
      }
    } catch {
      // Bu candidate başarısız oldu, sıradaki fallback denenir.
      continue;
    }
  }

  return { ok: false };
}

async function main(): Promise<void> {
  const debug = process.env.DEBUG_SCRAPER === 'true';
  const browser = await launchBrowser({ debug });
  const page = await browser.newPage();

  const failures: string[] = [];

  try {
    // eslint-disable-next-line no-console
    console.log(`Opening ${BASE_URL} for self-check...`);
    await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 45_000 });

    const checks: CheckItem[] = [
      {
        label: 'Trip type toggle (Tek yön)',
        candidates: oneWayTripTypeCandidates
      },
      {
        label: 'Trip type toggle (Gidiş-dönüş)',
        candidates: roundTripTypeCandidates
      },
      {
        label: '"Nereden" input',
        candidates: fromInputCandidates
      },
      {
        label: '"Nereye" input',
        candidates: toInputCandidates
      },
      {
        label: 'Gidiş tarihi alanı',
        candidates: departDateInputCandidates
      },
      {
        label: 'Dönüş tarihi alanı',
        candidates: returnDateInputCandidates
      },
      {
        label: 'Yolcu seçici / özet alanı',
        candidates: passengerOpenCandidates
      },
      {
        label: 'Arama butonu',
        candidates: searchButtonCandidates
      }
    ];

    for (const check of checks) {
      // eslint-disable-next-line no-console
      console.log(`Checking: ${check.label}...`);
      const result = await hasAnyElement(page, check.candidates);

      if (result.ok) {
        // eslint-disable-next-line no-console
        console.log(`  OK (${result.detail})`);
      } else {
        const summary = selectorSummary(check.candidates);
        failures.push(`${check.label} NOT FOUND. Tried: ${summary}`);
        // eslint-disable-next-line no-console
        console.warn(`  FAIL – no matching element. Tried: ${summary}`);
      }
    }

    if (failures.length === 0) {
      // eslint-disable-next-line no-console
      console.log('\nSelf-check completed: all critical selectors look OK ✅');
    } else {
      // eslint-disable-next-line no-console
      console.error('\nSelf-check completed with failures:');
      for (const f of failures) {
        // eslint-disable-next-line no-console
        console.error(`- ${f}`);
      }
      process.exitCode = 1;
    }
  } finally {
    await browser.close();
  }
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main();

