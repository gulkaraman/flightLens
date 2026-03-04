// Puppeteer browser bootstrap:
// - Debug modunda headful + slowMo ile çalışır ve hata anında screenshot alınmasına izin verir.
// - CI modunda güvenli argümanlar ekler: --no-sandbox, --disable-setuid-sandbox.
// Not: Çalışma şeklini değiştirirseniz README'deki "Scraper / Debug & CI" notlarını da güncelleyin.

import puppeteer, { type Browser, type LaunchOptions } from 'puppeteer';

export interface LaunchBrowserOptions {
  headless?: boolean;
  debug?: boolean;
  ci?: boolean;
  slowMoMs?: number;
}

export async function launchBrowser(options: LaunchBrowserOptions = {}): Promise<Browser> {
  const isCi = options.ci ?? process.env.CI === 'true';
  const debug = options.debug ?? false;
  const headlessEnv = process.env.HEADLESS;
  let headless = options.headless;
  if (headless == null) {
    if (typeof headlessEnv === 'string') {
      const normalized = headlessEnv.toLowerCase();
      headless = !(normalized === 'false' || normalized === '0' || normalized === 'no');
    } else {
      headless = !debug;
    }
  }

  const args: string[] = [
    '--disable-dev-shm-usage',
    '--no-default-browser-check',
    '--disable-background-networking'
  ];

  if (isCi) {
    args.push('--no-sandbox', '--disable-setuid-sandbox');
  }

  const launchOptions: LaunchOptions = {
    headless,
    args
  };

  if (debug) {
    launchOptions.slowMo = options.slowMoMs ?? 120;
    // Daha rahat debugging için sabit viewport.
    (launchOptions as any).defaultViewport = { width: 1366, height: 768 };
  }

  return puppeteer.launch(launchOptions);
}

