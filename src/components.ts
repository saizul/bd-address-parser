import type { AddressComponents } from './types.js';

/** Label words that end a free-text value such as a village or post office name. */
const STOP_LABELS = /\s(?:po|ps|thana|upazila|district|division|village|house|road|near|postcode|sector|block|flat|floor)(?=\s|$|:)/;
const L = 'a-z\\u0980-\\u09ff';

export interface ComponentResult {
  components: AddressComponents;
  /** Normalized text with the consumed parts replaced by segment breaks. */
  rest: string;
  phone?: string;
  /** Postcode written with an explicit label ("post code 1207"). */
  labelledPostcode?: string;
}

export interface ComponentOptions {
  /** Returns true when a "<name> road" phrase is itself a known place (for example Green Road), so it is kept. */
  isPlaceName?: (text: string) => boolean;
  /**
   * Returns true when a word is a place name. Leading place words are split off a road name, so
   * "mohammadpur tajmahal road" keeps "mohammadpur" for the gazetteer and records "tajmahal road".
   */
  isPlaceWord?: (word: string) => boolean;
}

const tidy = (s: string): string =>
  s
    .replace(/^[\s:#.,-]+|[\s:#.,-]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/** Split a free-text value at the next label word: [value, remainder starting with the label]. */
function splitAtLabel(value: string): [string, string] {
  const padded = ` ${value}`;
  const m = STOP_LABELS.exec(padded);
  if (!m) return [tidy(value), ''];
  return [tidy(padded.slice(0, m.index)), padded.slice(m.index).trim()];
}

const untilLabel = (value: string): string => splitAtLabel(value)[0];

/** Normalize a Bangladeshi mobile number to the 11-digit local form, or return undefined. */
export function normalizePhone(input: string): string | undefined {
  const digits = input.replace(/[^\d+]/g, '').replace(/^\+/, '');
  const m = /^(?:880|88)?(0?1[3-9]\d{8})$/.exec(digits);
  if (!m) return undefined;
  const local = m[1]!;
  return local.startsWith('0') ? local : `0${local}`;
}

/**
 * Extract street-level components (house, road, flat ...) from a normalized address.
 * Consumed text is replaced with ", " so later stages do not read house numbers as postcodes or road names as areas.
 */
export function extractComponents(normalized: string, options: ComponentOptions = {}): ComponentResult {
  const components: AddressComponents = {};
  let s = ` ${normalized} `;
  let phone: string | undefined;
  let labelledPostcode: string | undefined;

  const take = (re: RegExp, fn: (m: RegExpExecArray) => boolean | string | void): void => {
    // The callback returns false to keep the matched text, a string to replace it, or nothing to consume it.
    const global = new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`);
    let out = '';
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = global.exec(s)) !== null) {
      const r = fn(m);
      out += s.slice(last, m.index) + (r === false ? m[0] : typeof r === 'string' ? r : ' , ');
      last = m.index + m[0].length;
      if (m[0].length === 0) global.lastIndex++;
    }
    s = out + s.slice(last);
  };
  const setOnce = (key: keyof AddressComponents, value: string | undefined): void => {
    const v = value === undefined ? '' : tidy(value);
    if (v && components[key] === undefined) components[key] = v;
  };

  // Phone numbers first, so their digits are never read as house numbers or postcodes.
  take(/(?<![\d])(?:\+?\s*88[\s-]*)?0?1[3-9](?:[\s-]*\d){8}(?![\d])/, (m) => {
    const p = normalizePhone(m[0]);
    if (!p) return false;
    phone ??= p;
  });

  take(/\bpostcode\s*(?:no)?\s*[:#.-]?\s*(\d{4})(?!\d)/, (m) => {
    labelledPostcode ??= m[1];
  });

  // House: "house 12", "house no 12/a", "h# 7", "basa 4", "holding 33/1", "12 no house" (Bangla word order).
  take(
    /\b(?:house|holding|plot|basa|basha|bari)\s*(?:no\b\.?|number)?\s*[:#.-]?\s*(\d+(?:\s?[a-z](?![a-z]))?(?:\s*[/-]\s*[a-z0-9]{1,4})?)(?![\d])/,
    (m) => setOnce('house', m[1]!.replace(/\s+/g, '')),
  );
  take(/(?<![\d])(\d+[a-z]?(?:\/[a-z0-9]{1,4})?)\s*no\b\.?\s*house\b/, (m) => setOnce('house', m[1]));
  take(/\bhouse\s*(?:name)?\s*:\s*([^,]+)/, (m) => setOnce('house', untilLabel(m[1]!)));

  // Numbered road or lane: "road 7", "rd# 12/a", "lane 3", "7 no road".
  take(/\b(road|lane|street|st|sarak|sorok)\s*(?:no\b\.?)?\s*[:#.-]?\s*(\d+[a-z]?(?:\/[a-z0-9]{1,4})?)(?![\d])/, (m) =>
    setOnce(m[1] === 'lane' ? 'lane' : 'road', m[2]),
  );
  take(/(?<![\d])(\d+[a-z]?)\s*no\b\.?\s*(road|lane)\b/, (m) => setOnce(m[2] === 'lane' ? 'lane' : 'road', m[1]));

  // Flat / unit, floor, block, sector.
  take(/\b(?:flat|unit|suite)\s*(?:no\b\.?)?\s*[:#.-]?\s*([a-z0-9\u0980-\u09ff]{1,6}(?:\s*[-/]\s*[a-z0-9]{1,3})?)(?![a-z0-9\u0980-\u09ff])/, (m) =>
    setOnce('flat', m[1]!.replace(/\s+/g, '')),
  );
  take(/(?<![\d])(\d{1,2})\s*(?:st|nd|rd|th|[ঀ-৿]{1,4})?\s*floor\b/, (m) => setOnce('floor', m[1]));
  take(/\b(?:floor|level)\s*[:#.-]?\s*(\d{1,2})(?![\d])/, (m) => setOnce('floor', m[1]));
  take(/\b(ground|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|top)\s+floor\b/, (m) =>
    setOnce('floor', m[1]),
  );
  take(/\bblock\s*(?:no\b\.?)?\s*[:#.-]?\s*([a-z0-9\u0980-\u09ff]{1,3})(?![a-z0-9\u0980-\u09ff])/, (m) =>
    setOnce('block', m[1]),
  );
  take(/(?<![a-z])([a-z])\s*block\b/, (m) => setOnce('block', m[1]));
  take(/\bsector\s*(?:no\b\.?)?\s*[:#.-]?\s*(\d{1,2})(?![\d])/, (m) => setOnce('sector', m[1]));

  // Named roads: "satmasjid road", "gulshan avenue", "kazi nazrul islam avenue". Known places ending in "road"
  // (Green Road, Elephant Road ...) are kept for the gazetteer.
  take(
    new RegExp(
      `(?<![${L}0-9'.-])((?:[${L}][${L}0-9'.-]*\\s){0,3}[${L}][${L}0-9'.-]*)\\s+(road|avenue|sarani|sharani|highway|lane|street)(?![${L}0-9])`,
    ),
    (m) => {
      const words = m[1]!.split(' ');
      if (words.every((w) => /^(?:no|the|main|new|old|link)$/.test(w))) return false;
      if (options.isPlaceName?.(`${m[1]} ${m[2]}`)) return false;
      const kept: string[] = [];
      while (words.length > 1 && options.isPlaceWord?.(words[0]!)) kept.push(words.shift()!);
      setOnce(m[2] === 'lane' ? 'lane' : 'road', `${words.join(' ')} ${m[2]}`);
      if (kept.length) return ` ${kept.join(' ')} , `;
    },
  );

  // Village and landmark are free text up to the end of the segment or the next label. Labels that follow in the
  // same segment ("village kalia po ...") are kept for the later stages.
  const tail: string[] = [];
  take(/\bvillage\s*[:#.-]?\s*([^,]+)/, (m) => {
    const [head, rest] = splitAtLabel(m[1]!);
    if (!head) return false;
    setOnce('village', head);
    if (rest) tail.push(rest);
  });
  take(/\bnear\s*[:#.-]?\s*([^,]+)/, (m) => {
    const [head, rest] = splitAtLabel(m[1]!);
    if (!head) return false;
    setOnce('landmark', head);
    if (rest) tail.push(rest);
  });
  // Bangla word order: "<landmark> near" at the end of a segment ("মসজিদের পাশে").
  take(/(?<=,|^)\s*([^,]+?)\s+near\s*(?=,|$)/, (m) => setOnce('landmark', m[1]));

  if (tail.length) s += ` , ${tail.join(' , ')}`;

  // Post office: keep the name in the text (it is weak evidence for the thana), only record it.
  const po = /\bpo\s*[:#.-]?\s*([^,]+)/.exec(s);
  if (po) setOnce('postOffice', untilLabel(po[1]!));

  const rest = s
    .replace(/\bno\b\.?/g, ' ')
    .replace(/\s*,\s*/g, ', ')
    .replace(/(,\s*)+/g, ', ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s,]+|[\s,]+$/g, '');

  return { components, rest, ...(phone ? { phone } : {}), ...(labelledPostcode ? { labelledPostcode } : {}) };
}
