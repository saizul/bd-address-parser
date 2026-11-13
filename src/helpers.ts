import { parseAddress } from './parser.js';
import type { DeliveryZone, ParsedAddress, ParseOptions } from './types.js';
import { isInsideZone, zoneOf, type InsideDhakaOptions } from './zones.js';

const toParsed = (input: string | ParsedAddress, options?: ParseOptions): ParsedAddress =>
  typeof input === 'string' ? parseAddress(input, options) : input;

/**
 * Delivery zone of an address for courier pricing: `inside_dhaka`, `dhaka_suburb`, `outside_dhaka` or `unknown`.
 * Accepts a raw address or a result of {@link parseAddress}.
 */
export function getDeliveryZone(input: string | ParsedAddress, options: ParseOptions = {}): DeliveryZone {
  const parsed = toParsed(input, options);
  return options.zones ? zoneOf(parsed, options.zones) : parsed.zone;
}

/**
 * True when the address is inside Dhaka city (a DMP thana or a known Dhaka city area, or a bare "Dhaka").
 * Set `includeSuburbs` to also accept Savar, Keraniganj, Tongi, Narayanganj Sadar and similar sub-areas.
 *
 * Returns `false` for unknown addresses; check `getDeliveryZone()` if you need to tell "outside" from "unknown".
 */
export function isInsideDhaka(input: string | ParsedAddress, options: InsideDhakaOptions = {}): boolean {
  return isInsideZone(getDeliveryZone(input, options), options.includeSuburbs ?? false);
}
