import { POSTCODES } from './data/postcodes.generated.js';
import { toEnglishDigits } from './digits.js';
import type { PostcodeEntry } from './types.js';

let byCode: Map<string, PostcodeEntry[]> | undefined;

function index(): Map<string, PostcodeEntry[]> {
  if (byCode) return byCode;
  byCode = new Map();
  for (const [postcode, postOffice, thana, districtId, upazilaId] of POSTCODES) {
    const entry: PostcodeEntry = { postcode, postOffice, thana, districtId };
    if (upazilaId) entry.upazilaId = upazilaId;
    const list = byCode.get(postcode);
    if (list) list.push(entry);
    else byCode.set(postcode, [entry]);
  }
  return byCode;
}

/**
 * Post offices that use a postcode. Accepts ASCII or Bangla digits. Returns an empty array for unknown codes.
 *
 * The list comes from the GeoNames postal code dump for Bangladesh (compiled from the Bangladesh Post Office list),
 * as linked to districts and upazilas by the bangladesh-geocode project. It is not complete: some delivery
 * offices are missing.
 */
export function lookupPostcode(code: string | number): PostcodeEntry[] {
  const key = toEnglishDigits(String(code)).trim();
  return (index().get(key) ?? []).map((e) => ({ ...e }));
}

/** Postcodes of a district, sorted. */
export function postcodesForDistrict(districtId: string): string[] {
  const out = new Set<string>();
  for (const [code, list] of index()) if (list.some((e) => e.districtId === districtId)) out.add(code);
  return [...out].sort();
}

/** True for a four-digit string in the range used by Bangladesh Post (1000 to 9999). */
export function isPostcodeFormat(code: string): boolean {
  return /^[1-9]\d{3}$/.test(toEnglishDigits(code));
}

/** Number of post office entries bundled. */
export function postcodeCount(): number {
  return POSTCODES.length;
}
