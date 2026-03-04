import fs from 'fs';
import path from 'path';
import type { ElementHandle, Page } from 'puppeteer';
import type { SelectorCandidate } from './selectors';
import { selectorSummary } from './selectors';

interface WaitOptions {
  timeoutMs?: number;
  debug?: boolean;
  debugLabel?: string;
}

const DEFAULT_TIMEOUT_MS = 15_000;

async function captureDebugScreenshot(page: Page, label: string): Promise<string | undefined> {
  const artifactsDir = path.resolve(process.cwd(), 'artifacts');
  try {
    fs.mkdirSync(artifactsDir, { recursive: true });
  } catch {
    // mkdir hatası debug amaçlı olduğundan sessiz geçilebilir.
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const safeLabel = label.replace(/[^a-z0-9-_]+/gi, '_').slice(0, 60);
  const filePath = path.join(artifactsDir, `${timestamp}-${safeLabel}.png`);

  try {
    await page.screenshot({ path: filePath, fullPage: true });
    return filePath;
  } catch {
    return undefined;
  }
}

export async function safeWaitVisible(
  page: Page,
  selector: string,
  message: string,
  options: WaitOptions = {}
): Promise<ElementHandle<Element>> {
  const timeout = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  try {
    const handle = await page.waitForSelector(selector, {
      visible: true,
      timeout
    });

    if (!handle) {
      throw new Error(`Element not found for selector "${selector}". ${message}`);
    }

    return handle;
  } catch (error) {
    if (options.debug) {
      await captureDebugScreenshot(page, options.debugLabel ?? `safeWaitVisible-${selector}`);
    }
    throw new Error(
      `${message} (selector="${selector}", timeout=${timeout}ms): ${(error as Error).message}`
    );
  }
}

export async function waitAndClick(
  page: Page,
  selector: string,
  message: string,
  options: WaitOptions = {}
): Promise<void> {
  const handle = await safeWaitVisible(page, selector, message, options);
  try {
    await handle.click();
  } catch (error) {
    if (options.debug) {
      await captureDebugScreenshot(page, options.debugLabel ?? `waitAndClick-${selector}`);
    }
    throw new Error(`Click failed on "${selector}": ${(error as Error).message}. ${message}`);
  }
}

export async function byTextContains(
  page: Page,
  text: string,
  candidates: SelectorCandidate[],
  message: string,
  options: WaitOptions = {}
): Promise<ElementHandle<Element>> {
  const timeout = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const deadline = Date.now() + timeout;

  const normalizedText = text.trim();

  for (const candidate of candidates) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;

    try {
      if (candidate.kind === 'xpath') {
        const xpath = `${candidate.selector}[contains(normalize-space(.), ${JSON.stringify(
          normalizedText
        )})]`;
        const handle = await (page as any).waitForXPath(xpath, {
          visible: true,
          timeout: remaining
        });
        if (handle) return handle as ElementHandle<Element>;
      } else {
        const handles = await page.$$(candidate.selector);
        for (const handle of handles) {
          const content = (await page.evaluate(
            (el) => (el.textContent ?? '').trim(),
            handle
          )) as string;
          if (content.includes(normalizedText)) {
            return handle as ElementHandle<Element>;
          }
        }
      }
    } catch {
      // Bu candidate başarısız oldu, sıradaki fallback denenir.
      continue;
    }
  }

  if (options.debug) {
    await captureDebugScreenshot(page, options.debugLabel ?? `byTextContains-${normalizedText}`);
  }

  throw new Error(
    `${message} - No element found containing text "${normalizedText}". Tried selectors: ${selectorSummary(
      candidates
    )}`
  );
}

export async function typeAndSelectFromDropdown(
  page: Page,
  inputSelector: string,
  value: string,
  optionCandidates: SelectorCandidate[],
  message: string,
  options: WaitOptions = {}
): Promise<void> {
  const handle = await safeWaitVisible(page, inputSelector, message, options);

  try {
    await handle.click({ clickCount: 3 });
    await handle.type(value, { delay: 50 });
  } catch (error) {
    if (options.debug) {
      await captureDebugScreenshot(
        page,
        options.debugLabel ?? `typeAndSelect-input-${inputSelector}`
      );
    }
    throw new Error(
      `Failed to type into "${inputSelector}" with value "${value}": ${
        (error as Error).message
      }. ${message}`
    );
  }

  try {
    const optionHandle = await byTextContains(
      page,
      value,
      optionCandidates,
      `${message} (while selecting dropdown option)`,
      options
    );

    try {
      await optionHandle.click();
    } catch (error) {
      if (options.debug) {
        await captureDebugScreenshot(
          page,
          options.debugLabel ?? `typeAndSelect-option-${inputSelector}`
        );
      }
      // Dropdown opsiyonu tıklanamazsa, en azından input'ta şehir adı yazılı kalsın.
      throw new Error(
        `Failed to click dropdown option for "${value}": ${(error as Error).message}. ${message}`
      );
    }
  } catch (error) {
    // Bazı layout'larda otomatik tamamlama listesi farklı çalışabiliyor;
    // bu durumda dropdown seçimi zorunlu tutmayıp sadece input'a yazılmış değeri kullanarak devam ediyoruz.
    if (options.debug) {
      // eslint-disable-next-line no-console
      console.warn(
        `Dropdown option not found for "${value}", continuing with typed value only: ${
          (error as Error).message
        }`
      );
    }
  }
}

