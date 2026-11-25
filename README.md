# bd-address-parser

Parse free-form **Bangladeshi delivery addresses** written in English, Bangla or Banglish into structured parts.

[![CI](https://github.com/saizul/bd-address-parser/actions/workflows/ci.yml/badge.svg)](https://github.com/saizul/bd-address-parser/actions/workflows/ci.yml)
[![Publish](https://github.com/saizul/bd-address-parser/actions/workflows/publish-github-packages.yml/badge.svg)](https://github.com/saizul/bd-address-parser/actions/workflows/publish-github-packages.yml)
![node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)
![module](https://img.shields.io/badge/module-ESM%20%2B%20CJS-blue)
![dependencies](https://img.shields.io/badge/runtime%20dependencies-0-blue)
![license](https://img.shields.io/badge/license-MIT-lightgrey)

Checkout forms in Bangladesh get addresses like `H#45, Rd#27(old), Dhanmondi R/A`, `বাসা ১২, মিরপুর ১০, ঢাকা`,
`Mohammadpur bus stand er pashe` or `Vill: Kalia, PO: Kalia, PS: Kalia, Dist: Narail`. Courier booking, delivery
pricing and fraud checks need the thana and district out of that text. This library reads it:

```ts
import { parseAddress } from 'bd-address-parser';

const r = parseAddress('Flat 4B, House 23/A, Road 7, Sector 4, Uttara, Dhaka 1230, 01712345678');
r.components;      // { house: '23/a', road: '7', flat: '4b', sector: '4' }
r.area?.name;      // 'Uttara'
r.thana?.name;     // 'Uttara West' (source: 'inferred')
r.district?.name;  // 'Dhaka'
r.postcode;        // '1230'
r.phone;           // '01712345678'
r.zone;            // 'inside_dhaka'
r.confidence;      // 0.95
```

## Contents

- [Features](#features)
- [Install](#install)
- [Install from GitHub Packages](#install-from-github-packages)
- [Usage](#usage)
- [How it works](#how-it-works)
- [API reference](#api-reference)
- [Result reference](#result-reference)
- [Configuration](#configuration)
- [Examples](#examples)
- [Data](#data)
- [Testing](#testing)
- [Limitations](#limitations)
- [Contributing](#contributing)
- [License](#license)

## Features

- **English, Bangla and mixed input** - Bangla labels (বাসা, রোড, থানা, উপজেলা, জেলা, ডাকঘর, গ্রাম, তলা ...), Bangla
  digits, the visarga colon (`থানাঃ`), Bangla case endings (`ঢাকার`, `মিরপুরে`) and Banglish postpositions
  (`er pashe`, `samne`, `kache`).
- **Complete administrative data** - 8 divisions, 64 districts and 495 upazilas with English and Bangla names and
  BBS geocodes, built from a public MIT-licensed dataset. Counts are checked at build time and in the tests.
- **Old and alternative spellings** - Chittagong/Chattogram, Comilla/Cumilla, Bogra/Bogura, Barisal/Barishal,
  Jessore/Jashore, Chapai Nawabganj, Coxsbazar, Netrokona, Moulvi Bazar and many more.
- **Fuzzy matching** - Damerau-Levenshtein distance on both the spelling and a phonetic key that folds Banglish
  variants (`gonj/ganj`, `sh/s`, `z/j`, `v/bh`, double letters, `ee/i`, `oo/u`). Short words must match exactly, so
  "Feni" never turns into "Pabna".
- **Dhaka city** - the 50 Dhaka Metropolitan Police thanas and 69 well-known areas (Mirpur, Uttara, Dhanmondi,
  Gulshan, Bashundhara, Banasree, Mohakhali DOHS ...) mapped to their thana, with section numbers (`Mirpur 10`,
  `Gulshan 2`, `Dhanmondi 27`). Chattogram's CMP thanas and main areas, and Dhaka suburbs (Ashulia, Tongi,
  Fatullah ...) are included too.
- **Street components** - house, road (numbered or named), flat, floor, block, sector, lane, village, post office,
  landmark and leftover street text, plus the Bangladeshi mobile number.
- **Postcodes** - four-digit postcodes are found, looked up in a bundled list of 1,349 post offices and used to
  confirm or infer the district and, for city post offices, the thana.
- **Confidence and ambiguity** - a 0 to 1 confidence score, a high/medium/low level, every competing reading of
  a shared name (Kaliganj exists in four districts, Mirpur in Dhaka and Kushtia, Kotwali in Dhaka and Chattogram)
  and warnings for conflicting districts, postcode mismatches and fuzzy matches.
- **Courier zones** - `isInsideDhaka()` and `getDeliveryZone()` return `inside_dhaka`, `dhaka_suburb`,
  `outside_dhaka` or `unknown`, with configurable suburb lists.
- **Address comparison** - `compareAddresses()` tells whether two addresses point to the same door (`same`,
  `likely_same`, `same_area`, `different`, `unknown`) with per-field outcomes, and `addressKey()` gives a stable key
  for grouping orders per household, so `House 23A, Road-7, Mirpur-10` and `বাসা ২৩/এ, রোড ৭, মিরপুর ১০` match.
- **Order review** - `reviewAddress()` says whether an address is ready for a courier label or needs a
  confirmation call: no district, no thana or area, no street detail, no phone (optional), low confidence,
  ambiguous place names or contradictions.
- **Zero runtime dependencies**, ESM and CommonJS builds with type declarations, Node.js 18 or newer. Also runs in
  browsers and edge runtimes (no Node APIs are used at runtime).

## Install

```bash
npm install bd-address-parser
```

## Install from GitHub Packages

Every release is also published to GitHub Packages as `@saizul/bd-address-parser`.

1. Create a GitHub personal access token (classic) with the `read:packages` scope.
2. Add an `.npmrc` next to your `package.json`:

   ```ini
   @saizul:registry=https://npm.pkg.github.com
   //npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
   ```

3. Install with the token in your environment:

   ```bash
   export GITHUB_TOKEN=ghp_your_token_here
   npm install @saizul/bd-address-parser
   ```

4. Import the scoped name:

   ```ts
   import { parseAddress } from '@saizul/bd-address-parser';
   ```

In GitHub Actions, use `actions/setup-node` with `registry-url: https://npm.pkg.github.com` and `scope: '@saizul'`,
and pass `NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}` to `npm ci`.

## Usage

### Parse an address

```ts
import { parseAddress, formatAddress } from 'bd-address-parser';

const r = parseAddress('বাড়ি নং ৫৪, রোড নং ৩, ব্লক সি, বনশ্রী, রামপুরা, ঢাকা-১২১৯');
r.components;         // { house: '54', road: '3', block: 'সি' }
r.area;               // { id: 'dhaka/banasree', name: 'Banasree', bn: 'বনশ্রী', city: 'dhaka', source: 'matched', ... }
r.thana;              // { id: 'dhaka/rampura', name: 'Rampura', type: 'metro-thana', source: 'matched', ... }
r.district?.id;       // 'dhaka'
r.postcode;           // '1219'
formatAddress(r);                 // 'House 54, Road 3, Block সি, Banasree, Rampura, Dhaka 1219'
formatAddress(r, { lang: 'bn' }); // 'বাসা ৫৪, রোড ৩, ব্লক সি, বনশ্রী, রামপুরা, ঢাকা ১২১৯'
```

### Village addresses

```ts
const r = parseAddress('Vill: Charpara, PO: Mallikbari, PS: Bhaluka, Dist: Mymensingh');
r.components; // { village: 'charpara', postOffice: 'mallikbari' }
r.thana?.id;  // 'mymensingh/bhaluka' (type 'upazila')
r.division?.name; // 'Mymensingh' (source 'inferred')
```

### Ambiguous names

```ts
const r = parseAddress('Kaliganj');
r.thana?.id;       // 'gazipur/kaliganj' (one of four)
r.confidenceLevel; // 'low'
r.ambiguities;
// [{ field: 'district', text: 'kaliganj', chosen: 'gazipur',
//    candidates: [{ id: 'gazipur', ... }, { id: 'jhenaidah', ... }, { id: 'lalmonirhat', ... }, { id: 'satkhira', ... }] }]

parseAddress('Kaliganj, Satkhira').thana?.id; // 'satkhira/kaliganj', no ambiguity
parseAddress('Kaliganj', { defaultDistrict: 'satkhira' }).district?.id; // 'satkhira'
```

When the confidence is low or `ambiguities` is not empty, ask the customer to pick the district or thana from a
list instead of guessing.

### Courier pricing

```ts
import { isInsideDhaka, getDeliveryZone } from 'bd-address-parser';

isInsideDhaka('Mirpur 10');                              // true
isInsideDhaka('Ashulia, Savar');                         // false
isInsideDhaka('Ashulia, Savar', { includeSuburbs: true }); // true
getDeliveryZone('Agrabad, Chittagong');                  // 'outside_dhaka'
getDeliveryZone('House 5, Road 3');                      // 'unknown'
```

Both functions accept a raw string or a result of `parseAddress()`, so you can parse once and reuse the result.

### Compare addresses and find duplicate orders

```ts
import { compareAddresses, addressKey } from 'bd-address-parser';

const r = compareAddresses('House 23A, Road-7, Mirpur-10 Dhaka 1216', 'বাসা ২৩/এ, রোড ৭, মিরপুর ১০, ঢাকা');
r.verdict;   // 'same'
r.score;     // 1
r.conflicts; // []

compareAddresses('House 23A, Road 7, Mirpur 10', 'House 25, Road 7, Mirpur 10').conflicts; // ['house'] -> 'different'
compareAddresses('Mirpur 10, Dhaka', 'House 5, Road 3, Mirpur 10, Dhaka').verdict;        // 'same_area'
compareAddresses('Mirpur, Dhaka', 'Mirpur, Kushtia').verdict;                              // 'different'

addressKey('H 23/A, Rd 7, Mirpur 10, Dhaka');                    // 'dhaka|dhaka/mirpur-model|dhaka/mirpur:10|h23a|r7'
addressKey('H 23/A, Rd 7, Mirpur 10, Dhaka', { level: 'area' }); // 'dhaka|dhaka/mirpur-model|dhaka/mirpur:10'
```

Each field is compared on both sides: district, thana, area (with section), postcode, house, road, flat, floor,
block, sector, lane, village, post office and street text, and the phone with `comparePhone: true`. House, road,
flat and block values are compared in a canonical form (`23/A`, `23-a`, `০২৩/এ` all become `23a`); village, post
office and street text by phonetic key with a spelling tolerance (`textThreshold`, default `0.85`).

| Verdict | Meaning |
| --- | --- |
| `same` | Location agrees and at least two street-level details (house, road, flat, block, sector, lane, village) agree. |
| `likely_same` | Mostly agrees, with small differences (a missing section number, an inferred thana) or one detail to compare. |
| `same_area` | Location agrees, but street details are missing on one side. |
| `different` | The district, postcode, house, flat or village disagrees, or the weighted score is below 0.6. |
| `unknown` | Too little was recognised to decide. |

A field missing on either side is not counted. A thana that the parser only inferred from an area counts as a
partial match when it differs, because neighbourhoods such as Mirpur span several thanas. `addressKey()` is an exact
key (empty when no district is known); use `compareAddresses()` when the spelling of the street details varies. See
[`examples/duplicate-orders.mjs`](examples/duplicate-orders.mjs).

### Review an address before shipping

```ts
import { reviewAddress } from 'bd-address-parser';

reviewAddress('House 12, Road 5, Dhanmondi, Dhaka-1209').ok; // true
reviewAddress('Mirpur').reasons.map((r) => r.code);         // ['no_street_detail', 'low_confidence', 'ambiguous']
reviewAddress('House 12, Road 5, Dhanmondi, Dhaka 4000').reasons[0];
// { code: 'conflict', message: 'Postcode 4000 belongs to Chattogram, not Dhaka.' }
reviewAddress(order.address, { requirePhone: true, minConfidence: 0.6 });
```

| Reason | When |
| --- | --- |
| `no_district` | No district found or inferred. |
| `no_thana` | No thana, upazila or area. |
| `no_street_detail` | No house, road, flat, lane, block, sector, village, landmark or street text. |
| `no_phone` | With `requirePhone: true`, no mobile number in the address. |
| `low_confidence` | Confidence below `minConfidence` (default `0.5`). |
| `ambiguous` | A place name matches more than one place (turn off with `flagAmbiguous: false`). |
| `conflict` | Postcode, district or division contradict each other (message from the parser warning). |

### Search places

```ts
import { searchPlaces, getDistricts, getUpazilas, lookupPostcode } from 'bd-address-parser';

searchPlaces('Jessore', { kinds: ['district'] })[0];
// { place: { kind: 'district', id: 'jashore', name: 'Jashore', bn: 'যশোর', code: 'BD4041', ... }, score: 0.97, method: 'alias' }

getDistricts('sylhet').map((d) => d.name); // ['Sylhet', 'Moulvibazar', 'Habiganj', 'Sunamganj']
getUpazilas('dhaka').map((u) => u.name);   // ['Savar', 'Dhamrai', 'Keraniganj', 'Nawabganj', 'Dohar']
lookupPostcode('১২০৭');
// [{ postcode: '1207', postOffice: 'Mohammadpur Housing', thana: 'Mohammadpur', districtId: 'dhaka' }]
```

### Utilities

```ts
import { toEnglishDigits, toBanglaDigits, foldBanglish, damerauLevenshtein, normalizePhone } from 'bd-address-parser';

toEnglishDigits('ঢাকা-১২০৭');               // 'ঢাকা-1207'
toBanglaDigits('Road 27');                  // 'Road ২৭'
foldBanglish('Narayangonj') === foldBanglish('Narayanganj'); // true
damerauLevenshtein('dhaka', 'dahka');       // 1
normalizePhone('+880 1812-345678');         // '01812345678'
```

## How it works

1. **Normalize** - NFC, Bangla digits to ASCII, zero-width characters removed, lower case, separators (`,` `;` `।`
   new line `|`) turned into segment breaks, and labels in Bangla or abbreviated English (`H#`, `Rd#`, `P.O.`, `P.S.`,
   `Dist.`, `Vill.`, `জেলা`, `থানা` ...) rewritten to plain label words.
2. **Components** - phone numbers, labelled postcodes, house, road, flat, floor, block, sector, named roads, village
   and landmark are extracted with patterns and removed from the text, so a house number is never read as a
   postcode and "Mirpur Road" is not read as the Mirpur area. Place names that end in "road" (Green Road, Bailey Road,
   Elephant Road) are kept.
3. **Gazetteer matching** - every one to four word phrase inside a segment is looked up by exact name, alias,
   phonetic key, and finally by Damerau-Levenshtein distance on the phonetic key and on the spelling. A label next to
   a phrase (`Sherpur district`, `Bandar thana`) is recorded as a hint.
4. **Readings** - each match produces a reading (area, thana, district, division that fit together), as does the
   postcode. A reading scores points for every written name that supports it and loses points for strong names that
   contradict it. City areas and metro thanas get a small bonus, and a section number (`Mirpur 10`) a larger one,
   because that is what most customers mean.
5. **Result** - the best reading wins. Others that read the same text differently and score close to it are
   reported in `ambiguities`. Levels that were not written are filled in and marked `source: 'inferred'`.

## API reference

| Function | Returns | Description |
| --- | --- | --- |
| `parseAddress(input, options?)` | `ParsedAddress` | Parse one address. Never throws; empty or non-string input gives an empty result with an `empty_input` warning. |
| `formatAddress(parsed, options?)` | `string` | One-line label. `lang: 'en' \| 'bn'`, `includeDivision`, `separator`. |
| `isInsideDhaka(input, options?)` | `boolean` | Inside Dhaka city. `includeSuburbs` also accepts Dhaka sub-areas. |
| `getDeliveryZone(input, options?)` | `DeliveryZone` | `inside_dhaka`, `dhaka_suburb`, `outside_dhaka` or `unknown`. |
| `compareAddresses(a, b, options?)` | `AddressComparison` | `verdict`, `score` (0 to 1), `fields` (per-field `outcome`: `match`, `partial`, `mismatch`, `missing`), `conflicts` and both parse results. Options: parse options plus `comparePhone`, `textThreshold`. |
| `reviewAddress(input, options?)` | `AddressReview` | `ok`, `reasons` (`code` and `message`) and the parse result. Options: parse options plus `requirePhone`, `minConfidence`, `flagAmbiguous`. |
| `addressKey(input, options?)` | `string` | Grouping key `district\|thana\|area[:section]\|h..\|r..\|f..`. `level`: `district`, `thana`, `area` or `door` (default). |
| `canonicalNumber(value)` | `string` | Canonical house, road or flat value: `২৩/এ` gives `23a`. |
| `searchPlaces(query, options?)` | `SearchResult[]` | Place search with the parser's matching. Options: `kinds`, `minScore`, `disableFuzzy`, `limit` (default 10). |
| `getDivisions()` | `Division[]` | All 8 divisions. |
| `getDistricts(divisionId?)` | `District[]` | All 64 districts, or those of one division. |
| `getUpazilas(districtId?)` | `Upazila[]` | All 495 upazilas, or those of one district. |
| `getMetroThanas(city?)` | `MetroThana[]` | DMP (`dhaka`) and CMP (`chattogram`) thanas. |
| `getAreas(city?)` | `Area[]` | City areas (`dhaka`, `chattogram`) and suburbs (`dhaka-suburb`). |
| `getPlace(kind, id)` | `Place \| undefined` | One place by kind and id. |
| `lookupPostcode(code)` | `PostcodeEntry[]` | Post offices using a postcode (ASCII or Bangla digits). |
| `postcodesForDistrict(id)` | `string[]` | Known postcodes of a district. |
| `isPostcodeFormat(code)` | `boolean` | Four digits, 1000 to 9999. |
| `normalizeAddress(input)` | `string` | The normalization step on its own. |
| `normalizePhone(input)` | `string \| undefined` | Bangladeshi mobile number to `01XXXXXXXXX`. |
| `toEnglishDigits(s)`, `toBanglaDigits(s)`, `hasBangla(s)` | | Digit conversion and script check. |
| `foldBanglish(s)`, `foldBangla(s)`, `phoneticKey(s)` | `string` | Phonetic keys used for matching. |
| `damerauLevenshtein(a, b, max?)`, `similarity(a, b)` | `number` | Edit distance (optimal string alignment) with optional early exit, and 0 to 1 similarity. |
| `DEFAULT_SUBURB_UPAZILAS`, `DEFAULT_SUBURB_DISTRICTS`, `VERSION` | | Constants. |

### Place ids

| Kind | Id format | Example |
| --- | --- | --- |
| `division` | slug | `chattogram` |
| `district` | slug | `coxs-bazar` |
| `upazila` | `district/upazila` | `gazipur/kaliganj` |
| `metro-thana` | `city/thana` | `dhaka/mirpur-model`, `chattogram/double-mooring` |
| `area` | `city/area` | `dhaka/bashundhara`, `dhaka-suburb/tongi` |

Divisions, districts and upazilas also carry the official BBS geocode in `code` (`BD30`, `BD3026`, `BD30260072`).

## Result reference

| Field | Type | Notes |
| --- | --- | --- |
| `input`, `normalized` | `string` | Original and normalized text. |
| `components` | `AddressComponents` | `house`, `road`, `flat`, `floor`, `block`, `sector`, `lane`, `village`, `postOffice`, `landmark`, `street`. Digits are ASCII, text is lower case as written. |
| `area` | `AreaRef?` | Known neighbourhood, with `city` and `section` (`10` in "Mirpur 10"). |
| `thana` | `ThanaRef?` | Upazila or metro thana; `type` tells which. `section` for "Gulshan 2". |
| `district`, `division` | `PlaceRef?` | |
| `postcode` | `string?` | Four-digit postcode found in the text. |
| `postcodeEntries` | `PostcodeEntry[]` | Post offices using that postcode, empty if unknown. |
| `phone` | `string?` | Mobile number, `01XXXXXXXXX`. |
| `zone` | `DeliveryZone` | See [Courier pricing](#courier-pricing). |
| `confidence` | `number` | 0 to 1. |
| `confidenceLevel` | `'high' \| 'medium' \| 'low'` | `>= 0.75`, `>= 0.5`, below. |
| `ambiguities` | `Ambiguity[]` | `field`, `text`, `chosen`, `candidates` (best first). |
| `warnings` | `ParseWarning[]` | `code` and `message`, see below. |
| `matches` | `Array` | Every gazetteer hit considered, for debugging. |

Every `PlaceRef` has `id`, `name`, `bn`, `score` and `source`: `matched` (written in the address, with `text` and
`method`: `exact`, `alias`, `phonetic` or `fuzzy`), `inferred` (derived from a lower level) or `postcode`.

| Warning code | Meaning |
| --- | --- |
| `empty_input` | Nothing to parse. |
| `input_truncated` | The input was longer than `maxLength` and was cut. |
| `no_location_found` | No known place in the text. |
| `district_not_found` | A thana or area was found but no district could be determined. |
| `postcode_unknown` | The postcode is not in the bundled list. |
| `postcode_mismatch` | The postcode belongs to a different district. |
| `conflicting_district`, `conflicting_division` | A written district or division contradicts the rest. |
| `fuzzy_match` | A name was matched by spelling similarity only. |

### Confidence

The score adds up evidence: a matched district (up to 0.40), a matched thana or area (up to 0.25), street
components (0.12), an agreeing postcode (0.12) and a matching division (0.05), and subtracts 0.15 per ambiguity and
per conflict. A complete address such as `House 12, Road 5, Dhanmondi, Dhaka 1209` scores about 0.95, `Dhanmondi,
Dhaka` about 0.71, a bare district about 0.46 and an ambiguous `Kaliganj` about 0.46. Use the level for decisions,
not the exact number; the weights may be tuned in minor releases.

## Configuration

```ts
parseAddress(input, {
  minScore: 0.72,          // minimum match score; raise to cut false positives
  disableFuzzy: false,     // turn off edit-distance matching
  defaultDistrict: 'dhaka',// tie breaker, e.g. your shop's district; reported as inferred
  maxLength: 500,          // longer input is cut (warning input_truncated) to bound the parse time
  zones: {
    suburbUpazilas: ['dhaka/savar', 'dhaka/keraniganj', 'gazipur/gazipur-sadar', 'narayanganj/narayanganj-sadar'],
    suburbDistricts: ['gazipur', 'narayanganj'], // used when only the district is known
    bareDhakaIsInside: true, // treat a plain "Dhaka" as inside Dhaka city
  },
});
```

Default suburb upazilas (`DEFAULT_SUBURB_UPAZILAS`): Savar, Keraniganj and Dhamrai (Dhaka), Gazipur Sadar, and
Narayanganj Sadar and Bandar. Areas such as Ashulia, Hemayetpur, Tongi, Fatullah, Siddhirganj and Kanchpur are
always `dhaka_suburb`. Courier companies publish different lists, so set your own if they differ.

## Examples

Build first (`npm run build`), then:

| File | Shows |
| --- | --- |
| [`examples/basic.mjs`](examples/basic.mjs) | Parsing and formatting in English and Bangla |
| [`examples/courier-zone.mjs`](examples/courier-zone.mjs) | Delivery charge by zone, asking the customer when unsure |
| [`examples/batch.mjs`](examples/batch.mjs) | Parse [`examples/addresses.txt`](examples/addresses.txt) to CSV |
| [`examples/duplicate-orders.mjs`](examples/duplicate-orders.mjs) | Grouping orders per household and flagging duplicates |
| [`examples/commonjs.cjs`](examples/commonjs.cjs) | Using the CommonJS build |

## Data

| Data | Count | Source | Licence |
| --- | --- | --- | --- |
| Divisions, districts, upazilas (English and Bangla names, BBS codes) | 8 / 64 / 495 | [nuhil/bangladesh-geocode](https://github.com/nuhil/bangladesh-geocode) (commit `c4b950b`, 2026-11-12), built from Bangladesh Bureau of Statistics geocodes (UN OCHA COD-AB) | MIT (repository); BBS data CC BY-IGO 3.0 |
| Post offices and postcodes | 1,349 | Same repository, from the GeoNames postal code dump (compiled from the Bangladesh Post Office list) | CC BY 4.0 (GeoNames) |
| Aliases and spellings | | Written for this project | MIT |
| Dhaka DMP thanas, Chattogram CMP thanas | 50 / 15 | Public station lists of the two police forces | facts |
| City areas and suburbs | 90 | Curated for this project | MIT |

The source CSV files are kept unchanged in [`data/sources/bangladesh-geocode/`](data/sources/bangladesh-geocode/).
`npm run data` regenerates `src/data/*.generated.ts`, and the build script fails unless there are exactly 8
divisions, 64 districts and 495 upazilas. Attribution details are in [NOTICE.md](NOTICE.md).

English names follow the official BBS spelling (Chattogram, Cumilla, Bogura, Barishal, Jashore, Chapainababganj).
Old spellings are accepted as input but the result always uses the official name.

## Testing

```bash
npm install
npm test           # compiles and runs the node:test suites (over 320 tests)
npm run lint       # eslint, type check and generated-data check
npm run build && npm run test:dist   # load the ESM and CJS builds
```

The tests cover over 150 real-world style addresses (Dhaka, Chattogram and rural, English, Bangla and Banglish),
the data counts, aliases, fuzzy matching, components, postcodes, zones, formatting, address comparison, ambiguity
and robustness against odd input. CI runs them on Node 18, 20, 22 and 24.

## Limitations

- **Thana for an area is a best guess.** Neighbourhood names do not follow police boundaries. Mirpur spans six
  thanas, Uttara two. Such areas list the extra thanas in `otherThanaIds`, and the thana is marked `inferred`. A
  thana written in the address always wins.
- **Only Dhaka and Chattogram have city thanas and areas.** Other city corporations (Khulna, Rajshahi, Sylhet,
  Barishal, Rangpur, Mymensingh, Gazipur, Narayanganj, Cumilla) are covered at upazila and district level only, so
  "Zindabazar, Sylhet" gives the district but no thana.
- **Unions, villages and wards are not matched.** Villages are extracted as text (`components.village`) when they are
  labelled.
- **The postcode list is incomplete.** It holds the 1,349 offices of the GeoNames dump; some delivery offices are
  missing, and an unknown code is reported with `postcode_unknown` rather than rejected. Postal thanas are not always
  administrative units.
- **Phonetic folding is lossy by design.** It can occasionally join two different names; edit-distance matching is
  limited by length (no fuzzy matching under five letters) and flagged with `fuzzy_match`. Use `disableFuzzy` or a
  higher `minScore` if false positives matter more than recall.
- **Zones are a convention, not a rule.** Courier companies define "inside Dhaka" and "sub-area" differently; adjust
  the lists in `zones`.
- **No geocoding.** The library returns names and ids, not coordinates.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Address samples that parse wrongly are the most useful contribution; please
remove names and phone numbers first.

## License

[MIT](LICENSE) © 2026 Saizul Amin. Bundled data is licensed by its authors, see [NOTICE.md](NOTICE.md).
