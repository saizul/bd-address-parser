/** Raw tuples used by the bundled data files. */
export type RawDivision = readonly [slug: string, name: string, bn: string, code: string];
export type RawDistrict = readonly [slug: string, division: string, name: string, bn: string, code: string];
export type RawUpazila = readonly [slug: string, district: string, name: string, bn: string, code: string];
export type RawPostcode = readonly [postcode: string, postOffice: string, thana: string, district: string, upazila: string];

/** Kinds of places the gazetteer knows about. */
export type PlaceKind = 'division' | 'district' | 'upazila' | 'metro-thana' | 'area';

/** A division (bibhag). */
export interface Division {
  kind: 'division';
  id: string;
  name: string;
  bn: string;
  /** Bangladesh Bureau of Statistics geocode, e.g. `BD30`. */
  code: string;
  aliases: readonly string[];
}

/** A district (zila / jela). */
export interface District {
  kind: 'district';
  id: string;
  name: string;
  bn: string;
  code: string;
  divisionId: string;
  aliases: readonly string[];
}

/** An upazila (sub-district), the rural administrative unit below a district. */
export interface Upazila {
  kind: 'upazila';
  /** `<district-slug>/<upazila-slug>`, for example `gazipur/kaliganj`. */
  id: string;
  name: string;
  bn: string;
  code: string;
  districtId: string;
  aliases: readonly string[];
}

/** A metropolitan police thana (Dhaka DMP or Chattogram CMP). */
export interface MetroThana {
  kind: 'metro-thana';
  /** `<city>/<thana-slug>`, for example `dhaka/mirpur-model`. */
  id: string;
  name: string;
  bn: string;
  city: 'dhaka' | 'chattogram';
  districtId: string;
  aliases: readonly string[];
}

/** A well-known neighbourhood or locality that people write instead of a thana. */
export interface Area {
  kind: 'area';
  /** `<city>/<area-slug>`, for example `dhaka/dhanmondi`. */
  id: string;
  name: string;
  bn: string;
  /** City or region this area belongs to. */
  city: 'dhaka' | 'chattogram' | 'dhaka-suburb';
  districtId: string;
  /** Metro thana id (`dhaka/...`) or upazila id (`gazipur/gazipur-sadar`) the area belongs to, best effort. */
  thanaId?: string;
  /** Other thanas the area spans, if it crosses boundaries. */
  otherThanaIds?: readonly string[];
  aliases: readonly string[];
}

export type Place = Division | District | Upazila | MetroThana | Area;

/** How a name in the input was matched to a place. */
export type MatchMethod = 'exact' | 'alias' | 'phonetic' | 'fuzzy';

/** Where a resolved field came from. */
export type FieldSource = 'matched' | 'inferred' | 'postcode';

/** A resolved administrative unit in a parse result. */
export interface PlaceRef {
  id: string;
  name: string;
  bn: string;
  /** `matched`: written in the address. `inferred`: derived from a lower level. `postcode`: from the postcode. */
  source: FieldSource;
  /** Match quality between 0 and 1 (1 for inferred values that follow from a matched lower level). */
  score: number;
  /** The text in the input that produced the match, when `source` is `matched`. */
  text?: string;
  method?: MatchMethod;
}

export interface ThanaRef extends PlaceRef {
  /** `upazila` for rural sub-districts, `metro-thana` for Dhaka and Chattogram city thanas. */
  type: 'upazila' | 'metro-thana';
  /** Section number written after a metro thana, for example `2` in "Gulshan 2". */
  section?: string;
}

export interface AreaRef extends PlaceRef {
  city: Area['city'];
  /** Section or sector number written after the area, for example `10` in "Mirpur-10". */
  section?: string;
}

/** A single gazetteer hit inside the input. */
export interface Match {
  place: Place;
  /** The matched text (normalized). */
  text: string;
  /** Token span [start, end) in the normalized token list. */
  start: number;
  end: number;
  score: number;
  method: MatchMethod;
  /** Label next to the match, such as "district" or "thana", if any. */
  hint?: 'division' | 'district' | 'thana' | 'post-office';
}

/** One field that could be read more than one way. */
export interface Ambiguity {
  field: 'area' | 'thana' | 'district' | 'division';
  /** Text in the address that caused the ambiguity. */
  text: string;
  /** The value chosen. */
  chosen: string;
  /** All plausible readings, best first. */
  candidates: Array<{ id: string; name: string; districtId: string; score: number }>;
}

export type WarningCode =
  | 'empty_input'
  | 'input_truncated'
  | 'no_location_found'
  | 'district_not_found'
  | 'postcode_unknown'
  | 'postcode_mismatch'
  | 'conflicting_district'
  | 'conflicting_division'
  | 'fuzzy_match';

export interface ParseWarning {
  code: WarningCode;
  message: string;
}

/** Street-level parts found in the address. All values are strings as written (digits converted to ASCII). */
export interface AddressComponents {
  house?: string;
  road?: string;
  flat?: string;
  floor?: string;
  block?: string;
  sector?: string;
  lane?: string;
  village?: string;
  postOffice?: string;
  landmark?: string;
  /** Leftover street text that is not a known place, such as a building or road name. */
  street?: string;
}

export type DeliveryZone = 'inside_dhaka' | 'dhaka_suburb' | 'outside_dhaka' | 'unknown';

export interface PostcodeEntry {
  postcode: string;
  postOffice: string;
  /** Postal thana as published by the post office; not always an administrative unit. */
  thana: string;
  districtId: string;
  upazilaId?: string;
}

/** Result of {@link parseAddress}. */
export interface ParsedAddress {
  input: string;
  /** Lower-cased input with Bangla digits converted and punctuation normalized. */
  normalized: string;
  components: AddressComponents;
  area?: AreaRef;
  thana?: ThanaRef;
  district?: PlaceRef;
  division?: PlaceRef;
  /** Four-digit postcode found in the address. */
  postcode?: string;
  /** Post offices that use the postcode, from the bundled list. Empty if the postcode is unknown. */
  postcodeEntries: PostcodeEntry[];
  /** Bangladeshi mobile number found in the address, normalized to `01XXXXXXXXX`. */
  phone?: string;
  /** Delivery zone for courier pricing. */
  zone: DeliveryZone;
  /** Overall confidence between 0 and 1. */
  confidence: number;
  confidenceLevel: 'high' | 'medium' | 'low';
  ambiguities: Ambiguity[];
  warnings: ParseWarning[];
  /** Every gazetteer hit considered, for debugging. */
  matches: Array<{ text: string; kind: PlaceKind; id: string; score: number; method: MatchMethod }>;
}

export interface ParseOptions {
  /**
   * Minimum match score (0 to 1) for a fuzzy match to be considered. Default `0.72`.
   * Raise it to reduce false positives, lower it to accept rougher spellings.
   */
  minScore?: number;
  /** Disable fuzzy (edit distance) matching. Exact, alias and phonetic matching still run. Default `false`. */
  disableFuzzy?: boolean;
  /**
   * District to assume when the address names none, for example the shop's own district.
   * Used only as a tie breaker and reported as `inferred`.
   */
  defaultDistrict?: string;
  /** Zone rules used for `zone`. */
  zones?: ZoneOptions;
  /**
   * Longest input read, in characters. Longer input is cut and an `input_truncated` warning is added, which keeps
   * the parse time bounded for hostile input. Default `500`.
   */
  maxLength?: number;
}

export interface ZoneOptions {
  /** Districts treated as Dhaka suburbs when only the district is known. Default `['gazipur', 'narayanganj']`. */
  suburbDistricts?: readonly string[];
  /**
   * Upazila ids treated as Dhaka suburbs. Default: Savar, Keraniganj and Dhamrai (Dhaka), Gazipur Sadar,
   * Narayanganj Sadar and Bandar. See `DEFAULT_SUBURB_UPAZILAS`.
   */
  suburbUpazilas?: readonly string[];
  /** Treat a bare "Dhaka" (district matched, no thana) as inside Dhaka. Default `true`. */
  bareDhakaIsInside?: boolean;
}
