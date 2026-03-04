import fs from 'fs';
import path from 'path';
import type { Page } from 'puppeteer';

export interface DebugOptions {
  domain: string;
  label?: string;
  error?: unknown;
  page?: Page | null;
  extraLines?: string[];
}

export async function debugDump(options: DebugOptions): Promise<void> {
  const { domain, label, error, page, extraLines } = options;

  try {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const baseDir = path.resolve(process.cwd(), 'debug', domain, ts);
    fs.mkdirSync(baseDir, { recursive: true });

    const lines: string[] = [];
    lines.push(`[${new Date().toISOString()}] debug dump (${domain})`);
    if (label) lines.push(`label=${label}`);

    if (error instanceof Error) {
      lines.push(`error.name=${error.name}`);
      lines.push(`error.message=${error.message}`);
      if (error.stack) lines.push(error.stack);
    } else if (error) {
      lines.push(`error.nonError=${String(error)}`);
    }

    if (extraLines && extraLines.length > 0) {
      lines.push('--- extra ---');
      lines.push(...extraLines);
    }

    fs.writeFileSync(path.join(baseDir, 'logs.txt'), lines.join('\n'), 'utf-8');

    if (page) {
      try {
        const screenshotPath = path.join(baseDir, 'screenshot.png');
        await page.screenshot({ path: screenshotPath, fullPage: true });
      } catch (sErr) {
        // eslint-disable-next-line no-console
        console.error('debugDump: screenshot failed', sErr);
      }

      try {
        const html = await page.content();
        fs.writeFileSync(path.join(baseDir, 'page.html'), html, 'utf-8');
      } catch (hErr) {
        // eslint-disable-next-line no-console
        console.error('debugDump: html dump failed', hErr);
      }
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('debugDump failed:', e);
  }
}

