import { getGazetteer, type SearchOptions } from './gazetteer.js';
import type { Area, District, Division, MatchMethod, MetroThana, Place, PlaceKind, Upazila } from './types.js';

export interface SearchResult {
  place: Place;
  score: number;
  method: MatchMethod;
}

/**
 * Search places by name with the same matching the parser uses (exact, alias, phonetic, then edit distance).
 *
 * @example searchPlaces('Jessore', { kinds: ['district'] })[0].place.name // 'Jashore'
 */
export function searchPlaces(query: string, options: SearchOptions & { limit?: number } = {}): SearchResult[] {
  const hits = getGazetteer().lookup(query, options);
  return hits.slice(0, options.limit ?? 10).map(({ place, score, method }) => ({ place, score, method }));
}

/** All 8 divisions. */
export function getDivisions(): Division[] {
  return [...getGazetteer().divisions.values()];
}

/** All 64 districts, or the districts of one division. */
export function getDistricts(divisionId?: string): District[] {
  const all = [...getGazetteer().districts.values()];
  return divisionId ? all.filter((d) => d.divisionId === divisionId) : all;
}

/** All upazilas, or the upazilas of one district. */
export function getUpazilas(districtId?: string): Upazila[] {
  const all = [...getGazetteer().upazilas.values()];
  return districtId ? all.filter((u) => u.districtId === districtId) : all;
}

/** Metropolitan thanas of Dhaka (DMP) and Chattogram (CMP). */
export function getMetroThanas(city?: 'dhaka' | 'chattogram'): MetroThana[] {
  const all = [...getGazetteer().metroThanas.values()];
  return city ? all.filter((t) => t.city === city) : all;
}

/** Known city areas and suburbs. */
export function getAreas(city?: Area['city']): Area[] {
  const all = [...getGazetteer().areas.values()];
  return city ? all.filter((a) => a.city === city) : all;
}

/** Look up one place by kind and id. */
export function getPlace(kind: PlaceKind, id: string): Place | undefined {
  return getGazetteer().get(kind, id);
}
