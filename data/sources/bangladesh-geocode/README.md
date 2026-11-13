# bangladesh-geocode source files

Unmodified copies of four CSV files from <https://github.com/nuhil/bangladesh-geocode>
(commit `c4b950b5cd2a65d42d75b12f7fad459e12777df6`, retrieved 2026-11-13). MIT licence, see [LICENSE](LICENSE).
Postcodes originate from the GeoNames postal code dump (CC BY 4.0). See [NOTICE.md](../../../NOTICE.md).

The files have no header row. `npm run data` turns them into `src/data/*.generated.ts`, and `npm run data:check`
(part of `npm run lint`) fails if the generated files are out of date. The build script also checks that there are
exactly 8 divisions, 64 districts and 495 upazilas.

To update: download the four files from the upstream repository, replace them here, run `npm run data`, review the
diff of the generated files and record the new commit in this file and in `NOTICE.md`.
