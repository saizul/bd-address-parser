import { toEnglishDigits } from './digits.js';
import { similarity } from './distance.js';
import { parseAddress } from './parser.js';
import { foldBanglish } from './phonetic.js';
import { getPlace } from './places.js';
import type { AddressComponents, ParsedAddress, ParseOptions, PlaceRef } from './types.js';

/** Fields compared by {@link compareAddresses}. */
export type CompareField =
  | 'district'
  | 'thana'
  | 'area'
  | 'postcode'
  | 'house'
  | 'road'
  | 'flat'
  | 'floor'
  | 'block'
  | 'sector'
  | 'lane'
  | 'village'
  | 'postOffice'
  | 'street'
  | 'phone';

/**
 * Outcome for one field:
 * `match` (same value), `partial` (close, for example a missing section number or a near spelling),
 * `mismatch` (both written, different) or `missing` (absent on at least one side, not counted).
 */
export type FieldOutcome = 'match' | 'partial' | 'mismatch' | 'missing';

export interface FieldComparison {
  field: CompareField;
  /** Canonical value on each side, as used for the comparison. */
  a?: string;
  b?: string;
  outcome: FieldOutcome;
  /** Weight of the field in the score. */
  weight: number;
}

/**
 * Overall verdict of {@link compareAddresses}:
 * - `same`: the location agrees and the street-level details (house, road, flat ...) agree.
 * - `likely_same`: mostly agrees, with small differences or few details to compare.
 * - `same_area`: the location agrees but there are no street-level details on both sides to compare.
 * - `different`: a strong field disagrees or the score is low.
 * - `unknown`: too little was recognised in one or both addresses.
 */
export type CompareVerdict = 'same' | 'likely_same' | 'same_area' | 'different' | 'unknown';

export interface AddressComparison {
  verdict: CompareVerdict;
  /** Weighted agreement between 0 and 1 over the fields present on both sides. */
  score: number;
  fields: FieldComparison[];
  /** Fields that disagree, strongest first. */
  conflicts: CompareField[];
  a: ParsedAddress;
  b: ParsedAddress;
}

export interface CompareOptions extends ParseOptions {
  /** Take the phone number into account. Default `false`: the same household often orders from two numbers. */
  comparePhone?: boolean;
  /** Similarity (0 to 1) at which free-text fields (street, village, post office) count as a match. Default `0.85`. */
  textThreshold?: number;
}

/** Weights per field. Location fields carry the most, then the street-level numbers that identify a door. */
const WEIGHTS: Record<CompareField, number> = {
  district: 3,
  thana: 2,
  area: 2,
  postcode: 1.5,
  house: 3,
  road: 2,
  flat: 2,
  floor: 0.5,
  block: 1.5,
  sector: 1.5,
  lane: 1,
  village: 2,
  postOffice: 1,
  street: 1,
  phone: 1,
};

/** Fields that decide the verdict alone when they disagree. */
const HARD_FIELDS: readonly CompareField[] = ['district', 'house', 'flat', 'village', 'postcode'];
const STREET_FIELDS: readonly CompareField[] = ['house', 'road', 'flat', 'block', 'sector', 'lane', 'village'];
type ComponentField = CompareField & keyof AddressComponents;
const NUMBER_FIELDS: readonly ComponentField[] = ['house', 'road', 'flat', 'floor', 'block', 'sector', 'lane'];
const TEXT_FIELDS: readonly ComponentField[] = ['village', 'postOffice', 'street'];

/** Bangla letters people write as house, flat and block suffixes ("২৩/এ", "ব্লক সি"). */
const BANGLA_LETTERS: ReadonlyArray<readonly [string, string]> = [
  ['এইচ', 'h'],
  ['এফ', 'f'],
  ['জি', 'g'],
  ['বি', 'b'],
  ['সি', 'c'],
  ['ডি', 'd'],
  ['ই', 'e'],
  ['এ', 'a'],
];

// Anything that is not a parse result goes to parseAddress(), which turns non-string input into an empty result.
const toParsed = (input: string | ParsedAddress, options?: ParseOptions): ParsedAddress =>
  typeof input === 'object' && input !== null && 'components' in input ? input : parseAddress(input as string, options);

/** Phonetic key of a free-text value, without spaces or punctuation. */
const canonicalText = (value: string): string =>
  foldBanglish(toEnglishDigits(value.normalize('NFC')).toLowerCase()).replace(/[^\p{L}\p{N}]+/gu, '');

/**
 * Canonical form of a house, road, flat or block value: ASCII digits, Bangla suffix letters in Latin, no spaces,
 * slashes or dashes, and no leading zeros. `23/A`, `23-a`, `২৩/এ` and `023a` all become `23a`.
 */
export function canonicalNumber(value: string): string {
  let v = toEnglishDigits(value.normalize('NFC')).toLowerCase();
  for (const [bn, en] of BANGLA_LETTERS) v = v.split(bn).join(en);
  v = v.replace(/[^\p{L}\p{N}]+/gu, '');
  // Named values ("Green Road", "দক্ষিণ পাড়া") are compared by their phonetic key instead.
  if (!/^[a-z0-9]*$/.test(v)) return canonicalText(value);
  return v.replace(/^0+(?=\d)/, '');
}

/**
 * Readings of the house number. The parser sometimes leaves part of it in the street text (`H 23 A`, or the
 * Bangla suffix in `২৩/এ`), so the street text is tried as the house number and as its suffix.
 */
function houseReadings(c: AddressComponents): string[] {
  const out = new Set<string>();
  if (c.house) out.add(canonicalNumber(c.house));
  const extra = houseFromStreet(c);
  if (extra) out.add(extra);
  if (c.house && c.street && c.street.length <= 3) out.add(canonicalNumber(c.house + c.street));
  out.delete('');
  return [...out];
}

const SUFFIX_LETTER = /^(?:[a-z]|এ|বি|সি|ডি|ই|এফ|জি|এইচ)$/u;

/** House number read from the street text: a labelled number (`H 23 A`) or a one-letter suffix (`২৩/এ`). */
function houseFromStreet(c: AddressComponents): string | undefined {
  if (!c.street) return undefined;
  if (c.house) return SUFFIX_LETTER.test(c.street.trim()) ? canonicalNumber(c.house + c.street) : undefined;
  const m = /^(?:h|house|bari|basa|বাসা|বাড়ি)(?:\s+|(?=\d))(.*\d.*)$/u.exec(toEnglishDigits(c.street));
  return m ? canonicalNumber(m[1]!) : undefined;
}

function comparePlace(field: CompareField, a: PlaceRef | undefined, b: PlaceRef | undefined): FieldComparison {
  const weight = WEIGHTS[field];
  if (!a || !b) return { field, a: a?.id, b: b?.id, outcome: 'missing', weight };
  if (a.id === b.id) return { field, a: a.id, b: b.id, outcome: 'match', weight };
  // A value the parser only inferred is a guess (Mirpur spans six thanas), so a difference is weak evidence.
  const outcome: FieldOutcome = a.source === 'inferred' || b.source === 'inferred' ? 'partial' : 'mismatch';
  return { field, a: a.id, b: b.id, outcome, weight };
}

function compareArea(a: ParsedAddress, b: ParsedAddress): FieldComparison {
  const weight = WEIGHTS.area;
  const key = (p: ParsedAddress): string | undefined => (p.area ? (p.area.section ? `${p.area.id}:${p.area.section}` : p.area.id) : undefined);
  const ka = key(a);
  const kb = key(b);
  if (!a.area || !b.area) return { field: 'area', a: ka, b: kb, outcome: 'missing', weight };
  if (a.area.id !== b.area.id) {
    // Areas that share a thana ("Shewrapara" and "Mirpur") may both be right; let the thana decide.
    const thanaOf = (id: string): string | undefined => {
      const place = getPlace('area', id);
      return place?.kind === 'area' ? place.thanaId : undefined;
    };
    const ta = thanaOf(a.area.id);
    const sameThana = !!ta && ta === thanaOf(b.area.id);
    return { field: 'area', a: ka, b: kb, outcome: sameThana ? 'partial' : 'mismatch', weight };
  }
  const sa = a.area.section;
  const sb = b.area.section;
  if (sa && sb && sa !== sb) return { field: 'area', a: ka, b: kb, outcome: 'mismatch', weight };
  return { field: 'area', a: ka, b: kb, outcome: sa === sb ? 'match' : 'partial', weight };
}

function compareValue(
  field: CompareField,
  va: string | undefined,
  vb: string | undefined,
  canon: (v: string) => string,
  threshold?: number,
): FieldComparison {
  const weight = WEIGHTS[field];
  const a = va ? canon(va) : undefined;
  const b = vb ? canon(vb) : undefined;
  if (!a || !b) return { field, a, b, outcome: 'missing', weight };
  if (a === b) return { field, a, b, outcome: 'match', weight };
  if (threshold !== undefined) {
    const s = similarity(a, b);
    if (s >= threshold) return { field, a, b, outcome: 'match', weight };
    if (s >= threshold - 0.2 || a.includes(b) || b.includes(a)) return { field, a, b, outcome: 'partial', weight };
  }
  return { field, a, b, outcome: 'mismatch', weight };
}

/**
 * Compare two addresses and tell whether they point to the same place, for duplicate order detection, repeat
 * customer matching or checking a courier's delivered address against the order.
 *
 * Accepts raw strings or results of {@link parseAddress}. Fields that are missing on either side are not counted,
 * so `Mirpur 10, Dhaka` and `House 5, Road 3, Mirpur 10, Dhaka` give `same_area`, not `different`.
 *
 * ```ts
 * compareAddresses('H#23/A, Rd 7, Mirpur 10, Dhaka', 'বাসা ২৩/এ, রোড ৭, মিরপুর-১০, ঢাকা').verdict; // 'same'
 * ```
 */
export function compareAddresses(
  inputA: string | ParsedAddress,
  inputB: string | ParsedAddress,
  options: CompareOptions = {},
): AddressComparison {
  const a = toParsed(inputA, options);
  const b = toParsed(inputB, options);
  const threshold = options.textThreshold ?? 0.85;
  const ca = a.components;
  const cb = b.components;

  const fields: FieldComparison[] = [
    comparePlace('district', a.district, b.district),
    comparePlace('thana', a.thana, b.thana),
    compareArea(a, b),
    compareValue('postcode', a.postcode, b.postcode, (v) => v),
  ];
  for (const f of NUMBER_FIELDS) fields.push(compareValue(f, ca[f], cb[f], canonicalNumber));
  for (const f of TEXT_FIELDS) fields.push(compareValue(f, ca[f], cb[f], canonicalText, threshold));
  if (options.comparePhone) fields.push(compareValue('phone', a.phone, b.phone, (v) => v));

  // When the parser left part of the house number in the street text on one side, try the other readings.
  const house = fields.find((f) => f.field === 'house')!;
  if (house.outcome !== 'match' && (ca.street || cb.street)) {
    const ra = houseReadings(ca);
    const rb = houseReadings(cb);
    const common = ra.find((r) => rb.includes(r));
    if (common) {
      Object.assign(house, { a: common, b: common, outcome: 'match' });
      const street = fields.find((f) => f.field === 'street')!;
      if (street.outcome !== 'match') street.outcome = 'missing';
    }
  }

  let total = 0;
  let agreed = 0;
  for (const f of fields) {
    if (f.outcome === 'missing') continue;
    total += f.weight;
    if (f.outcome === 'match') agreed += f.weight;
    else if (f.outcome === 'partial') agreed += f.weight * 0.5;
  }
  const score = total === 0 ? 0 : Math.round((agreed / total) * 100) / 100;
  const conflicts = fields
    .filter((f) => f.outcome === 'mismatch')
    .sort((x, y) => y.weight - x.weight)
    .map((f) => f.field);

  const located = (p: ParsedAddress): boolean => !!(p.district || p.thana || p.area || p.postcode);
  const streetCompared = fields.filter((f) => STREET_FIELDS.includes(f.field) && f.outcome !== 'missing');
  const streetAgrees = streetCompared.length > 0 && streetCompared.every((f) => f.outcome === 'match');

  let verdict: CompareVerdict;
  if (total === 0 || (!located(a) && !located(b) && streetCompared.length === 0)) verdict = 'unknown';
  else if (conflicts.some((f) => HARD_FIELDS.includes(f))) verdict = 'different';
  else if (!located(a) || !located(b)) verdict = streetAgrees && score >= 0.85 ? 'likely_same' : 'unknown';
  else if (score < 0.6) verdict = 'different';
  else if (streetCompared.length === 0) verdict = score >= 0.75 ? 'same_area' : 'different';
  else if (streetAgrees && score >= 0.85 && streetCompared.length >= 2) verdict = 'same';
  else verdict = 'likely_same';

  return { verdict, score, fields, conflicts, a, b };
}

/** Options accepted by {@link addressKey}. */
export interface AddressKeyOptions extends ParseOptions {
  /** Stop at this level. `door` (default) includes house, road, flat and block; `area` stops at the area. */
  level?: 'district' | 'thana' | 'area' | 'door';
}

/**
 * A stable grouping key for an address, for example to count orders per household or per area:
 * `dhaka|dhaka/mirpur-model|dhaka/mirpur:10|h23a|r7`.
 *
 * Two spellings of the same address give the same key, as long as the parser reads the same parts from them.
 * Returns an empty string when no district is known. Use {@link compareAddresses} for a tolerant comparison.
 */
export function addressKey(input: string | ParsedAddress, options: AddressKeyOptions = {}): string {
  const p = toParsed(input, options);
  if (!p.district) return '';
  const level = options.level ?? 'door';
  const parts = [p.district.id];
  if (level === 'district') return parts.join('|');
  parts.push(p.thana?.id ?? '');
  if (level === 'thana') return parts.join('|');
  parts.push(p.area ? (p.area.section ? `${p.area.id}:${p.area.section}` : p.area.id) : '');
  if (level === 'area') return parts.join('|');
  const c = p.components;
  const tagged: Array<[string, string | undefined]> = [
    ['h', houseFromStreet(c) ?? c.house],
    ['r', c.road],
    ['f', c.flat],
    ['b', c.block],
    ['s', c.sector],
    ['v', c.village && canonicalText(c.village)],
  ];
  for (const [tag, value] of tagged) {
    if (!value) continue;
    const v = tag === 'v' ? value : canonicalNumber(value);
    if (v) parts.push(tag + v);
  }
  return parts.join('|');
}
