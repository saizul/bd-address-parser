# Third-party data

bd-address-parser bundles data from other projects. Their licences and attribution requirements are listed here.
The code of bd-address-parser itself is MIT licensed (see [LICENSE](LICENSE)).

## bangladesh-geocode

- Source: <https://github.com/nuhil/bangladesh-geocode>, commit `c4b950b5cd2a65d42d75b12f7fad459e12777df6`
  (2026-11-12), retrieved 2026-11-13.
- Files used: `divisions.csv`, `districts.csv`, `upazilas.csv`, `postcodes.csv`, copied unchanged to
  [`data/sources/bangladesh-geocode/`](data/sources/bangladesh-geocode/).
- Licence: MIT, Copyright (c) 2014 Nuhil Mehdy. The full licence text is in
  [`data/sources/bangladesh-geocode/LICENSE`](data/sources/bangladesh-geocode/LICENSE).

That project in turn builds on the following sources, as documented in its README:

| Data | Upstream source | Licence |
| --- | --- | --- |
| Official names, BBS geocodes of divisions, districts and upazilas | Bangladesh Bureau of Statistics geocodes, published as the Bangladesh Subnational Administrative Boundaries (COD-AB) dataset by UN OCHA on the Humanitarian Data Exchange | CC BY-IGO 3.0 |
| Post offices and postcodes | GeoNames postal code dump for Bangladesh (`BD.zip`), compiled from the Bangladesh Post Office postcode list | CC BY 4.0 |
| Bangla names | Original collection of the bangladesh-geocode project from bangladesh.gov.bd and other public pages | MIT (as that repository) |

Postcode data: "GeoNames" (<https://www.geonames.org/>), licensed under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). The list was linked to districts and upazilas by the
bangladesh-geocode project; bd-address-parser keeps the postcode, post office name, postal thana, district and upazila
and drops the coordinates.

## Hand-curated lists

The aliases in `src/data/aliases.ts` and the city thana and area lists in `src/data/cities.ts` are written for this
project and are covered by its MIT licence. The thana lists follow the public station lists of the Dhaka Metropolitan
Police (50 thanas) and the Chattogram Metropolitan Police.
