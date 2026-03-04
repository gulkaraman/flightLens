import puppeteer from 'puppeteer';

async function main() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('https://example.com');

  const title = await page.title();
  // eslint-disable-next-line no-console
  console.log('Scraped page title:', title);

  await browser.close();
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Scrape failed:', error);
  process.exit(1);
});

