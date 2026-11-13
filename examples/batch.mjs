// Parse a file with one address per line and print CSV.
// Run after `npm run build`: node examples/batch.mjs examples/addresses.txt > parsed.csv
import { readFileSync } from 'node:fs';
import { parseAddress } from 'bd-address-parser';

const file = process.argv[2] ?? new URL('./addresses.txt', import.meta.url);
const lines = readFileSync(file, 'utf8').split(/\r?\n/).filter((l) => l.trim());
const csv = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

console.log(['input', 'house', 'road', 'area', 'thana', 'district', 'division', 'postcode', 'zone', 'confidence', 'ambiguous'].join(','));
for (const line of lines) {
  const r = parseAddress(line);
  console.log(
    [
      line,
      r.components.house,
      r.components.road,
      r.area?.name,
      r.thana?.name,
      r.district?.name,
      r.division?.name,
      r.postcode,
      r.zone,
      r.confidence,
      r.ambiguities.length > 0,
    ]
      .map(csv)
      .join(','),
  );
}
