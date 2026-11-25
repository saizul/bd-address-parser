export { parseAddress } from './parser.js';
export { formatAddress, type FormatOptions } from './format.js';
export { isInsideDhaka, getDeliveryZone } from './helpers.js';
export {
  reviewAddress,
  type AddressReview,
  type ReviewOptions,
  type ReviewReason,
  type ReviewReasonCode,
} from './review.js';
export {
  compareAddresses,
  addressKey,
  canonicalNumber,
  type AddressComparison,
  type AddressKeyOptions,
  type CompareField,
  type CompareOptions,
  type CompareVerdict,
  type FieldComparison,
  type FieldOutcome,
} from './compare.js';
export {
  searchPlaces,
  getDivisions,
  getDistricts,
  getUpazilas,
  getMetroThanas,
  getAreas,
  getPlace,
  type SearchResult,
} from './places.js';
export { lookupPostcode, postcodesForDistrict, isPostcodeFormat } from './postcode.js';
export { normalizeAddress } from './normalize.js';
export { normalizePhone } from './components.js';
export { toEnglishDigits, toBanglaDigits, hasBangla } from './digits.js';
export { foldBanglish, foldBangla, phoneticKey } from './phonetic.js';
export { damerauLevenshtein, similarity } from './distance.js';
export { DEFAULT_SUBURB_DISTRICTS, DEFAULT_SUBURB_UPAZILAS, type InsideDhakaOptions } from './zones.js';
export { VERSION } from './version.js';
export type * from './types.js';
