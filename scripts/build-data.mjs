// Builds src/data/*.generated.ts from the CSV files in data/sources/bangladesh-geocode.
//
//   node scripts/build-data.mjs           write the generated files
//   node scripts/build-data.mjs --check   fail if the generated files are out of date
//
// The source CSV files have no header row. Column order (from the upstream README):
//   divisions: id, name, bn_name, url, bbs_code, lat, lon
//   districts: id, division_id, name, bn_name, lat, lon, url, bbs_code
//   upazilas:  id, district_id, name, bn_name, url, bbs_code, lat, lon
//   postcodes: id, division_id, district_id, upazila_id, city_corporation_id, thana, post_office, postcode, lat, lon,
//              link_method
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SOURCE = join('data', 'sources', 'bangladesh-geocode');
const OUT = join('src', 'data');
const EXPECTED = { divisions: 8, districts: 64, upazilas: 495 };

/** Minimal RFC 4180 CSV parser (quoted fields, doubled quotes, CRLF or LF). */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      if (row.some((f) => f !== '')) rows.push(row);
      row = [];
      field = '';
    } else field += ch;
  }
  if (field !== '' || row.length) {
    row.push(field);
    if (row.some((f) => f !== '')) rows.push(row);
  }
  return rows;
}

const read = (name) => parseCsv(readFileSync(join(SOURCE, `${name}.csv`), 'utf8'));
const nfc = (s) => s.normalize('NFC').trim();

/** URL-safe slug used as a stable public id. */
function slugify(name) {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function build() {
  const divisions = read('divisions').map((r) => ({
    sourceId: Number(r[0]),
    slug: slugify(r[1]),
    name: nfc(r[1]),
    bn: nfc(r[2]),
    code: r[4],
  }));
  const divById = new Map(divisions.map((d) => [d.sourceId, d]));

  const districts = read('districts').map((r) => ({
    sourceId: Number(r[0]),
    division: divById.get(Number(r[1])).slug,
    slug: slugify(r[2]),
    name: nfc(r[2]),
    bn: nfc(r[3]),
    code: r[7],
  }));
  const distById = new Map(districts.map((d) => [d.sourceId, d]));

  const upazilas = read('upazilas').map((r) => {
    const district = distById.get(Number(r[1]));
    return {
      sourceId: Number(r[0]),
      district: district.slug,
      slug: `${district.slug}/${slugify(r[2])}`,
      name: nfc(r[2]),
      bn: nfc(r[3]),
      code: r[5],
    };
  });
  const upzById = new Map(upazilas.map((u) => [u.sourceId, u]));

  const postcodes = read('postcodes').map((r) => ({
    postcode: r[7],
    postOffice: nfc(r[6]),
    thana: nfc(r[5]),
    district: distById.get(Number(r[2])).slug,
    upazila: r[3] ? upzById.get(Number(r[3])).slug : '',
  }));

  for (const [key, n] of Object.entries(EXPECTED)) {
    const got = { divisions, districts, upazilas }[key].length;
    if (got !== n) throw new Error(`expected ${n} ${key}, found ${got}`);
  }
  for (const list of [divisions, districts, upazilas]) {
    const seen = new Set();
    for (const item of list) {
      if (seen.has(item.slug)) throw new Error(`duplicate slug ${item.slug}`);
      seen.add(item.slug);
      if (!item.bn) throw new Error(`missing Bangla name for ${item.slug}`);
    }
  }
  for (const p of postcodes) if (!/^\d{4}$/.test(p.postcode)) throw new Error(`bad postcode ${p.postcode}`);

  const header =
    '// This file is built by scripts/build-data.mjs from data/sources/bangladesh-geocode. Do not edit it by hand.\n' +
    '// Source: https://github.com/nuhil/bangladesh-geocode (MIT). See NOTICE.md for attribution.\n';
  const tuple = (values) => JSON.stringify(values);

  const admin =
    header +
    "import type { RawDivision, RawDistrict, RawUpazila } from '../types.js';\n\n" +
    '/** [slug, name, bn, bbsCode] */\n' +
    'export const DIVISIONS: readonly RawDivision[] = [\n' +
    divisions.map((d) => `  ${tuple([d.slug, d.name, d.bn, d.code])},\n`).join('') +
    '];\n\n' +
    '/** [slug, divisionSlug, name, bn, bbsCode] */\n' +
    'export const DISTRICTS: readonly RawDistrict[] = [\n' +
    districts.map((d) => `  ${tuple([d.slug, d.division, d.name, d.bn, d.code])},\n`).join('') +
    '];\n\n' +
    '/** [slug, districtSlug, name, bn, bbsCode] */\n' +
    'export const UPAZILAS: readonly RawUpazila[] = [\n' +
    upazilas.map((u) => `  ${tuple([u.slug, u.district, u.name, u.bn, u.code])},\n`).join('') +
    '];\n';

  const post =
    header.replace('(MIT)', '(MIT); postcodes from the GeoNames postal code dump (CC BY 4.0)') +
    "import type { RawPostcode } from '../types.js';\n\n" +
    '/** [postcode, postOffice, postalThana, districtSlug, upazilaSlug or ""] */\n' +
    'export const POSTCODES: readonly RawPostcode[] = [\n' +
    postcodes.map((p) => `  ${tuple([p.postcode, p.postOffice, p.thana, p.district, p.upazila])},\n`).join('') +
    '];\n';

  return {
    files: { 'admin.generated.ts': admin, 'postcodes.generated.ts': post },
    counts: {
      divisions: divisions.length,
      districts: districts.length,
      upazilas: upazilas.length,
      postcodes: postcodes.length,
    },
  };
}

const { files, counts } = build();
const check = process.argv.includes('--check');
let stale = false;
for (const [name, content] of Object.entries(files)) {
  const path = join(OUT, name);
  if (check) {
    let current = '';
    try {
      current = readFileSync(path, 'utf8');
    } catch {
      /* missing file counts as stale */
    }
    if (current !== content) {
      console.error(`${path} is out of date. Run: npm run data`);
      stale = true;
    }
  } else writeFileSync(path, content);
}
console.log(`data ${check ? 'checked' : 'written'}: ${JSON.stringify(counts)}`);
process.exit(stale ? 1 : 0);
