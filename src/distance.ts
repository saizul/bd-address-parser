/**
 * Damerau-Levenshtein distance (optimal string alignment variant): insertions, deletions, substitutions and
 * transpositions of two adjacent characters each cost 1.
 *
 * Works on UTF-16 code units, which is fine for Latin and Bangla (all Bangla letters are in the BMP).
 *
 * @param max Optional upper bound. When the distance is certainly greater than `max`, `max + 1` is returned early.
 */
export function damerauLevenshtein(a: string, b: string, max = Infinity): number {
  if (a === b) return 0;
  const n = a.length;
  const m = b.length;
  if (n === 0) return Math.min(m, max + 1);
  if (m === 0) return Math.min(n, max + 1);
  if (Math.abs(n - m) > max) return max + 1;

  // Three rolling rows: two rows back (for transpositions), previous and current.
  let prev2 = new Array<number>(m + 1).fill(0);
  let prev = new Array<number>(m + 1);
  let cur = new Array<number>(m + 1);
  for (let j = 0; j <= m; j++) prev[j] = j;

  for (let i = 1; i <= n; i++) {
    cur[0] = i;
    let rowMin = cur[0];
    const ai = a.charCodeAt(i - 1);
    for (let j = 1; j <= m; j++) {
      const bj = b.charCodeAt(j - 1);
      const cost = ai === bj ? 0 : 1;
      let v = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + cost);
      if (i > 1 && j > 1 && ai === b.charCodeAt(j - 2) && a.charCodeAt(i - 2) === bj) {
        v = Math.min(v, prev2[j - 2]! + 1);
      }
      cur[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    const t = prev2;
    prev2 = prev;
    prev = cur;
    cur = t;
  }
  const d = prev[m]!;
  return d > max ? max + 1 : d;
}

/**
 * Similarity between 0 and 1 derived from the Damerau-Levenshtein distance and the longer string's length.
 */
export function similarity(a: string, b: string): number {
  const len = Math.max(a.length, b.length);
  if (len === 0) return 1;
  return 1 - damerauLevenshtein(a, b) / len;
}

/**
 * Largest edit distance accepted for a key of the given length. Short names must match exactly, because one
 * edit on a three or four letter word is usually a different word.
 */
export function maxEditsFor(length: number): number {
  if (length <= 4) return 0;
  if (length <= 6) return 1;
  if (length <= 11) return 2;
  return 3;
}
