// Phonetic folding for Banglish (Bangla written in Latin letters) and for Bangla script.
//
// Bangla place names are romanized in many ways: Gonj/Ganj, Sh/S, Ch/C, Jh/J, double letters, ee/i, oo/u,
// z/j, v/bh ... Folding maps all of these to one key so that "Narayangonj", "Narayanganj" and "Naraynganj"
// end up close to each other. The fold is deliberately lossy: it is only used to compare names, never shown.

/** Lower-case Latin text without diacritics, apostrophes or punctuation, words separated by one space. */
export function simplifyLatin(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9ঀ-৿]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

const LATIN_RULES: ReadonlyArray<readonly [RegExp, string]> = [
  [/[^a-z]/g, ''],
  [/ph/g, 'f'],
  [/ck/g, 'k'],
  [/ch/g, 'C'], // keep "ch" apart from a hard "c"
  [/c/g, 'k'],
  [/C/g, 'c'],
  [/(?<=[bdgjkptlr])h/g, ''], // aspirated consonants (bh dh gh jh kh th) and Sylhet / Silet
  [/sh/g, 's'],
  [/z/g, 'j'],
  [/v/g, 'b'],
  [/w/g, 'o'],
  [/q/g, 'k'],
  [/x/g, 'ks'],
  [/y/g, 'i'],
  [/ee|ea|ie|ei/g, 'i'],
  [/oo|ou/g, 'u'],
  [/e/g, 'i'],
  [/o/g, 'a'],
  [/(.)\1+/g, '$1'], // doubled letters
  [/h$/g, ''], // trailing h: Jhenaidah / Jhenaida
];

/**
 * Phonetic key for a Banglish or English name.
 *
 * @example foldBanglish('Narayangonj') === foldBanglish('Narayanganj') // true
 */
export function foldBanglish(input: string): string {
  let s = simplifyLatin(input).replace(/[ঀ-৿0-9]/g, '');
  for (const [re, to] of LATIN_RULES) s = s.replace(re, to);
  return s;
}

const BANGLA_RULES: ReadonlyArray<readonly [RegExp, string]> = [
  [/\u200c|\u200d|\u09bc/g, ''], // ZWNJ, ZWJ, nukta (য় ড় ঢ় become য ড ঢ)
  [/[শষ]/g, 'স'],
  [/ণ/g, 'ন'],
  [/ী/g, 'ি'],
  [/ূ/g, 'ু'],
  [/ঈ/g, 'ই'],
  [/ঊ/g, 'উ'],
  [/[ঁং]/g, ''], // chandrabindu and anusvara are often dropped in casual writing
  [/ঙ/g, ''],
  [/ৎ/g, 'ত'],
  [/[ঢ]/g, 'ড'],
  [/[ঝ]/g, 'জ'],
  [/[ঘ]/g, 'গ'],
  [/[ভ]/g, 'ব'],
  [/[ধ]/g, 'দ'],
  [/[থ]/g, 'ত'],
  [/[ঠ]/g, 'ট'],
  [/[ছ]/g, 'চ'],
  [/[খ]/g, 'ক'],
  [/[ফ]/g, 'প'],
  [/[য]/g, 'জ'],
  [/্/g, ''], // hasanta: conjuncts are written in different ways
  [/[^ঀ-৿]/g, ''],
];

/** Phonetic key for a name written in Bangla script. */
export function foldBangla(input: string): string {
  let s = input.normalize('NFC');
  for (const [re, to] of BANGLA_RULES) s = s.replace(re, to);
  return s;
}

/** Phonetic key for any name: Bangla script is folded with {@link foldBangla}, everything else as Banglish. */
export function phoneticKey(input: string): string {
  return /[ঀ-৿]/.test(input) ? foldBangla(input) : foldBanglish(input);
}

/** Exact-match key: simplified text without spaces, so "Cox's Bazar", "Coxs Bazar" and "coxsbazar" are equal. */
export function exactKey(input: string): string {
  return simplifyLatin(input.normalize('NFC'))
    .replace(/\u200c|\u200d/g, '')
    .replace(/ /g, '');
}
