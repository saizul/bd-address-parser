# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `compareAddresses()` to tell whether two addresses point to the same place, for duplicate order and repeat
  customer checks: a `same`, `likely_same`, `same_area`, `different` or `unknown` verdict, a weighted score,
  per-field outcomes (district, thana, area and section, postcode, house, road, flat, floor, block, sector, lane,
  village, post office, street text and, with `comparePhone`, the phone) and the conflicting fields.
- `addressKey()` for grouping orders per household or area, with `level` (`district`, `thana`, `area`, `door`).
- `canonicalNumber()`: house, road and flat values in one form (`23/A`, `23-a` and `২৩/এ` give `23a`).
- `examples/duplicate-orders.mjs`, run in CI.

## [0.1.0] - 2026-11-13

### Added

- `parseAddress()` for free-form Bangladeshi addresses in English, Bangla and Banglish: house, road (numbered and
  named), flat, floor, block, sector, lane, village, post office, landmark, street text, area, thana or upazila,
  district, division, postcode and mobile number.
- Bundled data for 8 divisions, 64 districts and 495 upazilas with English and Bangla names and BBS geocodes, built
  from nuhil/bangladesh-geocode (MIT) by `scripts/build-data.mjs`, with count checks.
- Aliases for old and alternative spellings (Chittagong, Comilla, Bogra, Barisal, Jessore and more).
- The 50 DMP thanas, 15 CMP thanas, 69 Dhaka areas, 9 Chattogram areas and 12 Dhaka suburbs, with section numbers
  (`Mirpur 10`, `Gulshan 2`).
- Matching by exact name, alias, phonetic key (Banglish and Bangla folding) and Damerau-Levenshtein distance.
- Postcode list of 1,349 post offices (GeoNames, CC BY 4.0) used to confirm or infer district and city thana.
- Confidence score and level, ambiguity reporting and warnings for conflicts, postcode mismatches and fuzzy matches.
- `isInsideDhaka()` and `getDeliveryZone()` with configurable suburb lists.
- `formatAddress()` in English and Bangla, `searchPlaces()`, data accessors, `lookupPostcode()`, digit conversion,
  phonetic keys, edit distance and phone normalization helpers.
- ESM and CommonJS builds with type declarations, zero runtime dependencies.
- Examples, CI on Node 18, 20, 22 and 24, and a GitHub Packages publish workflow.

[Unreleased]: https://github.com/saizul/bd-address-parser/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/saizul/bd-address-parser/releases/tag/v0.1.0
