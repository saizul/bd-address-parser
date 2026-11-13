import { extractComponents } from './components.js';
import { getGazetteer, type Gazetteer } from './gazetteer.js';
import { normalizeAddress } from './normalize.js';
import { isPostcodeFormat, lookupPostcode } from './postcode.js';
import { isLabel, isStopWord, labelKind, tokenize, type LabelKind, type Token } from './tokens.js';
import type {
  Ambiguity,
  Area,
  AreaRef,
  District,
  Division,
  Match,
  MetroThana,
  ParsedAddress,
  ParseOptions,
  ParseWarning,
  Place,
  PlaceRef,
  PostcodeEntry,
  ThanaRef,
  Upazila,
} from './types.js';
import { zoneOf } from './zones.js';

const MAX_NGRAM = 4;

/** Weight of each level when scoring a reading of the address. */
const WEIGHT = { area: 0.9, thana: 1.0, district: 1.2, division: 0.5, postcode: 0.8 } as const;
/** Readings that score within this margin of the best one are reported as ambiguities. */
const AMBIGUITY_MARGIN = 0.2;

interface GazMatch extends Match {
  generic: boolean;
  segment: number;
  /** Number written right after the match, such as "10" in "mirpur 10". */
  section?: string;
}

type Thana = Upazila | MetroThana;

/** One complete reading of the address: area, thana, district and division that fit together. */
interface Chain {
  area?: Area;
  thana?: Thana;
  district?: District;
  division?: Division;
  fromPostcode?: boolean;
  /** The thana (or area) was read from the postcode, not from the text. */
  thanaFromPostcode?: boolean;
  fromDefault?: boolean;
}

interface Scored {
  chain: Chain;
  score: number;
  support: { area?: GazMatch; thana?: GazMatch; district?: GazMatch; division?: GazMatch };
  conflicts: GazMatch[];
  postcodeAgrees?: boolean;
}

/**
 * Parse a free-form Bangladeshi address written in English, Bangla or Banglish.
 *
 * @example
 * parseAddress('House 12, Road 5, Dhanmondi, Dhaka-1209').thana?.name // 'Dhanmondi'
 * parseAddress('বাসা ১২, মিরপুর ১০, ঢাকা').area?.section // '10'
 */
export function parseAddress(input: string, options: ParseOptions = {}): ParsedAddress {
  const g = getGazetteer();
  const warnings: ParseWarning[] = [];
  const text = typeof input === 'string' ? input : '';
  const maxLength = options.maxLength ?? 500;
  const normalized = normalizeAddress(text.length > maxLength ? text.slice(0, maxLength) : text);
  if (text.length > maxLength) {
    warnings.push({ code: 'input_truncated', message: `Only the first ${maxLength} characters were read.` });
  }

  const empty = (): ParsedAddress => ({
    input: text,
    normalized,
    components: {},
    postcodeEntries: [],
    zone: 'unknown',
    confidence: 0,
    confidenceLevel: 'low',
    ambiguities: [],
    warnings: [...warnings, { code: 'empty_input', message: 'The address is empty.' }],
    matches: [],
  });
  if (!normalized) return empty();

  const { components, rest, phone, labelledPostcode } = extractComponents(normalized, {
    isPlaceName: (t) => g.lookup(t, { kinds: ['area'], disableFuzzy: true }).some((h) => h.score >= 0.97),
    isPlaceWord: (w) => !isStopWord(w) && g.lookup(w, { disableFuzzy: true }).some((h) => h.score >= 0.97 && !h.generic),
  });
  // A landmark ("near Mohammadpur bus stand") often holds the only place name; read it as weak evidence.
  const landmarkSegment = components.landmark ? rest.split(',').length : -1;
  const tokens = tokenize(components.landmark ? `${rest}, ${components.landmark}` : rest);
  const matches = findMatches(g, tokens, options, landmarkSegment);

  // Postcode: a labelled one wins, then a known four-digit code, then an unknown code right after a place name.
  let postcode = labelledPostcode;
  const usedTokens = new Set<number>();
  for (const m of matches) if (m.section !== undefined) usedTokens.add(m.end);
  if (!postcode) {
    const fourDigit = tokens.filter((t) => /^\d{4}$/.test(t.text) && isPostcodeFormat(t.text) && !usedTokens.has(t.index));
    const known = fourDigit.filter((t) => lookupPostcode(t.text).length > 0);
    const pick =
      known[known.length - 1] ?? fourDigit.find((t) => matches.some((m) => m.end === t.index && m.segment === t.segment));
    if (pick) {
      postcode = pick.text;
      usedTokens.add(pick.index);
    }
  } else {
    for (const t of tokens) if (t.text === postcode) usedTokens.add(t.index);
  }
  const postcodeEntries = postcode ? lookupPostcode(postcode) : [];
  if (postcode && postcodeEntries.length === 0) {
    warnings.push({ code: 'postcode_unknown', message: `Postcode ${postcode} is not in the bundled postcode list.` });
  }

  const scored = scoreChains(g, buildChains(g, matches, postcodeEntries, options), matches, postcodeEntries, options);
  const best = scored[0];

  const result: ParsedAddress = {
    input: text,
    normalized,
    components,
    postcodeEntries,
    zone: 'unknown',
    confidence: 0,
    confidenceLevel: 'low',
    ambiguities: [],
    warnings,
    matches: matches.map((m) => ({
      text: m.text,
      kind: m.place.kind,
      id: m.place.id,
      score: round(m.score),
      method: m.method,
    })),
  };
  if (postcode) result.postcode = postcode;
  if (phone) result.phone = phone;

  if (best) {
    applyChain(result, best);
    result.ambiguities = findAmbiguities(best, scored);
    for (const c of best.conflicts) {
      const code = c.place.kind === 'division' ? 'conflicting_division' : 'conflicting_district';
      warnings.push({
        code,
        message: `"${c.text}" looks like ${c.place.kind} ${c.place.name}, which does not fit ${describe(best.chain)}.`,
      });
    }
    if (postcode && postcodeEntries.length && best.postcodeAgrees === false) {
      warnings.push({
        code: 'postcode_mismatch',
        message: `Postcode ${postcode} belongs to ${postcodeEntries.map((e) => g.districts.get(e.districtId)?.name).join(' / ')}, not ${best.chain.district?.name ?? 'the parsed district'}.`,
      });
    }
    for (const m of Object.values(best.support)) {
      if (m?.method === 'fuzzy') {
        warnings.push({ code: 'fuzzy_match', message: `"${m.text}" was read as ${m.place.name} by spelling similarity.` });
      }
    }
  }
  if (!result.district) {
    warnings.push(
      result.thana || result.area
        ? { code: 'district_not_found', message: 'No district could be determined.' }
        : { code: 'no_location_found', message: 'No known area, thana, district or division was found.' },
    );
  }

  const street = leftoverStreet(tokens, best, usedTokens, landmarkSegment);
  if (street && !components.street) components.street = street;

  result.zone = zoneOf(result, options.zones);
  result.confidence = confidenceOf(result, best);
  result.confidenceLevel = result.confidence >= 0.75 ? 'high' : result.confidence >= 0.5 ? 'medium' : 'low';
  return result;
}

/** Every gazetteer hit for every 1 to 4 word phrase inside a segment. */
function findMatches(g: Gazetteer, tokens: Token[], options: ParseOptions, landmarkSegment: number): GazMatch[] {
  const out: GazMatch[] = [];
  const lookupOptions = { minScore: options.minScore ?? 0.72, disableFuzzy: options.disableFuzzy ?? false };
  for (let i = 0; i < tokens.length; i++) {
    for (let n = Math.min(MAX_NGRAM, tokens.length - i); n >= 1; n--) {
      const span = tokens.slice(i, i + n);
      if (span.some((t) => t.segment !== span[0]!.segment)) continue;
      // Labels may sit inside a name ("Green Road", "Bailey Road") but never start one.
      if (isLabel(span[0]!.text)) continue;
      if (span.some((t) => /^\d+$/.test(t.text) || (t !== span[n - 1] && isLabel(t.text)))) continue;
      if (n === 1 && (isStopWord(span[0]!.text) || (span[0]!.text.length < 3 && !/[ঀ-৿]/.test(span[0]!.text)))) {
        continue;
      }
      const phrase = span.map((t) => t.text).join(' ');
      const hits = g.lookup(phrase, lookupOptions);
      if (!hits.length) continue;
      const before = tokens[i - 1];
      const after = tokens[i + n];
      const hint =
        after && after.segment === span[0]!.segment ? labelKind(after.text) : undefined;
      const hintBefore = before && before.segment === span[0]!.segment ? labelKind(before.text) : undefined;
      const section =
        after && after.segment === span[0]!.segment && /^\d{1,3}$/.test(after.text) ? String(Number(after.text)) : undefined;
      for (const h of hits) {
        const m: GazMatch = {
          place: h.place,
          text: phrase,
          start: i,
          end: i + n,
          score: span[0]!.segment === landmarkSegment ? h.score * 0.85 : h.score,
          method: h.method,
          generic: h.generic,
          segment: span[0]!.segment,
        };
        const kindHint = hint ?? hintBefore;
        if (kindHint) m.hint = kindHint;
        if (section !== undefined && (h.place.kind === 'area' || h.place.kind === 'metro-thana')) m.section = section;
        out.push(m);
      }
    }
  }
  return prune(out);
}

/** Drop matches that sit inside a longer, better match, and fuzzy matches that cover an exact one. */
function prune(matches: GazMatch[]): GazMatch[] {
  const len = (m: GazMatch): number => m.end - m.start;
  return matches.filter((m) => {
    for (const o of matches) {
      if (o === m) continue;
      const contains = o.start <= m.start && o.end >= m.end && len(o) > len(m);
      if (contains && o.score >= 0.85 && o.method !== 'fuzzy') return false;
      const inside = m.start <= o.start && m.end >= o.end && len(m) > len(o);
      if (inside && m.method === 'fuzzy' && o.method !== 'fuzzy') return false;
    }
    return true;
  });
}

function districtOf(g: Gazetteer, place: Place): District | undefined {
  switch (place.kind) {
    case 'division':
      return undefined;
    case 'district':
      return place;
    default:
      return g.districts.get(place.districtId);
  }
}

function chainFor(g: Gazetteer, place: Place): Chain {
  const chain: Chain = {};
  if (place.kind === 'area') {
    chain.area = place;
    if (place.thanaId) chain.thana = g.thana(place.thanaId);
  } else if (place.kind === 'upazila' || place.kind === 'metro-thana') chain.thana = place;
  if (place.kind === 'division') chain.division = place;
  const district = districtOf(g, place);
  if (district) {
    chain.district = district;
    chain.division = g.divisions.get(district.divisionId);
  }
  return chain;
}

const chainKey = (c: Chain): string =>
  `${c.area?.id ?? ''}|${c.thana?.id ?? ''}|${c.district?.id ?? ''}|${c.division?.id ?? ''}`;

function buildChains(g: Gazetteer, matches: GazMatch[], postcodes: PostcodeEntry[], options: ParseOptions): Chain[] {
  const chains = new Map<string, Chain>();
  const add = (c: Chain): void => {
    const key = chainKey(c);
    if (!chains.has(key)) chains.set(key, c);
  };
  const thanaMatches = matches.filter((m) => m.place.kind === 'upazila' || m.place.kind === 'metro-thana');
  const areaMatches = matches.filter((m) => m.place.kind === 'area');

  for (const m of matches) {
    const chain = chainFor(g, m.place);
    if (m.place.kind === 'area') {
      // A thana written next to the area overrides the default thana if the area spans it.
      const area = m.place;
      const spans = new Set([area.thanaId, ...(area.otherThanaIds ?? [])]);
      for (const t of thanaMatches) if (spans.has(t.place.id)) add({ ...chain, thana: t.place as Thana });
    }
    if (m.place.kind === 'upazila' || m.place.kind === 'metro-thana') {
      // Attach a matched area that lies in this thana.
      for (const a of areaMatches) {
        const area = a.place as Area;
        if (area.thanaId === m.place.id || area.otherThanaIds?.includes(m.place.id)) add({ ...chain, area });
      }
    }
    add(chain);
  }
  for (const p of postcodes) {
    const upazila = p.upazilaId ? g.upazilas.get(p.upazilaId) : undefined;
    const district = chainFor(g, g.districts.get(p.districtId)!);
    add({ ...district, fromPostcode: true });
    if (upazila) {
      add({ ...chainFor(g, upazila), fromPostcode: true, thanaFromPostcode: true });
      continue;
    }
    // City post offices carry a postal thana name ("Mohammadpur", "Lalbag"); map it to a metro thana or area.
    const hit = g
      .lookup(p.thana, { kinds: ['metro-thana', 'area'], disableFuzzy: true })
      .find((h) => districtOf(g, h.place)?.id === p.districtId);
    if (hit) add({ ...chainFor(g, hit.place), fromPostcode: true, thanaFromPostcode: true });
  }
  if (options.defaultDistrict) {
    const d = g.districts.get(options.defaultDistrict);
    if (d) add({ ...chainFor(g, d), fromDefault: true });
  }
  return [...chains.values()];
}

function scoreChains(
  g: Gazetteer,
  chains: Chain[],
  matches: GazMatch[],
  postcodes: PostcodeEntry[],
  options: ParseOptions,
): Scored[] {
  const scored = chains.map((chain) => scoreChain(g, chain, matches, postcodes, options));
  const useful = scored.filter((s) => s.score > 0);
  return useful.sort((a, b) => b.score - a.score || depth(b.chain) - depth(a.chain));
}

const depth = (c: Chain): number => (c.area ? 1 : 0) + (c.thana ? 1 : 0) + (c.district ? 1 : 0) + (c.division ? 1 : 0);

function hintFactor(m: GazMatch): number {
  if (!m.hint) return 1;
  const kind = m.place.kind;
  const wanted: Record<LabelKind, readonly string[]> = {
    district: ['district'],
    thana: ['upazila', 'metro-thana'],
    division: ['division'],
    'post-office': [],
  };
  if (m.hint === 'post-office') return 0.75;
  if (wanted[m.hint].includes(kind)) return 1.15;
  // "Dhaka district" for a thana reading, or "Bogura thana" for a district reading.
  return kind === 'area' ? 0.9 : 0.6;
}

function scoreChain(
  g: Gazetteer,
  chain: Chain,
  matches: GazMatch[],
  postcodes: PostcodeEntry[],
  options: ParseOptions,
): Scored {
  const used = new Set<GazMatch>();
  const usedSpans: Array<[number, number]> = [];
  const overlaps = (m: GazMatch): boolean => usedSpans.some(([s, e]) => m.start < e && s < m.end);
  const support: Scored['support'] = {};
  let score = 0;

  const pick = (level: keyof Scored['support'], id: string | undefined, kinds: readonly string[]): void => {
    if (!id) return;
    let best: GazMatch | undefined;
    let bestValue = 0;
    for (const m of matches) {
      if (!kinds.includes(m.place.kind) || m.place.id !== id || overlaps(m)) continue;
      if (m.generic && !support.district) continue;
      let value = m.score * hintFactor(m) * (m.generic ? 0.6 : 1);
      if (level === 'area' && m.section !== undefined) value += 0.2;
      if (value > bestValue) {
        bestValue = value;
        best = m;
      }
    }
    if (!best) return;
    support[level] = best;
    used.add(best);
    usedSpans.push([best.start, best.end]);
    score += WEIGHT[level] * bestValue;
    // City areas and metro thanas are what most customers mean when the name is shared with a rural upazila.
    if ((level === 'area' || level === 'thana') && (best.place.kind === 'area' || best.place.kind === 'metro-thana')) {
      score += 0.15;
      // Break ties between same-named city places (Kotwali, Chawkbazar) in favour of Dhaka, the busiest destination.
      if (districtOf(g, best.place)?.id === 'dhaka') score += 0.01;
    }
  };

  pick('district', chain.district?.id, ['district']);
  pick('thana', chain.thana?.id, ['upazila', 'metro-thana']);
  pick('area', chain.area?.id, ['area']);
  pick('division', chain.division?.id, ['division']);

  // Penalize strong place names that contradict this reading.
  const conflicts: GazMatch[] = [];
  for (const m of matches) {
    if (used.has(m) || overlaps(m) || m.score < 0.85) continue;
    if (m.place.kind === 'district' && m.hint !== 'division' && chain.district && m.place.id !== chain.district.id) {
      // The same text may also be read as a place inside this chain (e.g. Sherpur upazila of Bogura).
      if (!matches.some((o) => o !== m && used.has(o) && o.start === m.start && o.end === m.end)) {
        score -= 0.35 * m.score;
        conflicts.push(m);
      }
    } else if (m.place.kind === 'division' && chain.division && m.place.id !== chain.division.id) {
      if (!matches.some((o) => used.has(o) && o.start === m.start && o.end === m.end)) {
        score -= 0.2 * m.score;
        conflicts.push(m);
      }
    }
  }
  // Each distinct text counts once.
  const uniqueConflicts = conflicts.filter(
    (c, i) => conflicts.findIndex((o) => o.start === c.start && o.end === c.end) === i,
  );

  let postcodeAgrees: boolean | undefined;
  if (postcodes.length && chain.district) {
    const sameDistrict = postcodes.filter((p) => p.districtId === chain.district!.id);
    postcodeAgrees = sameDistrict.length > 0;
    if (postcodeAgrees) {
      score += WEIGHT.postcode;
      if (chain.thana && sameDistrict.some((p) => p.upazilaId === chain.thana!.id)) score += 0.2;
    } else score -= 0.2;
  }
  if (options.defaultDistrict && chain.district?.id === options.defaultDistrict) score += 0.3;

  const result: Scored = { chain, score, support, conflicts: uniqueConflicts };
  if (postcodeAgrees !== undefined) result.postcodeAgrees = postcodeAgrees;
  // A reading with no matched evidence at all only survives if it comes from the postcode or the default district.
  if (!Object.keys(support).length && !postcodeAgrees && !(chain.fromDefault && options.defaultDistrict)) {
    result.score = 0;
  }
  return result;
}

function ref(place: Place, match: GazMatch | undefined, fallback: 'inferred' | 'postcode', score: number): PlaceRef {
  const r: PlaceRef = { id: place.id, name: place.name, bn: place.bn, source: match ? 'matched' : fallback, score };
  if (match) {
    r.score = round(match.score);
    r.text = match.text;
    r.method = match.method;
  }
  return r;
}

function applyChain(result: ParsedAddress, best: Scored): void {
  const { chain, support } = best;
  const fallback = chain.fromPostcode && !Object.keys(support).length ? 'postcode' : 'inferred';
  // Inferred values inherit the score of the match they follow from.
  const lowest = Object.values(support).reduce((min, m) => Math.min(min, m?.score ?? 1), 1);
  const inferredScore = round(Object.keys(support).length ? lowest : 0.8);

  if (chain.area) {
    const area: AreaRef = {
      ...ref(chain.area, support.area, chain.thanaFromPostcode ? 'postcode' : fallback, inferredScore),
      city: chain.area.city,
    };
    if (support.area?.section !== undefined) area.section = support.area.section;
    result.area = area;
  }
  if (chain.thana) {
    const thana: ThanaRef = {
      ...ref(chain.thana, support.thana, chain.thanaFromPostcode ? 'postcode' : fallback, inferredScore),
      type: chain.thana.kind === 'metro-thana' ? 'metro-thana' : 'upazila',
    };
    if (support.thana?.section !== undefined && !support.area) thana.section = support.thana.section;
    result.thana = thana;
  }
  if (chain.district) result.district = ref(chain.district, support.district, fallback, inferredScore);
  if (chain.division) result.division = ref(chain.division, support.division, fallback, inferredScore);
  if (chain.fromDefault && !support.district && result.district) result.district.source = 'inferred';
}

function findAmbiguities(best: Scored, scored: Scored[]): Ambiguity[] {
  const close = scored.filter((s) => s !== best && s.score >= best.score - AMBIGUITY_MARGIN && s.score > 0);
  const out: Ambiguity[] = [];
  const levels = ['district', 'thana', 'area'] as const;
  for (const level of levels) {
    const chosen = best.chain[level];
    const rivals = close.filter((s) => {
      const other = s.chain[level];
      if (!other || other.id === chosen?.id) return false;
      // Only rivals that read the same text differently.
      const anchor = best.support[level] ?? best.support.thana ?? best.support.area ?? best.support.district;
      const rivalAnchor = s.support[level] ?? s.support.thana ?? s.support.area ?? s.support.district;
      return !!anchor && !!rivalAnchor && anchor.start === rivalAnchor.start && anchor.end === rivalAnchor.end;
    });
    if (!rivals.length || !chosen) continue;
    // Report each kind of disagreement once, at the highest level where readings differ.
    if (out.length && level !== 'district') break;
    const anchor = best.support[level] ?? best.support.thana ?? best.support.area ?? best.support.district;
    const candidates: Ambiguity['candidates'] = [];
    const seen = new Set<string>();
    for (const s of [best, ...rivals]) {
      const p = s.chain[level];
      if (!p || seen.has(p.id)) continue;
      seen.add(p.id);
      candidates.push({ id: p.id, name: p.name, districtId: s.chain.district?.id ?? '', score: round(s.score) });
    }
    if (candidates.length > 1) {
      out.push({ field: level, text: anchor?.text ?? '', chosen: chosen.id, candidates });
      break;
    }
  }
  return out;
}

/** Text that is neither a component nor a place: building names, road names without a label, and so on. */
function leftoverStreet(
  tokens: Token[],
  best: Scored | undefined,
  used: Set<number>,
  landmarkSegment: number,
): string | undefined {
  const covered = new Set<number>(used);
  if (best) {
    for (const m of Object.values(best.support)) {
      if (!m) continue;
      for (let i = m.start; i < m.end; i++) covered.add(i);
      if (m.section !== undefined) covered.add(m.end);
    }
  }
  const segments = new Map<number, string[]>();
  const labelled = new Set(tokens.filter((t) => isLabel(t.text)).map((t) => t.segment));
  labelled.add(landmarkSegment);
  let firstPlaceSegment = Infinity;
  for (const t of tokens) {
    if (covered.has(t.index) && t.segment < firstPlaceSegment) firstPlaceSegment = t.segment;
  }
  for (const t of tokens) {
    if (t.segment > firstPlaceSegment) break;
    if (labelled.has(t.segment)) continue;
    if (covered.has(t.index) || isLabel(t.text) || isStopWord(t.text)) {
      if (t.segment === firstPlaceSegment && covered.has(t.index)) break;
      continue;
    }
    const list = segments.get(t.segment) ?? [];
    list.push(t.text);
    segments.set(t.segment, list);
  }
  const parts = [...segments.values()].map((w) => w.join(' ')).filter((p) => /[a-zঀ-৿]/.test(p));
  return parts.length ? parts.join(', ') : undefined;
}

function confidenceOf(r: ParsedAddress, best: Scored | undefined): number {
  const streetFound = ['house', 'road', 'flat', 'village', 'street', 'block', 'sector', 'lane'].some(
    (k) => r.components[k as keyof typeof r.components] !== undefined,
  );
  if (!best) return round(streetFound ? 0.12 : 0.05);
  let c = 0.06;
  const s = best.support;
  if (s.district) c += 0.4 * s.district.score;
  else if (r.district?.source === 'inferred' && (s.thana || s.area)) c += 0.3 * (s.thana ?? s.area)!.score;
  else if (r.district?.source === 'postcode') c += 0.25;
  else if (r.district) c += 0.1;
  if (s.thana || s.area) c += 0.25 * Math.max(s.thana?.score ?? 0, s.area?.score ?? 0);
  if (s.division && s.district) c += 0.05;
  if (best.postcodeAgrees) c += 0.12;
  if (streetFound) c += 0.12;
  c -= Math.min(0.3, 0.15 * r.ambiguities.length);
  c -= 0.15 * best.conflicts.length;
  if (best.postcodeAgrees === false) c -= 0.1;
  return round(Math.max(0, Math.min(1, c)));
}

function describe(c: Chain): string {
  return [c.thana?.name, c.district?.name].filter(Boolean).join(', ') || 'the rest of the address';
}

const round = (n: number): number => Math.round(n * 100) / 100;
