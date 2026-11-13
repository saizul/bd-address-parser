import type { DeliveryZone, ParsedAddress, ParseOptions, ZoneOptions } from './types.js';

/**
 * Upazilas that couriers usually price as "Dhaka sub-area" rather than inside or outside Dhaka.
 * Courier companies each publish their own lists, so this is a sensible default, not a rule. Override it with
 * `zones.suburbUpazilas`.
 */
export const DEFAULT_SUBURB_UPAZILAS: readonly string[] = [
  'dhaka/savar',
  'dhaka/keraniganj',
  'dhaka/dhamrai',
  'gazipur/gazipur-sadar',
  'narayanganj/narayanganj-sadar',
  'narayanganj/bandar',
];

/** Districts treated as suburbs when only the district is known. */
export const DEFAULT_SUBURB_DISTRICTS: readonly string[] = ['gazipur', 'narayanganj'];

type ZoneInput = Pick<ParsedAddress, 'area' | 'thana' | 'district'>;

/** Work out the delivery zone of a parse result. */
export function zoneOf(parsed: ZoneInput, options: ZoneOptions = {}): DeliveryZone {
  const suburbUpazilas = new Set(options.suburbUpazilas ?? DEFAULT_SUBURB_UPAZILAS);
  const suburbDistricts = new Set(options.suburbDistricts ?? DEFAULT_SUBURB_DISTRICTS);
  const bareDhakaIsInside = options.bareDhakaIsInside ?? true;
  const { area, thana, district } = parsed;

  if (area?.city === 'dhaka') return 'inside_dhaka';
  if (thana?.type === 'metro-thana' && thana.id.startsWith('dhaka/')) return 'inside_dhaka';
  if (area?.city === 'dhaka-suburb') return 'dhaka_suburb';
  if (thana?.type === 'upazila') {
    if (suburbUpazilas.has(thana.id)) return 'dhaka_suburb';
    return 'outside_dhaka';
  }
  if (district) {
    if (district.id === 'dhaka') return bareDhakaIsInside ? 'inside_dhaka' : 'unknown';
    if (suburbDistricts.has(district.id)) return 'dhaka_suburb';
    return 'outside_dhaka';
  }
  return 'unknown';
}

/** Options accepted by {@link isInsideDhaka}. */
export interface InsideDhakaOptions extends ParseOptions {
  /** Count Dhaka sub-areas (Savar, Keraniganj, Tongi, Narayanganj Sadar ...) as inside. Default `false`. */
  includeSuburbs?: boolean;
}

export function isInsideZone(zone: DeliveryZone, includeSuburbs: boolean): boolean {
  return zone === 'inside_dhaka' || (includeSuburbs && zone === 'dhaka_suburb');
}
