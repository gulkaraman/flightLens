import fs from 'fs';
import path from 'path';
import { loadConfig } from '../config/loadConfig';
import { launchBrowser } from '../scraper/browser';
import { runSearch } from '../scraper/searchFlow';
import { applyDirectFilterAndParse } from '../scraper/resultsParser';

async function main(): Promise<void> {
  const debug = process.env.DEBUG_SCRAPER === 'true';

  const configPath = 'config/search.json';
  const params = loadConfig(configPath);

  const browser = await launchBrowser({ debug });
  const page = await browser.newPage();

  try {
    await runSearch(page, params, debug);
    await applyDirectFilterAndParse(page, params.directOnly ?? true);

    const html = await page.content();
    const ts = new Date().toISOString().replace(/[:.]/g, '-');

    const fixturesDir = path.resolve(process.cwd(), 'fixtures');
    fs.mkdirSync(fixturesDir, { recursive: true });
    const htmlPath = path.join(fixturesDir, `obilet_${ts}.html`);
    fs.writeFileSync(htmlPath, html, 'utf-8');

    const artifactsDir = path.resolve(process.cwd(), 'artifacts');
    fs.mkdirSync(artifactsDir, { recursive: true });
    const screenshotPath = path.join(artifactsDir, `obilet_${ts}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });

    // eslint-disable-next-line no-console
    console.log(
      `Capture completed. HTML saved to ${path.relative(
        process.cwd(),
        htmlPath
      )}, screenshot saved to ${path.relative(process.cwd(), screenshotPath)}`
    );
  } finally {
    await browser.close();
  }
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Capture CLI failed:', error);
  process.exitCode = 1;
});

