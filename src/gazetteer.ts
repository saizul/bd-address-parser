import { DISTRICTS, DIVISIONS, UPAZILAS } from './data/admin.generated.js';
import { DISTRICT_ALIASES, DIVISION_ALIASES, UPAZILA_ALIASES } from './data/aliases.js';
import { CHATTOGRAM_AREAS, CHATTOGRAM_THANAS, DHAKA_AREAS, DHAKA_THANAS, SUBURB_AREAS } from './data/cities.js';
import { damerauLevenshtein, maxEditsFor } from './distance.js';
import { exactKey, phoneticKey } from './phonetic.js';
import type { Area, District, Division, MatchMethod, MetroThana, Place, PlaceKind, Upazila } from './types.js';

/** One name of a place in the search index. */
interface IndexEntry {
  place: Place;
  /** True for the official English or Bangla name, false for an alias. */
  official: boolean;
  /** Generic names such as "Sadar" only count when the district is also known. */
  generic: boolean;
  phonetic: string;
  /** Exact key, used for edit distance on the spelling itself. */
  raw: string;
}

/** A place found for a piece of text. */
export interface Hit {
  place: Place;
  score: number;
  method: MatchMethod;
  generic: boolean;
}

export interface SearchOptions {
  /** Only return these kinds. */
  kinds?: readonly PlaceKind[];
  /** Minimum score, default 0.72. */
  minScore?: number;
  /** Skip edit-distance matching. */
  disableFuzzy?: boolean;
}

const SCORE = { exact: 1, alias: 0.97, phonetic: 0.9 } as const;
const FUZZY_BASE = 0.88;
const FUZZY_STEP = 0.07;

export class Gazetteer {
  readonly divisions = new Map<string, Division>();
  readonly districts = new Map<string, District>();
  readonly upazilas = new Map<string, Upazila>();
  readonly metroThanas = new Map<string, MetroThana>();
  readonly areas = new Map<string, Area>();

  private readonly exact = new Map<string, IndexEntry[]>();
  private readonly phonetic = new Map<string, IndexEntry[]>();
  private readonly fuzzy: IndexEntry[] = [];

  constructor() {
    for (const [id, name, bn, code] of DIVISIONS) {
      this.divisions.set(id, { kind: 'division', id, name, bn, code, aliases: DIVISION_ALIASES[id] ?? [] });
    }
    for (const [id, divisionId, name, bn, code] of DISTRICTS) {
      this.districts.set(id, { kind: 'district', id, name, bn, code, divisionId, aliases: DISTRICT_ALIASES[id] ?? [] });
    }
    for (const [id, districtId, name, bn, code] of UPAZILAS) {
      const aliases = [...(UPAZILA_ALIASES[id] ?? [])];
      // "Bogura Sadar" is also written "Bogra Sadar"; add the district aliases in front of "Sadar".
      if (/ sadar$/i.test(name)) {
        const district = this.districts.get(districtId)!;
        for (const a of [district.name, ...district.aliases]) aliases.push(`${a} Sadar`);
      }
      this.upazilas.set(id, { kind: 'upazila', id, name, bn, code, districtId, aliases });
    }
    for (const [slug, name, bn, aliases] of DHAKA_THANAS) {
      const id = `dhaka/${slug}`;
      this.metroThanas.set(id, { kind: 'metro-thana', id, name, bn, city: 'dhaka', districtId: 'dhaka', aliases });
    }
    for (const [slug, name, bn, aliases] of CHATTOGRAM_THANAS) {
      const id = `chattogram/${slug}`;
      this.metroThanas.set(id, {
        kind: 'metro-thana',
        id,
        name,
        bn,
        city: 'chattogram',
        districtId: 'chattogram',
        aliases,
      });
    }
    const addCityAreas = (city: 'dhaka' | 'chattogram', rows: typeof DHAKA_AREAS): void => {
      for (const [slug, name, bn, thana, aliases, others] of rows) {
        const id = `${city}/${slug}`;
        const area: Area = { kind: 'area', id, name, bn, city, districtId: city, thanaId: `${city}/${thana}`, aliases };
        if (others?.length) area.otherThanaIds = others.map((t) => `${city}/${t}`);
        this.areas.set(id, area);
      }
    };
    addCityAreas('dhaka', DHAKA_AREAS);
    addCityAreas('chattogram', CHATTOGRAM_AREAS);
    for (const [slug, name, bn, upazilaId, districtId, aliases] of SUBURB_AREAS) {
      const id = `dhaka-suburb/${slug}`;
      this.areas.set(id, { kind: 'area', id, name, bn, city: 'dhaka-suburb', districtId, thanaId: upazilaId, aliases });
    }

    for (const map of [this.divisions, this.districts, this.upazilas, this.metroThanas, this.areas]) {
      for (const place of map.values()) this.indexPlace(place);
    }
    for (const u of this.upazilas.values()) {
      if (/ sadar$/i.test(u.name) || u.name === 'Adarsha Sadar') this.add(u, 'Sadar', false, true);
    }
  }

  private indexPlace(place: Place): void {
    this.add(place, place.name, true, false);
    this.add(place, place.bn, true, false);
    for (const alias of place.aliases) this.add(place, alias, false, false);
  }

  private add(place: Place, name: string, official: boolean, generic: boolean): void {
    const ek = exactKey(name);
    if (!ek) return;
    const entry: IndexEntry = { place, official, generic, phonetic: phoneticKey(name), raw: ek };
    push(this.exact, ek, entry);
    if (entry.phonetic) {
      push(this.phonetic, entry.phonetic, entry);
      if (!generic && (entry.phonetic.length >= 4 || ek.length >= 5)) this.fuzzy.push(entry);
    }
  }

  /** Look up a place by id (`dhaka`, `gazipur/kaliganj`, `dhaka/mirpur-model` ...) and kind. */
  get(kind: PlaceKind, id: string): Place | undefined {
    switch (kind) {
      case 'division':
        return this.divisions.get(id);
      case 'district':
        return this.districts.get(id);
      case 'upazila':
        return this.upazilas.get(id);
      case 'metro-thana':
        return this.metroThanas.get(id);
      case 'area':
        return this.areas.get(id);
    }
  }

  /** Find a thana by id, either an upazila or a metro thana. */
  thana(id: string): Upazila | MetroThana | undefined {
    return this.upazilas.get(id) ?? this.metroThanas.get(id);
  }

  /**
   * All places matching a piece of text, best first. Exact and alias matches win over phonetic matches, which
   * win over edit-distance matches. Only the best score per place is returned.
   */
  lookup(text: string, options: SearchOptions = {}): Hit[] {
    const minScore = options.minScore ?? 0.72;
    const kinds = options.kinds ? new Set(options.kinds) : undefined;
    const best = new Map<string, Hit>();
    const offer = (entry: IndexEntry, score: number, method: MatchMethod): void => {
      if (kinds && !kinds.has(entry.place.kind)) return;
      if (score < minScore) return;
      const key = `${entry.place.kind}:${entry.place.id}`;
      const prev = best.get(key);
      if (!prev || prev.score < score || (prev.score === score && prev.generic && !entry.generic)) {
        best.set(key, { place: entry.place, score, method, generic: entry.generic });
      }
    };

    const ek = exactKey(text);
    if (!ek) return [];
    for (const e of this.exact.get(ek) ?? []) {
      offer(e, e.official ? SCORE.exact : SCORE.alias, e.official ? 'exact' : 'alias');
    }
    const pk = phoneticKey(text);
    if (pk) {
      for (const e of this.phonetic.get(pk) ?? []) offer(e, SCORE.phonetic, 'phonetic');
    }
    // Bangla case endings: ঢাকার (of Dhaka), মিরপুরে (in Mirpur), খুলনাতে.
    if (/[ঀ-৿]/.test(text) && best.size === 0) {
      const stem = text.replace(/(?:ের|তে|য়|র|এ|ে)$/u, '');
      if (stem !== text && stem.length >= 2) {
        for (const e of this.exact.get(exactKey(stem)) ?? []) offer(e, 0.95, e.official ? 'exact' : 'alias');
        for (const e of this.phonetic.get(phoneticKey(stem)) ?? []) offer(e, 0.88, 'phonetic');
      }
    }
    if (!options.disableFuzzy && best.size === 0 && (pk.length >= 5 || ek.length >= 5)) {
      // Compare both the phonetic keys and the plain spellings; take the closer one.
      const pkMax = maxEditsFor(pk.length);
      const ekMax = maxEditsFor(ek.length);
      for (const e of this.fuzzy) {
        let d = Infinity;
        const pMax = Math.min(pkMax, maxEditsFor(e.phonetic.length));
        if (pMax > 0 && Math.abs(e.phonetic.length - pk.length) <= pMax) {
          const v = damerauLevenshtein(pk, e.phonetic, pMax);
          if (v <= pMax) d = v;
        }
        const rMax = Math.min(ekMax, maxEditsFor(e.raw.length));
        if (d > 1 && rMax > 0 && Math.abs(e.raw.length - ek.length) <= rMax) {
          const v = damerauLevenshtein(ek, e.raw, rMax);
          if (v <= rMax && v < d) d = v;
        }
        if (d !== Infinity) offer(e, FUZZY_BASE - FUZZY_STEP * d, 'fuzzy');
      }
    }
    return [...best.values()].sort(compareHits);
  }
}

function compareHits(a: Hit, b: Hit): number {
  return b.score - a.score || KIND_ORDER[a.place.kind] - KIND_ORDER[b.place.kind] || a.place.id.localeCompare(b.place.id);
}

const KIND_ORDER: Record<PlaceKind, number> = { area: 0, 'metro-thana': 1, upazila: 2, district: 3, division: 4 };

function push<K, V>(map: Map<K, V[]>, key: K, value: V): void {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

let shared: Gazetteer | undefined;

/** The shared gazetteer, built on first use. */
export function getGazetteer(): Gazetteer {
  shared ??= new Gazetteer();
  return shared;
}
