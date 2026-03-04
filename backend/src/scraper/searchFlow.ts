import fs from 'fs';
import path from 'path';
import type { Page } from 'puppeteer';
import type { SearchParams } from '../types';
import { safeWaitVisible, typeAndSelectFromDropdown } from './domHelpers';
import {
  adultCountCandidates,
  adultPlusCandidates,
  childCountCandidates,
  childPlusCandidates,
  cityOptionCandidates,
  departDateInputCandidates,
  fromInputCandidates,
  oneWayTripTypeCandidates,
  passengerApplyCandidates,
  passengerOpenCandidates,
  returnDateInputCandidates,
  roundTripTypeCandidates,
  searchButtonCandidates,
  selectorSummary,
  toInputCandidates
} from './selectors';

const BASE_URL = 'https://www.obilet.com/ucak-bileti';

async function closeCookiePopups(page: Page, debug: boolean): Promise<void> {
  const candidates = [
    'button#onetrust-accept-btn-handler',
    'button[data-testid="cookie-accept"]',
    'button[class*="cookie"]',
    'button:has-text("Kabul Et")'
  ];

  for (const selector of candidates) {
    try {
      const handle = await page.$(selector);
      if (handle) {
        await handle.click();
        return;
      }
    } catch {
      if (debug) {
        // eslint-disable-next-line no-console
        console.log(`Cookie popup close attempt failed for selector: ${selector}`);
      }
    }
  }

  // Xpath-based text match as a last resort
  try {
    const [button] = await (page as any).$x(
      '//button[contains(translate(normalize-space(.), "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz"), "kabul") or contains(., "Accept")]'
    );
    if (button) {
      await button.click();
    }
  } catch {
    if (debug) {
      // eslint-disable-next-line no-console
      console.log('Cookie popup close attempt via XPath failed');
    }
  }
}

async function ensureRadioSelected(
  page: Page,
  candidates: typeof oneWayTripTypeCandidates,
  expectationLabel: string
): Promise<void> {
  const summary = selectorSummary(candidates);

  for (const candidate of candidates) {
    if (candidate.kind !== 'css') continue;
    const handle = await page.$(candidate.selector);
    if (!handle) continue;

    const isSelected = await page.evaluate(
      (el) => (el as HTMLInputElement).checked ?? el.classList.contains('active'),
      handle
    );

    if (isSelected) return;
  }

  throw new Error(
    `Expectation failed: ${expectationLabel} radio should be selected, but no candidate matched as selected. Tried selectors: ${summary}`
  );
}

async function clickFirstCandidateButton(
  page: Page,
  candidates: typeof oneWayTripTypeCandidates,
  message: string,
  debug: boolean
): Promise<void> {
  const summary = selectorSummary(candidates);

  for (const candidate of candidates) {
    if (candidate.kind !== 'css') continue;
    const handle = await page.$(candidate.selector);
    if (!handle) continue;

    try {
      await handle.click();
      return;
    } catch (error) {
      if (debug) {
        // eslint-disable-next-line no-console
        console.log(
          `Click failed for candidate ${candidate.selector}: ${(error as Error).message}`
        );
      }
    }
  }

  throw new Error(`${message}. No clickable candidate found. Tried: ${summary}`);
}

async function setTripType(page: Page, tripType: SearchParams['tripType'], debug: boolean) {
  if (tripType === 'oneWay') {
    await clickFirstCandidateButton(
      page,
      oneWayTripTypeCandidates,
      'Failed to activate one-way trip type',
      debug
    );
    await ensureRadioSelected(page, oneWayTripTypeCandidates, 'one-way');
  } else {
    await clickFirstCandidateButton(
      page,
      roundTripTypeCandidates,
      'Failed to activate round-trip trip type',
      debug
    );
    await ensureRadioSelected(page, roundTripTypeCandidates, 'round-trip');
  }
}

async function resolveFirstInputSelector(
  page: Page,
  candidates: typeof fromInputCandidates,
  message: string
): Promise<string> {
  for (const candidate of candidates) {
    if (candidate.kind !== 'css') continue;
    const handle = await page.$(candidate.selector);
    if (!handle) continue;
    return candidate.selector;
  }
  throw new Error(`${message}. No matching input found. Tried: ${selectorSummary(candidates)}`);
}

async function fillRoute(
  page: Page,
  params: SearchParams,
  debug: boolean
): Promise<void> {
  const fromSelector = await resolveFirstInputSelector(
    page,
    fromInputCandidates,
    'Unable to find "Nereden" input'
  );
  const toSelector = await resolveFirstInputSelector(
    page,
    toInputCandidates,
    'Unable to find "Nereye" input'
  );

  await typeAndSelectFromDropdown(
    page,
    fromSelector,
    params.from,
    cityOptionCandidates,
    'Failed while filling origin (Nereden)',
    { debug, debugLabel: 'origin-city' }
  );

  const fromValue = await page.$eval(
    fromSelector,
    (el) => (el as HTMLInputElement).value ?? (el.textContent ?? '').trim()
  );
  if (!fromValue || !fromValue.toLowerCase().includes(params.from.toLowerCase())) {
    throw new Error(
      `Expectation failed: origin field should contain "${params.from}", actual="${fromValue}"`
    );
  }

  await typeAndSelectFromDropdown(
    page,
    toSelector,
    params.to,
    cityOptionCandidates,
    'Failed while filling destination (Nereye)',
    { debug, debugLabel: 'destination-city' }
  );

  const toValue = await page.$eval(
    toSelector,
    (el) => (el as HTMLInputElement).value ?? (el.textContent ?? '').trim()
  );
  if (!toValue || !toValue.toLowerCase().includes(params.to.toLowerCase())) {
    throw new Error(
      `Expectation failed: destination field should contain "${params.to}", actual="${toValue}"`
    );
  }
}

async function typeIntoFirstMatchingInput(
  page: Page,
  candidates: typeof departDateInputCandidates,
  value: string,
  label: string,
  debug: boolean
): Promise<void> {
  for (const candidate of candidates) {
    if (candidate.kind !== 'css') continue;
    try {
      const input = await safeWaitVisible(page, candidate.selector, `${label} input not visible`, {
        debug,
        debugLabel: `${label}-input`
      });
      await input.click({ clickCount: 3 });
      await input.type(value, { delay: 40 });

      const current = await page.$eval(
        candidate.selector,
        (el) => (el as HTMLInputElement).value ?? (el.textContent ?? '').trim()
      );

      if (!current || !current.includes(value)) {
        // Bazı datepicker'lar farklı format gösterebilir; en azından boş kalmamasını bekleyelim.
        if (!current) {
          throw new Error(
            `Expectation failed: ${label} field should be non-empty after typing "${value}".`
          );
        }
      }

      return;
    } catch (error) {
      if (debug) {
        // eslint-disable-next-line no-console
        console.log(
          `Failed to set ${label} using selector ${candidate.selector}: ${
            (error as Error).message
          }`
        );
      }
    }
  }

  throw new Error(
    `Unable to set ${label} date using any selector. Tried: ${selectorSummary(candidates)}`
  );
}

async function setDates(page: Page, params: SearchParams, debug: boolean): Promise<void> {
  try {
    await typeIntoFirstMatchingInput(
      page,
      departDateInputCandidates,
      params.departDate,
      'departure date',
      debug
    );
  } catch (error) {
    if (debug) {
      // eslint-disable-next-line no-console
      console.warn(
        'Failed to set departure date via datepicker; continuing without explicit date input:',
        (error as Error).message
      );
    }
  }

  if (params.tripType === 'roundTrip' && params.returnDate) {
    try {
      await typeIntoFirstMatchingInput(
        page,
        returnDateInputCandidates,
        params.returnDate,
        'return date',
        debug
      );
    } catch (error) {
      if (debug) {
        // eslint-disable-next-line no-console
        console.warn(
          'Failed to set return date via datepicker; continuing without explicit return date input:',
          (error as Error).message
        );
      }
    }
  }
}

async function setPassengers(page: Page, params: SearchParams, debug: boolean): Promise<void> {
  try {
    await clickFirstCandidateButton(
      page,
      passengerOpenCandidates,
      'Failed to open passenger selection',
      debug
    );
  } catch (error) {
    // Bazı layout'larda yolcu seçimi varsayılan 1 yetişkin ile geliyor;
    // açılış butonu bulunamazsa, varsayılan değeri kullanarak akışı bozmadan devam ediyoruz.
    if (debug) {
      // eslint-disable-next-line no-console
      console.warn(
        'Passenger selector could not be opened; continuing with default passenger counts:',
        (error as Error).message
      );
    }
    return;
  }

  const targetAdults = params.passengers.adults;
  const targetChildren = params.passengers.children ?? 0;

  const currentAdultsText = await tryReadCount(page, adultCountCandidates);
  let currentAdults = currentAdultsText ?? 1;

  while (currentAdults < targetAdults) {
    await clickFirstCandidateButton(
      page,
      adultPlusCandidates,
      'Failed to increment adult passenger',
      debug
    );
    currentAdults += 1;
  }

  const currentChildrenText = await tryReadCount(page, childCountCandidates);
  let currentChildren = currentChildrenText ?? 0;

  while (currentChildren < targetChildren) {
    await clickFirstCandidateButton(
      page,
      childPlusCandidates,
      'Failed to increment child passenger',
      debug
    );
    currentChildren += 1;
  }

  try {
    await clickFirstCandidateButton(
      page,
      passengerApplyCandidates,
      'Failed to apply passenger selection',
      debug
    );
  } catch (error) {
    if (debug) {
      // eslint-disable-next-line no-console
      console.warn(
        'Passenger selection apply button could not be clicked; continuing with adjusted counts:',
        (error as Error).message
      );
    }
  }
}

async function tryReadCount(
  page: Page,
  candidates: typeof adultCountCandidates
): Promise<number | undefined> {
  for (const candidate of candidates) {
    if (candidate.kind !== 'css') continue;
    const handle = await page.$(candidate.selector);
    if (!handle) continue;
    const raw = await page.evaluate(
      (el) => (el.textContent ?? (el as HTMLInputElement).value ?? '').trim(),
      handle
    );
    const num = parseInt(raw, 10);
    if (!Number.isNaN(num)) return num;
  }
  return undefined;
}

async function clickSearch(page: Page, debug: boolean): Promise<void> {
  await clickFirstCandidateButton(
    page,
    searchButtonCandidates,
    'Failed to click search button',
    debug
  );

  await page.waitForNavigation({
    waitUntil: ['networkidle0', 'domcontentloaded'],
    timeout: 30_000
  });
}

export async function runSearch(
  page: Page,
  params: SearchParams,
  debug = false
): Promise<void> {
  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 45_000 });

    await closeCookiePopups(page, debug);

    try {
      await setTripType(page, params.tripType, debug);
    } catch (error) {
      // Trip type toggle bulunamazsa akışı tamamen kırmak yerine uyarı loglayıp devam ediyoruz.
      // Bazı layout'larda sadece tek yön desteklenebiliyor veya tripType tarih seçiminden anlaşılabiliyor.
      if (debug) {
        // eslint-disable-next-line no-console
        console.warn(
          'Trip type toggle could not be set; continuing without explicit toggle:',
          (error as Error).message
        );
      }
    }
    await fillRoute(page, params, debug);
    await setDates(page, params, debug);
    await setPassengers(page, params, debug);
    await clickSearch(page, debug);

    if (process.env.DEBUG_SCREENSHOTS === 'true') {
      try {
        const outputDir = path.resolve(process.cwd(), 'output');
        fs.mkdirSync(outputDir, { recursive: true });
        const step1Path = path.join(outputDir, 'step-1-results.png');
        await page.screenshot({ path: step1Path, fullPage: true });
        if (debug) {
          // eslint-disable-next-line no-console
          console.log('Saved initial results screenshot to', path.relative(process.cwd(), step1Path));
        }
      } catch (error) {
        if (debug) {
          // eslint-disable-next-line no-console
          console.warn(
            'Failed to capture step-1-results.png screenshot:',
            (error as Error).message
          );
        }
      }
    }
  } catch (error) {
    if (debug) {
      // eslint-disable-next-line no-console
      console.error('Search flow failed:', error);
      try {
        await page.screenshot({ path: 'artifacts/search-flow-error.png', fullPage: true });
      } catch {
        // ignore screenshot errors
      }
    }
    throw error;
  }
}

