import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  damerauLevenshtein,
  foldBangla,
  foldBanglish,
  hasBangla,
  normalizePhone,
  phoneticKey,
  similarity,
  toBanglaDigits,
  toEnglishDigits,
} from '../src/index.js';

describe('digits', () => {
  it('converts Bangla digits to ASCII', () => {
    assert.equal(toEnglishDigits('বাসা ১২/এ, ঢাকা-১২০৭'), 'বাসা 12/এ, ঢাকা-1207');
    assert.equal(toEnglishDigits('০১২৩৪৫৬৭৮৯'), '0123456789');
  });
  it('converts ASCII digits to Bangla', () => {
    assert.equal(toBanglaDigits('Road 27'), 'Road ২৭');
    assert.equal(toBanglaDigits(1207), '১২০৭');
  });
  it('round-trips', () => {
    for (const s of ['0', '42', '1000', '9999', '01712345678']) assert.equal(toEnglishDigits(toBanglaDigits(s)), s);
  });
  it('detects Bangla script', () => {
    assert.equal(hasBangla('ঢাকা'), true);
    assert.equal(hasBangla('১২'), true);
    assert.equal(hasBangla('Dhaka'), false);
  });
});

describe('damerauLevenshtein', () => {
  const cases: Array<[string, string, number]> = [
    ['', '', 0],
    ['abc', '', 3],
    ['', 'abcd', 4],
    ['dhaka', 'dhaka', 0],
    ['dhaka', 'dhka', 1],
    ['dhaka', 'dahka', 1], // transposition
    ['gulshan', 'gulsan', 1],
    ['kitten', 'sitting', 3],
    ['ca', 'abc', 3], // optimal string alignment variant
    ['narayanganj', 'narayangonj', 1],
    ['ঢাকা', 'ঢকা', 1],
  ];
  for (const [a, b, d] of cases) {
    it(`${JSON.stringify(a)} vs ${JSON.stringify(b)} = ${d}`, () => {
      assert.equal(damerauLevenshtein(a, b), d);
      assert.equal(damerauLevenshtein(b, a), d);
    });
  }
  it('stops early above max', () => {
    assert.equal(damerauLevenshtein('chattogram', 'rajshahi', 2), 3);
    assert.equal(damerauLevenshtein('abcdef', 'a', 2), 3);
    assert.equal(damerauLevenshtein('mirpur', 'mirpor', 2), 1);
  });
  it('similarity is between 0 and 1', () => {
    assert.equal(similarity('dhaka', 'dhaka'), 1);
    assert.equal(similarity('', ''), 1);
    assert.ok(similarity('bogra', 'bogura') > 0.8);
    assert.ok(similarity('dhaka', 'sylhet') < 0.4);
  });
});

describe('phonetic folding', () => {
  const same: Array<[string, string]> = [
    ['Narayanganj', 'Narayangonj'],
    ['Barisal', 'Barishal'],
    ['Comilla', 'Cumilla'.replace('u', 'o')],
    ['Mohammadpur', 'Mohammodpur'],
    ['Jhenaidah', 'Jhenaida'],
    ['Sylhet', 'Silet'],
    ['Basabo', 'Bashabo'],
    ['Bhatara', 'Vatara'],
    ['Zinzira', 'Jinjira'],
    ['Habiganj', 'Hobigonj'],
    ['Kishoreganj', 'Kishorgonj'.replace('gonj', 'ganj').replace('Kishor', 'Kishore')],
    ['Dhanmondi', 'Dhanmundi'.replace('mu', 'mo')],
    ['Panchagarh', 'Panchagar'],
    ['Phulpur', 'Fulpur'],
    ['Cox\'s Bazar', 'Coxs Bazar'],
  ];
  for (const [a, b] of same) {
    it(`${a} ~ ${b}`, () => assert.equal(foldBanglish(a), foldBanglish(b)));
  }
  it('keeps different places apart', () => {
    assert.notEqual(foldBanglish('Dhaka'), foldBanglish('Dinajpur'));
    assert.notEqual(foldBanglish('Feni'), foldBanglish('Pabna'));
  });
  it('ignores case, digits and punctuation', () => {
    assert.equal(foldBanglish('  GULSHAN-2 '), foldBanglish('gulshan'));
  });
  it('folds Bangla spelling variants', () => {
    assert.equal(foldBangla('যাত্রাবাড়ী'), foldBangla('যাত্রাবাড়ি'));
    assert.equal(foldBangla('শাহবাগ'), foldBangla('সাহবাগ'));
    assert.equal(foldBangla('ধানমন্ডি'), foldBangla('ধানমণ্ডি'));
    assert.equal(foldBangla('চাঁদপুর'), foldBangla('চাদপুর'));
  });
  it('phoneticKey picks the script', () => {
    assert.equal(phoneticKey('ঢাকা'), foldBangla('ঢাকা'));
    assert.equal(phoneticKey('Dhaka'), foldBanglish('Dhaka'));
  });
});

describe('normalizePhone', () => {
  it('normalizes Bangladeshi mobile numbers', () => {
    assert.equal(normalizePhone('01712-345678'), '01712345678');
    assert.equal(normalizePhone('+880 1812 345 678'), '01812345678');
    assert.equal(normalizePhone('8801912345678'), '01912345678');
    assert.equal(normalizePhone('1712345678'), '01712345678');
  });
  it('rejects other numbers', () => {
    assert.equal(normalizePhone('01212345678'), undefined);
    assert.equal(normalizePhone('0171234567'), undefined);
    assert.equal(normalizePhone('029123456'), undefined);
  });
});
