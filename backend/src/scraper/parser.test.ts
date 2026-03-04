import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';
import { parseFlightsFromHtml } from './resultsParser';

describe('parseFlightsFromHtml', () => {
  it('parses at least one flight from sample fixture', () => {
    const fixturePath = path.resolve(__dirname, '..', '..', 'fixtures', 'obilet_sample.html');
    const html = fs.readFileSync(fixturePath, 'utf-8');

    const results = parseFlightsFromHtml(html, true);

    expect(results.length).toBeGreaterThan(0);
    const first = results[0];
    expect(first.airline).toBeTruthy();
    expect(first.departTime).toMatch(/^\d{2}:\d{2}$/);
    expect(first.priceText).toMatch(/TL/);
  });
});

