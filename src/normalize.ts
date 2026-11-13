import { toEnglishDigits } from './digits.js';

// Bangla letters, used for word boundaries: \b does not work for Bangla in JavaScript regular expressions.
const BN = '\\u0980-\\u09ff';
const bnWord = (words: string): RegExp => new RegExp(`(?<![${BN}])(?:${words.normalize('NFC')})(?![${BN}])`, 'g');

/**
 * Bangla (and a few Banglish) address labels mapped to the English label words used by the component parser.
 * Order matters: longer phrases first.
 */
const BANGLA_LABELS: ReadonlyArray<readonly [RegExp, string]> = [
  [bnWord('পোস্ট কোড|পোস্টকোড|পোষ্ট কোড'), ' postcode '],
  [bnWord('পোস্ট অফিস|পোষ্ট অফিস|ডাকঘর|ডাক ঘর|পোস্ট|পোষ্ট|পো:|পো\\.'), ' po '],
  [bnWord('উপজেলা|উপজিলা'), ' upazila '],
  [bnWord('থানা'), ' thana '],
  [bnWord('জেলা|জিলা'), ' district '],
  [bnWord('বিভাগ'), ' division '],
  [bnWord('বাসা|বাড়ি|বাড়ী|বাড়ি|বাড়ী|হোল্ডিং|বাসা নং'), ' house '],
  [bnWord('রোড|সড়ক|সড়ক|রাস্তা'), ' road '],
  [bnWord('লেন'), ' lane '],
  [bnWord('ফ্ল্যাট|ফ্লাট'), ' flat '],
  [bnWord('তলা|তলায়|তলায়'), ' floor '],
  [bnWord('ব্লক'), ' block '],
  [bnWord('সেক্টর'), ' sector '],
  [bnWord('গ্রাম'), ' village '],
  [bnWord('নং|নম্বর|নাম্বার'), ' no '],
  [bnWord('এর পাশে|পাশে|সংলগ্ন|বিপরীতে|সামনে|কাছে|নিকট'), ' near '],
];

/** Abbreviations rewritten before tokenizing. Applied to lower-case text. */
const LATIN_ABBREVIATIONS: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bp\s*\.\s*o\s*\.?(?=\s|:|-|,|$)|\bp\/o\b|\bpost\s*office\b|\bdakghor\b|\bdak\s+ghor\b/g, ' po '],
  [/\bp\s*\.\s*s\s*\.?(?=\s|:|-|,|$)|\bp\/s\b|\bpolice\s+station\b/g, ' ps '],
  [/\bpost\s*code\b|\bpostal\s*code\b|\bzip\s*code\b|\bzip\b/g, ' postcode '],
  [/\bpost\b(?!\s*code)/g, ' po '],
  [/\bh\s*#\s*|\bh\s*no\b\.?|\bhouse\s*#\s*/g, ' house '],
  [/\brd\s*#\s*|\br\s*#\s*|\broad\s*#\s*|\brd\b\.?/g, ' road '],
  [/\bdist\b\.?|\bzilla\b|\bzila\b|\bjela\b|\bjila\b/g, ' district '],
  [/\bupozila\b|\bupazilla\b|\bupojela\b|\bupazela\b|\bupz\b\.?/g, ' upazila '],
  [/\bvill\b\.?|\bvil\b\.?|\bgram\b|\bgrm\b\.?/g, ' village '],
  [/\bdiv\b\.?|\bbibhag\b/g, ' division '],
  [/\bsec\b\.?(?=\s*-?\s*\d)/g, ' sector '],
  [/\bapt\b\.?|\bapartment\b/g, ' flat '],
  [/\bfl\b\.?(?=\s*-?\s*\d)/g, ' floor '],
  [/\bopp\b\.?|\bopposite\b|\bbeside\b|\bbehind\b|\bin\s*front\s*of\b|\bnear\s*by\b|\bnearby\b/g, ' near '],
  [/\ber\s+(?:pashe|pase|samne|shamne|kache|kase|opposite)\b|\b(?:pashe|pase|samne|shamne|kache|kase)\b/g, ' near '],
  [/\br\s*\/\s*a\b/g, ' ra '],
];

/**
 * Normalize an address for parsing: NFC, Bangla digits to ASCII, zero-width characters removed, lower case,
 * Latin diacritics stripped, Bangla and abbreviated labels rewritten to plain English label words, and all
 * separators (comma, semicolon, Bangla dari, new line, pipe) turned into ", ".
 */
export function normalizeAddress(input: string): string {
  let s = toEnglishDigits(input.normalize('NFC'))
    .replace(/[\u200b-\u200d\ufeff]/g, '')
    .replace(/ঃ/g, ':')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .normalize('NFC')
    .toLowerCase()
    .replace(/[‐‑‒–—―]/g, '-')
    .replace(/[’‘`´]/g, "'")
    .replace(/[“”]/g, '"');

  for (const [re, to] of BANGLA_LABELS) s = s.replace(re, to);
  for (const [re, to] of LATIN_ABBREVIATIONS) s = s.replace(re, to);

  s = s
    .replace(/[।॥;|\n\r\t]+/g, ', ')
    .replace(/[()[\]{}"]/g, ' ')
    .replace(/\s*,\s*/g, ', ')
    .replace(/(,\s*)+/g, ', ')
    .replace(/[ \u00a0]+/g, ' ')
    .replace(/^[\s,]+|[\s,]+$/g, '');
  return s;
}
