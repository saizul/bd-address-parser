import { parseAddress } from './parser.js';
import type { ParsedAddress, ParseOptions } from './types.js';

/** Why an address should be checked by a person (or the customer called) before it is shipped. */
export type ReviewReasonCode =
  | 'no_district'
  | 'no_thana'
  | 'no_street_detail'
  | 'no_phone'
  | 'low_confidence'
  | 'ambiguous'
  | 'conflict';

export interface ReviewReason {
  code: ReviewReasonCode;
  message: string;
}

export interface ReviewOptions extends ParseOptions {
  /** Flag addresses without a mobile number. Default `false` (the phone is often a separate form field). */
  requirePhone?: boolean;
  /** Flag addresses below this confidence (0 to 1). Default `0.5`. */
  minConfidence?: number;
  /** Flag addresses with ambiguous place names. Default `true`. */
  flagAmbiguous?: boolean;
}

export interface AddressReview {
  /** `true` when no reason was found: the address looks ready for a courier label. */
  ok: boolean;
  reasons: ReviewReason[];
  parsed: ParsedAddress;
}

const CONFLICT_WARNINGS = new Set(['postcode_mismatch', 'conflicting_district', 'conflicting_division']);

/**
 * Checks whether an address has what a courier needs: a district, a thana or area, some street-level detail
 * (house, road, village, landmark or street text) and, optionally, a phone number. It also flags low confidence,
 * ambiguous place names and contradictions such as a postcode from another district.
 *
 * Use it to route doubtful orders to a confirmation call instead of shipping them blind.
 *
 * ```ts
 * reviewAddress('Mirpur').reasons.map((r) => r.code); // ['no_street_detail', ...]
 * ```
 */
export function reviewAddress(input: string | ParsedAddress, options: ReviewOptions = {}): AddressReview {
  const parsed = typeof input === 'string' ? parseAddress(input, options) : input;
  const reasons: ReviewReason[] = [];
  const add = (code: ReviewReasonCode, message: string): void => {
    reasons.push({ code, message });
  };
  const c = parsed.components;

  if (!parsed.district) add('no_district', 'No district found; the courier cannot route the parcel.');
  if (!parsed.thana && !parsed.area) add('no_thana', 'No thana, upazila or area found.');
  if (!(c.house || c.road || c.village || c.landmark || c.street || c.flat || c.lane || c.block || c.sector)) {
    add('no_street_detail', 'No house, road, village, landmark or street name; the rider will need to call.');
  }
  if (options.requirePhone && !parsed.phone) add('no_phone', 'No Bangladeshi mobile number in the address.');
  const min = options.minConfidence ?? 0.5;
  if (parsed.confidence < min) add('low_confidence', `Parse confidence ${parsed.confidence.toFixed(2)} is below ${min}.`);
  if ((options.flagAmbiguous ?? true) && parsed.ambiguities.length > 0) {
    const fields = [...new Set(parsed.ambiguities.map((a) => a.field))].join(', ');
    add('ambiguous', `Ambiguous ${fields}: more than one place matches.`);
  }
  for (const w of parsed.warnings) if (CONFLICT_WARNINGS.has(w.code)) add('conflict', w.message);

  return { ok: reasons.length === 0, reasons, parsed };
}
