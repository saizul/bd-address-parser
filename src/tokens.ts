/** A word of the normalized address. */
export interface Token {
  text: string;
  /** Index of the comma-separated segment. */
  segment: number;
  /** Position in the flat token list. */
  index: number;
}

/** Label words written next to place names. */
export const LABELS = {
  district: new Set(['district']),
  thana: new Set(['thana', 'ps', 'upazila', 'metro']),
  division: new Set(['division']),
  'post-office': new Set(['po']),
} as const;

export type LabelKind = keyof typeof LABELS;

const ALL_LABELS = new Set<string>([
  ...LABELS.district,
  ...LABELS.thana,
  ...LABELS.division,
  ...LABELS['post-office'],
  'postcode',
  'village',
  'house',
  'road',
  'lane',
  'flat',
  'floor',
  'block',
  'sector',
  'near',
  'no',
]);

/** Words that never start a place match on their own. */
const NOT_A_PLACE = new Set([
  'bangladesh',
  'bd',
  'city',
  'town',
  'area',
  'bazar',
  'bazaar',
  'market',
  'new',
  'old',
  'east',
  'west',
  'north',
  'south',
  'purba',
  'paschim',
  'uttar',
  'dakshin',
  'model',
  'para',
  'more',
  'mor',
  'gate',
  'the',
  'of',
  'and',
  'er',
  'ra',
  'main',
  'colony',
  'housing',
  'society',
  'tower',
  'building',
  'mosque',
  'masjid',
  'school',
  'college',
  'hospital',
  'office',
  'bank',
  'home',
  'mobile',
  'phone',
  'name',
  'address',
  'cantt',
  'বাংলাদেশ',
]);

export function isLabel(word: string): boolean {
  return ALL_LABELS.has(word);
}

export function labelKind(word: string | undefined): LabelKind | undefined {
  if (word === undefined) return undefined;
  for (const kind of Object.keys(LABELS) as LabelKind[]) if (LABELS[kind].has(word)) return kind;
  return undefined;
}

export function isStopWord(word: string): boolean {
  return NOT_A_PLACE.has(word);
}

/** Split normalized text into segments and words. Hyphens, slashes and dots separate words. */
export function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  text.split(',').forEach((segment, segIndex) => {
    for (const raw of segment.split(/[\s\-/.:#]+/)) {
      const word = raw.replace(/^'+|'+$/g, '');
      if (!word) continue;
      tokens.push({ text: word, segment: segIndex, index: tokens.length });
    }
  });
  return tokens;
}
