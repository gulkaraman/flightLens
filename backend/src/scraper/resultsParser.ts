import fs from 'fs';
import path from 'path';
import type { ElementHandle, Page } from 'puppeteer';
import * as cheerio from 'cheerio';
import type { FlightResult } from './types';
import {
  airlineNameCandidates,
  directFilterCandidates,
  flightRowCandidates,
  priceCellCandidates,
  resultsContainerCandidates,
  departTimeCandidates,
  arriveTimeCandidates,
  selectFlightButtonInCardCandidates,
  expandedSummaryPriceCandidates,
  closeExpandedPanelCandidates,
  selectorSummary
} from './selectors';

export class NoResultsError extends Error {
  code = 'NO_RESULTS';
}

// Not: bazı Puppeteer sürümlerinde Page.waitForTimeout tipi mevcut olmayabilir.
// Bu yardımcı, applyDirectFilterAndParse içinde kullanılan basit bir bekleme
// mekanizmasını sağlar. Ayrıntılı fiyat-bekleme mantığı aşağıdaki
// parseFlightsFromHtml içindeki lokal waitForPriceOnFirstCard fonksiyonunda da bulunur.
async function waitForPriceOnFirstCard(page: Page): Promise<void> {
  const timeoutMs = Number(process.env.PRICE_WAIT_TIMEOUT_MS ?? '0');
  if (timeoutMs <= 0) return;
  try {
    await (page as any).waitForTimeout(timeoutMs);
  } catch {
    // noop
  }
}

async function isDirectFilterActive(page: Page): Promise<boolean> {
  for (const candidate of directFilterCandidates) {
    try {
      if (candidate.kind === 'css') {
        const handle = await page.$(candidate.selector);
        if (!handle) continue;
        const active = await page.evaluate((el: HTMLElement) => {
          const ariaPressed =
            el.getAttribute('aria-pressed') ?? el.getAttribute('aria-checked');
          const cls = el.className ?? '';
          const anyChecked = (el as any).checked ?? false;
          return (
            anyChecked === true ||
            ariaPressed === 'true' ||
            /active|selected|checked/i.test(cls)
          );
        }, handle as any);
        if (active) return true;
      } else {
        const handles = await (page as any).$x(candidate.selector);
        if (!handles || handles.length === 0) continue;
        const el = handles[0] as ElementHandle<Element>;
        const active = await page.evaluate((node: HTMLElement) => {
          const ariaPressed =
            node.getAttribute('aria-pressed') ?? node.getAttribute('aria-checked');
          const cls = node.className ?? '';
          const anyChecked = (node as any).checked ?? false;
          return (
            anyChecked === true ||
            ariaPressed === 'true' ||
            /active|selected|checked/i.test(cls)
          );
        }, el as any);
        if (active) return true;
      }
    } catch {
      // filtre aktiflik tespiti fail-safe, hata fırlatma
      continue;
    }
  }
  return false;
}

async function clickDirectFilter(page: Page): Promise<void> {
  for (const candidate of directFilterCandidates) {
    try {
      if (candidate.kind === 'css') {
        const handle = await page.$(candidate.selector);
        if (!handle) continue;
        await handle.click();
        return;
      }

      const handles = await (page as any).$x(candidate.selector);
      if (handles.length === 0) continue;
      await (handles[0] as ElementHandle<Element>).click();
      return;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log(
        `Direct filter click failed for "${candidate.selector}": ${(error as Error).message}`
      );
    }
  }

  // Filtre bulunamazsa fatal error vermek yerine uyarı logla; parse'e devam et.
  // eslint-disable-next-line no-console
  console.warn(
    `Unable to locate "Aktarmasız" (direct-only) filter. Tried selectors: ${selectorSummary(
      directFilterCandidates
    )}`
  );
}

async function waitForResultsReload(page: Page): Promise<void> {
  // Önce var olan sonuç container'ının HTML'ini yakalamaya çalış.
  let previousHtml: string | null = null;

  for (const candidate of resultsContainerCandidates) {
    if (candidate.kind !== 'css') continue;
    try {
      const html = await page.$eval(
        candidate.selector,
        (el) => (el as HTMLElement).innerHTML
      );
      previousHtml = html;
      break;
    } catch {
      // Bu candidate mevcut değil, diğerlerine bak.
      continue;
    }
  }

  try {
    await page.waitForNetworkIdle({ idleTime: 1000, timeout: 30_000 });
  } catch {
    // Bazı durumlarda network idle tetiklenmeyebilir; o yüzden aşağıda DOM diff ile de kontrol edeceğiz.
  }

  if (previousHtml !== null) {
    for (const candidate of resultsContainerCandidates) {
      if (candidate.kind !== 'css') continue;
      try {
        await page.waitForFunction(
          (selector, before) => {
            const el = document.querySelector<HTMLElement>(selector);
            if (!el) return false;
            return el.innerHTML !== before;
          },
          { timeout: 20_000 },
          candidate.selector,
          previousHtml
        );
        return;
      } catch {
        // Bir sonraki candidate denenir.
        continue;
      }
    }
  }

  // Not: fiyatın gerçekten DOM'a basılması için ek bekleme,
  // asıl snapshot öncesinde applyDirectFilterAndParse içinde yapılır.
}

function queryTextInCheerioRow(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  $row: cheerio.Cheerio<any>,
  candidates: typeof airlineNameCandidates,
  label: string,
  required: boolean
): string | undefined {
  for (const candidate of candidates) {
    if (candidate.kind !== 'css') continue;
    const text = $row
      .find(candidate.selector)
      .first()
      .text()
      .trim();
    if (text) return text;
  }

  if (required) {
    throw new Error(
      `Failed to extract required field "${label}" from flight row. Tried: ${selectorSummary(
        candidates
      )}`
    );
  }

  // eslint-disable-next-line no-console
  console.log(`Optional field "${label}" not found in a flight row.`);

  return undefined;
}

export function parseFlightsFromHtml(html: string, directOnly: boolean): FlightResult[] {
  const $ = cheerio.load(html);

  const pageText = $.text().toLowerCase();
  const noResultsPhrases = [
    'uçuş bulunamadı',
    'uçuş bulunmamıştır',
    'sonuç bulunamadı',
    'sefer bulunamadı'
  ];

  const isNoResultsTextPresent = noResultsPhrases.some((phrase) => pageText.includes(phrase));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let rows: cheerio.Cheerio<any> | null = null;

  for (const candidate of flightRowCandidates) {
    if (candidate.kind !== 'css') continue;
    const found = $(candidate.selector);
    if (found.length > 0) {
      rows = found.slice(0, 5);
      break;
    }
  }

function extractPriceFromRow(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  $row: cheerio.Cheerio<any>
): string {
  const priceRegex =
    /(₺\s?\d[\d\.\s]*([,]\d{1,2})?)|(\d[\d\.\s]*([,]\d{1,2})?\s?(TL|TRY))/i;
  const forbiddenTokens = [
    'kapat',
    'gidişi seç',
    'dönüşü seç',
    'süre bilgisi mevcut değil'
  ];

  const isForbidden = (text: string) => {
    const lower = text.toLowerCase();
    return forbiddenTokens.some((token) => lower.includes(token));
  };

  const debug = process.env.DEBUG_SCRAPER === 'true';
  const candidatesLog: { text: string; source: string }[] = [];

  // 1) Önce tanımlı price selector adaylarını dene, sadece regex ile eşleşen ve forbidden olmayan metni kabul et
  for (const candidate of priceCellCandidates) {
    if (candidate.kind !== 'css') continue;
    const el = $row.find(candidate.selector).first();
    if (!el || el.length === 0) continue;
    const raw = el.text().trim();
    if (!raw) continue;
    candidatesLog.push({ text: raw, source: `selector:${candidate.selector}` });
    const match = raw.match(priceRegex);
    if (match && !isForbidden(raw)) {
      const value = match[0].trim();
      if (value) return value;
    }
  }

  // 2) Fallback: kartın tüm innerText'i içinde fiyat pattern'i ara
  const fullText = $row.text().replace(/\s+/g, ' ').trim();
  if (fullText && !isForbidden(fullText)) {
    candidatesLog.push({ text: fullText, source: 'rowText' });
    const match = fullText.match(priceRegex);
    if (match) {
      const value = match[0].trim();
      if (value) return value;
    }
  }

  // 3) Ek fallback: tüm alt node'ları dolaş ve en mantıklı adayı seç
  const allTexts: { text: string; source: string }[] = [];
  $row.find('*').each((_, node) => {
    try {
      const $node = cheerio.load(node as any);
      const t = $node.root().text().trim();
      if (!t) return;
      if (isForbidden(t)) return;
      allTexts.push({ text: t, source: 'node' });
    } catch {
      // tekil node parse hatalarını yoksay
    }
  });

  const scored: { text: string; score: number; source: string }[] = [];
  for (const cand of allTexts) {
    const m = cand.text.match(priceRegex);
    if (!m) continue;
    const text = m[0].trim();
    if (!text) continue;
    if (text.length > 30) continue;

    let score = 0;
    if (/^₺/.test(text)) score += 3;
    if (/(TL|TRY)\s*$/i.test(text)) score += 2;
    if (/^\d/.test(text)) score += 1;

    scored.push({ text, score, source: cand.source });
    candidatesLog.push({ text, source: `nodeMatched` });
  }

  if (scored.length > 0) {
    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];
    if (debug) {
      try {
        const outputDir = path.resolve(process.cwd(), 'output');
        fs.mkdirSync(outputDir, { recursive: true });
        fs.writeFileSync(
          path.join(outputDir, 'price-candidates-card0.json'),
          JSON.stringify(
            {
              best,
              candidates: candidatesLog
            },
            null,
            2
          ),
          'utf-8'
        );
      } catch {
        // ignore debug write errors
      }
    }
    return best.text;
  }

  if (debug && candidatesLog.length > 0) {
    try {
      const outputDir = path.resolve(process.cwd(), 'output');
      fs.mkdirSync(outputDir, { recursive: true });
      fs.writeFileSync(
        path.join(outputDir, 'price-candidates-card0.json'),
        JSON.stringify(
          {
            best: null,
            candidates: candidatesLog
          },
          null,
          2
        ),
        'utf-8'
      );
    } catch {
      // ignore
    }
  }

  // 4) Hiçbir şey bulunamazsa, debug log ve anlamlı fallback
  // eslint-disable-next-line no-console
  console.warn(
    'extractPriceFromRow: price not found for a flight row; fullText=',
    fullText
  );
  return 'Fiyat bulunamadı';
}

async function waitForPriceOnFirstCard(page: Page): Promise<void> {
  const timeoutMs = Number(process.env.PRICE_WAIT_TIMEOUT_MS ?? '15000');
  const debug = process.env.DEBUG_SCRAPER === 'true';

  for (const candidate of flightRowCandidates) {
    if (candidate.kind !== 'css') continue;
    try {
      await page.waitForFunction(
        (selector) => {
          const pricePattern =
            /(₺\s?\d[\d\.\s]*([,]\d{1,2})?)|(\d[\d\.\s]*([,]\d{1,2})?\s?(TL|TRY))/i;
          const el = document.querySelector(selector) as HTMLElement | null;
          if (!el) return false;
          const text = el.innerText || '';
          return pricePattern.test(text);
        },
        { timeout: timeoutMs },
        candidate.selector
      );
      return;
    } catch {
      // Bu candidate için bekleme başarısız, diğer candidate'lere geç.
      continue;
    }
  }

  // Hiçbir candidate için fiyat pattern'i görünmediyse debug snapshot al.
  try {
    const outputDir = path.resolve(process.cwd(), 'output');
    fs.mkdirSync(outputDir, { recursive: true });
    const html = await page.content();
    const bodyText = await page.evaluate(() => document.body?.innerText || '');
    fs.writeFileSync(path.join(outputDir, 'results.html'), html, 'utf-8');
    fs.writeFileSync(path.join(outputDir, 'body.txt'), bodyText, 'utf-8');
  } catch {
    // snapshot hatalarını yoksay.
  }

  if (debug) {
    // eslint-disable-next-line no-console
    console.warn('PRICE_NOT_RENDERED_BEFORE_SNAPSHOT: no price pattern found on first card.');
  }
}

  if (!rows || rows.length === 0) {
    if (isNoResultsTextPresent) {
      throw new NoResultsError(
        directOnly
          ? 'Aktarmasız filtresi uygulandıktan sonra gösterilecek uçuş bulunamadı. Lütfen tarih ve rota seçimlerinizi değiştirin.'
          : 'Seçilen tarih ve rotada gösterilecek uçuş bulunamadı. Lütfen tarih ve rota seçimlerinizi değiştirin.'
      );
    }

    const artifactsDir = path.resolve(process.cwd(), 'artifacts');
    try {
      fs.mkdirSync(artifactsDir, { recursive: true });
    } catch {
      // ignore mkdir errors for debug artifacts
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const htmlPath = path.join(artifactsDir, `${timestamp}-results-no-cards.html`);
    try {
      fs.writeFileSync(htmlPath, html, 'utf-8');
    } catch {
      // ignore write errors
    }
    const relHtmlPath = path.relative(process.cwd(), htmlPath);

    throw new Error(
      `PARSE_FAILED_NO_CARDS: Uçuş kartı satırı bulunamadı; sayfa yapısı değişmiş olabilir. HTML dump: ${relHtmlPath}`
    );
  }

  const results: FlightResult[] = [];

  rows.each((_, el) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const $row = $(el as any);
    const rowText = $row.text().replace(/\s+/g, ' ').trim().toLowerCase();

    let airline: string | undefined;
    try {
      airline = queryTextInCheerioRow($row, airlineNameCandidates, 'airline', true);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(
        'Failed to parse airline name for a row, skipping this result:',
        (error as Error).message
      );
      airline = undefined;
    }

    if (!airline) return;

    let departTime: string | undefined;
    try {
      departTime = queryTextInCheerioRow($row, departTimeCandidates, 'departure time', true);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(
        'Failed to parse departure time for a row, skipping this result:',
        (error as Error).message
      );
      departTime = undefined;
    }

    if (!departTime) return;

    const arriveTime = queryTextInCheerioRow(
      $row,
      arriveTimeCandidates,
      'arrival time',
      false
    );

    // Fiyat parse'i: robust, her zaman bir string döner
    const priceText = extractPriceFromRow($row);

    // ---- Direkt / aktarmalı bilgisi ----
    const transfersEl = $row.find('.transfers').first();
    const transfersTextRaw = transfersEl.text().replace(/\s+/g, ' ').trim().toLowerCase();

    const labelSource = transfersTextRaw || rowText;

    let isDirect: boolean | undefined;
    let stopLabel: string | undefined;
    let stopsCount: number | undefined;
    let stopoverCode: string | undefined;

    const hasDirektOrNonstop =
      /direkt|aktarmasız/.test(labelSource);
    const hasAktarmaliOrAktarma =
      /aktarmalı|aktarma/.test(labelSource);

    if (hasAktarmaliOrAktarma) {
      // "1 Aktarma", "2 Aktarma", "Aktarmalı" vb. -> aktarmalı
      isDirect = false;
      const countMatch = labelSource.match(/(\d+)\s*aktarma/);
      const count = countMatch ? Number(countMatch[1]) || 1 : 1;
      stopsCount = count;
      stopLabel = `${count} Aktarma`;
    } else if (hasDirektOrNonstop) {
      // "DİREKT", "Direkt", "Aktarmasız" vb. -> direkt
      isDirect = true;
      stopsCount = 0;
      stopLabel = 'Direkt';
    } else {
      // Etiket tespit edilemedi -> bilinmiyor
      isDirect = undefined;
      stopsCount = undefined;
      stopLabel = undefined;
      // eslint-disable-next-line no-console
      console.warn('stopover label not found; isNonstop unknown. rowText=', rowText);
    }

    if (isDirect === false) {
      const stopCodeText = transfersEl.find('.airport').first().text().trim().toUpperCase();
      if (stopCodeText) {
        stopoverCode = stopCodeText;
      }
    }

    if (!directOnly) {
      // nonStop=false debug: her kart için label + isNonstop sonucu logla
      // eslint-disable-next-line no-console
      console.log('ROW isNonstop debug:', {
        airline,
        departTime,
        arriveTime,
        labelSource,
        isNonstop: isDirect === undefined ? null : isDirect,
        stopsCount: stopsCount ?? null
      });
    }

    results.push({
      airline,
      departTime,
      arriveTime,
      duration: undefined,
      priceText,
      currency: undefined,
      directOnly,
      isDirect,
      stopsCount,
      stopLabel,
      stopoverCode
    });
  });

  // Debug: ilk 5 kartın priceText değerlerini logla
  // eslint-disable-next-line no-console
  console.log(
    'PRICE DEBUG first5:',
    results.slice(0, 5).map((r) => r.priceText)
  );

  if (results.length === 0) {
    if (isNoResultsTextPresent) {
      throw new NoResultsError(
        directOnly
          ? 'Aktarmasız filtresi sonrasında geçerli veri içeren uçuş bulunamadı. Lütfen tarih ve rota seçimlerinizi değiştirin.'
          : 'Seçilen tarih ve rotada geçerli veri içeren uçuş bulunamadı. Lütfen tarih ve rota seçimlerinizi değiştirin.'
      );
    }

    const artifactsDir = path.resolve(process.cwd(), 'artifacts');
    try {
      fs.mkdirSync(artifactsDir, { recursive: true });
    } catch {
      // ignore mkdir errors for debug artifacts
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const htmlPath = path.join(artifactsDir, `${timestamp}-results-empty-after-parse.html`);
    try {
      fs.writeFileSync(htmlPath, html, 'utf-8');
    } catch {
      // ignore write errors
    }
    const relHtmlPath = path.relative(process.cwd(), htmlPath);

    throw new Error(
      `PARSE_FAILED_NO_CARDS: Uçuş kartları bulundu ancak parse sonrasında geçerli veri içeren sonuç üretilemedi. Sayfa yapısı değişmiş olabilir. HTML dump: ${relHtmlPath}`
    );
  }

  return results;
}

export async function applyDirectFilterAndParse(
  page: Page,
  directOnly: boolean
): Promise<FlightResult[]> {
  const debug = process.env.DEBUG_SCRAPER === 'true';

  if (debug) {
    // eslint-disable-next-line no-console
    console.log('applyDirectFilterAndParse start', { directOnly });
  }

  if (directOnly) {
    try {
      const active = await isDirectFilterActive(page);
      if (!active) {
        if (debug) {
          // eslint-disable-next-line no-console
          console.log('Direct filter not active; clicking to enable (directOnly=true).');
        }
        await clickDirectFilter(page);
        await waitForResultsReload(page);
      } else if (debug) {
        // eslint-disable-next-line no-console
        console.log('Direct filter already active (directOnly=true), not clicking again.');
      }
    } catch (error) {
      // nonStop=true iken filtre elementini bulamamak anlamlı bir hata
      throw new Error(
        `Expected to apply "Aktarmasız" filter (directOnly=true) but could not verify/apply it: ${
          (error as Error).message
        }`
      );
    }

    if (process.env.DEBUG_SCREENSHOTS === 'true') {
      try {
        const outputDir = path.resolve(process.cwd(), 'output');
        fs.mkdirSync(outputDir, { recursive: true });
        const step2Path = path.join(outputDir, 'step-2-after-filter.png');
        await page.screenshot({ path: step2Path, fullPage: true });
        // eslint-disable-next-line no-console
        console.log(
          'Saved filtered results screenshot to',
          path.relative(process.cwd(), step2Path)
        );
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn(
          'Failed to capture step-2-after-filter.png screenshot:',
          (error as Error).message
        );
      }
    }
  } else {
    // directOnly=false iken güvenlik: filtre yanlışlıkla aktifse kapatmaya çalış
    try {
      const active = await isDirectFilterActive(page);
      if (active) {
        if (debug) {
          // eslint-disable-next-line no-console
          console.log(
            'Direct filter appears active while directOnly=false; clicking to disable.'
          );
        }
        await clickDirectFilter(page);
        await waitForResultsReload(page);
      }
    } catch (error) {
      if (debug) {
        // eslint-disable-next-line no-console
        console.warn(
          'Failed to verify/disable direct filter while directOnly=false (continuing without hard error):',
          (error as Error).message
        );
      }
    }
  }

  // DEBUG: İlk kartların içeriğini logla ve istenen dosyalara yaz (selector tuning için)
  if (process.env.DEBUG_SCRAPER === 'true' || process.env.DEBUG_SCREENSHOTS === 'true') {
    const outputDir = path.resolve(process.cwd(), 'output');
    try {
      fs.mkdirSync(outputDir, { recursive: true });
    } catch {
      // ignore mkdir errors
    }

    for (const candidate of flightRowCandidates) {
      if (candidate.kind !== 'css') continue;
      try {
        const cards = await page.$$(candidate.selector);
        if (!cards || cards.length === 0) continue;

        const maxCards = Math.min(5, cards.length);
        for (let i = 0; i < maxCards; i += 1) {
          const handle = cards[i];
          const info = await page.evaluate((el: HTMLElement) => {
            return {
              innerText: el.innerText,
              outerHTML: el.outerHTML
            };
          }, handle as any);

          const htmlPath = path.join(outputDir, `card-${i}.html`);
          const txtPath = path.join(outputDir, `card-${i}.txt`);
          try {
            fs.writeFileSync(htmlPath, info.outerHTML, 'utf-8');
            fs.writeFileSync(txtPath, info.innerText, 'utf-8');
          } catch (error) {
            // eslint-disable-next-line no-console
            console.warn(
              `Failed to write card debug files for index ${i}:`,
              (error as Error).message
            );
          }

          if (i === 0 && process.env.DEBUG_SCRAPER === 'true') {
            // eslint-disable-next-line no-console
            console.log('DEBUG first flight card:', {
              selector: candidate.selector,
              innerTextPreview: info.innerText.slice(0, 500),
              outerHTMLPreview: info.outerHTML.slice(0, 2000)
            });
          }
        }

        // İlk başarılı candidate'den sonra diğerlerini denemeye gerek yok.
        break;
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn(
          `DEBUG_SCRAPER: failed to inspect flight cards for "${candidate.selector}":`,
          (error as Error).message
        );
      }
    }
  }

  // Snapshot almadan önce, ilk flight kartının içinde ₺/TL/TRY pattern'inin gerçekten DOM'a basılmasını bekle.
  await waitForPriceOnFirstCard(page);

  const html = await page.content();
  const results = parseFlightsFromHtml(html, directOnly);

  // Agresif fallback: ilk 5 kartın tamamı "Fiyat bulunamadı" ise, kartı expand ederek panelden fiyat okuma dene.
  const allMissing =
    results.length > 0 &&
    results
      .slice(0, 5)
      .every((r) => !r.priceText || /fiyat bulunamadı/i.test(r.priceText));

  if (allMissing) {
    const debugAggressive = process.env.DEBUG_SCRAPER === 'true';
    if (debugAggressive) {
      // eslint-disable-next-line no-console
      console.warn(
        'Aggressive price fallback: all first 5 priceText are "Fiyat bulunamadı"; trying expand-click flow.'
      );
    }

    try {
      for (const candidate of flightRowCandidates) {
        if (candidate.kind !== 'css') continue;
        const cards = await page.$$(candidate.selector);
        if (!cards || cards.length === 0) continue;

        const maxCards = Math.min(5, cards.length, results.length);
        for (let i = 0; i < maxCards; i += 1) {
          const flight = results[i];
          if (!flight || (flight.priceText && !/fiyat bulunamadı/i.test(flight.priceText))) {
            continue;
          }

          const cardHandle = cards[i];

          // Kart içindeki "Seç / Gidişi seç" butonunu bul ve tıkla
          let clicked = false;
          for (const btn of selectFlightButtonInCardCandidates) {
            if (btn.kind !== 'css') continue;
            try {
              const btnHandle = await (cardHandle as any).$(btn.selector);
              if (!btnHandle) continue;
              await btnHandle.click();
              clicked = true;
              break;
            } catch {
              continue;
            }
          }

          if (!clicked) {
            if (debugAggressive) {
              // eslint-disable-next-line no-console
              console.warn(
                `Aggressive price fallback: no select button found for card index ${i}.`
              );
            }
            continue;
          }

          // Panelin açılması için kısa bekleme
          await (page as any).waitForTimeout(1500);

          if (process.env.DEBUG_SCREENSHOTS === 'true') {
            try {
              const outputDir = path.resolve(process.cwd(), 'output');
              fs.mkdirSync(outputDir, { recursive: true });
              const shotPath = path.join(outputDir, `expanded-${i}.png`);
              await page.screenshot({ path: shotPath, fullPage: true });
            } catch {
              // ignore
            }
          }

          // Açılan panel/özet alanında fiyatı bulmaya çalış
          const priceRegex =
            /(₺\s?\d[\d\.\s]*([,]\d{1,2})?)|(\d[\d\.\s]*([,]\d{1,2})?\s?(TL|TRY))/i;
          const forbiddenTokens = [
            'kapat',
            'gidişi seç',
            'dönüşü seç',
            'süre bilgisi mevcut değil'
          ];

          const isForbidden = (text: string) => {
            const lower = text.toLowerCase();
            return forbiddenTokens.some((token) => lower.includes(token));
          };

          let improvedPrice: string | null = null;

          for (const p of expandedSummaryPriceCandidates) {
            if (p.kind !== 'css') continue;
            try {
              const text = await page.evaluate((sel) => {
                const el = document.querySelector<HTMLElement>(sel);
                return el ? el.innerText.trim() : '';
              }, p.selector);
              if (!text || isForbidden(text)) continue;
              const m = text.match(priceRegex);
              if (m && m[0].trim()) {
                improvedPrice = m[0].trim();
                break;
              }
            } catch {
              continue;
            }
          }

          // Eğer özel selector'dan bulunamadıysa, tüm body metni içinde ara
          if (!improvedPrice) {
            try {
              const bodyText = await page.evaluate(() => document.body?.innerText || '');
              if (bodyText && !isForbidden(bodyText)) {
                const m = bodyText.match(priceRegex);
                if (m && m[0].trim()) {
                  improvedPrice = m[0].trim();
                }
              }
            } catch {
              // ignore
            }
          }

          if (improvedPrice) {
            results[i].priceText = improvedPrice;
            if (debugAggressive) {
              // eslint-disable-next-line no-console
              console.log(
                `Aggressive price fallback: updated priceText for card index ${i} ->`,
                improvedPrice
              );
            }
          }

          // Paneli kapatmaya çalış
          for (const c of closeExpandedPanelCandidates) {
            if (c.kind !== 'css') continue;
            try {
              const closeHandle = await page.$(c.selector);
              if (!closeHandle) continue;
              await closeHandle.click();
              await (page as any).waitForTimeout(500);
              break;
            } catch {
              continue;
            }
          }
        }

        break; // ilk başarılı flightRow selector'ından sonra diğerlerini denemeye gerek yok
      }
    } catch (error) {
      if (debugAggressive) {
        // eslint-disable-next-line no-console
        console.warn(
          'Aggressive price fallback failed:',
          (error as Error).message
        );
      }
    }
  }

  return results;
}

