# Contributing

Thanks for helping improve bd-address-parser. Bug reports, address samples, data fixes and pull requests are welcome.

## Getting started

```bash
git clone https://github.com/saizul/bd-address-parser.git
cd bd-address-parser
npm install
npm run lint
npm test
```

Node.js 18 or newer is required (the lint tooling needs Node 20 or newer).

## Project layout

| Path | Purpose |
| --- | --- |
| `src/parser.ts` | `parseAddress()`: matching, readings, scoring, ambiguity and confidence |
| `src/normalize.ts` | Text normalization and label rewriting (Bangla and abbreviated English) |
| `src/components.ts` | House, road, flat, floor, block, sector, village, landmark and phone extraction |
| `src/gazetteer.ts` | Place index: exact, alias, phonetic and edit-distance lookup |
| `src/phonetic.ts`, `src/distance.ts` | Banglish and Bangla folding, Damerau-Levenshtein distance |
| `src/postcode.ts`, `src/zones.ts`, `src/format.ts` | Postcode lookup, delivery zones, formatting |
| `src/data/aliases.ts` | Alternative spellings (hand-written) |
| `src/data/cities.ts` | Dhaka and Chattogram thanas and areas, Dhaka suburbs (hand-written) |
| `src/data/*.generated.ts` | Built by `npm run data`; never edit by hand |
| `data/sources/` | Unmodified upstream CSV files |
| `test/` | `node:test` suites |
| `examples/` | Runnable examples |

## Reporting a wrong parse

Open an issue with the address, what you got and what you expected. **Remove names, phone numbers and exact house
numbers** first; the place names are what matter.

## Guidelines

- **Add a test for every fix.** Most fixes are a new row in `test/parser.test.ts` or `test/bangla.test.ts`.
- **Data changes need a source.** For aliases or areas, say where the spelling or the area to thana mapping comes
  from (a government page, the police station list, a courier coverage list). Do not edit the generated files; update
  the upstream CSV as described in `data/sources/bangladesh-geocode/README.md`.
- **Keep matching conservative.** A false district is worse than no district. New phonetic rules must not make any
  existing test fail and should come with a test that shows two different places still stay apart.
- **Zero runtime dependencies.** Development dependencies are fine.
- **Style.** `npm run lint` must pass. Keep public APIs typed and documented with TSDoc.
- **Changelog.** Add a line under `[Unreleased]` in `CHANGELOG.md`.

## Commit messages

Short imperative subject line (`Add Sylhet city areas`, `Fix Bangla floor label`), with details in the body when
needed.

## Releasing

1. Update the version in `package.json` and `src/version.ts`, and move the `[Unreleased]` entries in `CHANGELOG.md`.
2. Tag `vX.Y.Z` and publish a GitHub release. The `Publish to GitHub Packages` workflow builds, tests and publishes
   `@saizul/bd-address-parser`.

## Code of conduct

Be respectful and constructive. Harassment of any kind is not tolerated.
