import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { addressKey, canonicalNumber, compareAddresses, parseAddress } from '../src/index.js';

describe('canonicalNumber', () => {
  it('folds separators, case, leading zeros and Bangla digits and letters', () => {
    for (const v of ['23/A', '23-a', '23 A', '০২৩/এ', '023a', '২৩এ']) assert.equal(canonicalNumber(v), '23a', v);
    assert.equal(canonicalNumber('সি'), 'c');
    assert.equal(canonicalNumber('0'), '0');
  });

  it('keeps named values comparable', () => {
    assert.equal(canonicalNumber('Green Road'), canonicalNumber('green  road'));
    assert.notEqual(canonicalNumber('Green Road'), '');
  });
});

describe('compareAddresses', () => {
  const same: Array<[string, string]> = [
    ['House 12, Road 5, Dhanmondi, Dhaka-1209', 'H#12, Rd#5, Dhanmondi R/A, Dhaka'],
    ['House 23A, Road-7, Mirpur-10 Dhaka 1216', 'বাসা ২৩/এ, রোড ৭, মিরপুর ১০, ঢাকা'],
    ['H 23/A, Rd 7, Mirpur 10, Dhaka', 'House 23A, Road 7, Mirpur 10, Dhaka'],
    ['Flat 4B, House 23/A, Road 7, Sector 4, Uttara, Dhaka 1230', 'House 23-a, Flat 4-B, Road 07, Sector 4, Uttara 1230'],
  ];
  for (const [a, b] of same) {
    it(`same: ${a} <> ${b}`, () => {
      const r = compareAddresses(a, b);
      assert.equal(r.verdict, 'same', JSON.stringify(r.fields));
      assert.ok(r.score >= 0.85);
      assert.deepEqual(r.conflicts, []);
    });
  }

  it('is symmetric', () => {
    for (const [a, b] of same) {
      const x = compareAddresses(a, b);
      const y = compareAddresses(b, a);
      assert.equal(x.verdict, y.verdict);
      assert.equal(x.score, y.score);
    }
  });

  it('reports a different house number in the same area as different', () => {
    const r = compareAddresses('House 23A, Road 7, Mirpur 10, Dhaka', 'House 25, Road 7, Mirpur 10, Dhaka');
    assert.equal(r.verdict, 'different');
    assert.deepEqual(r.conflicts, ['house']);
    assert.equal(r.fields.find((f) => f.field === 'road')?.outcome, 'match');
  });

  it('reports a different flat in the same building as different', () => {
    const r = compareAddresses('Flat 4B, House 23/A, Road 7, Uttara, Dhaka', 'Flat 4C, House 23/A, Road 7, Uttara, Dhaka');
    assert.equal(r.verdict, 'different');
    assert.deepEqual(r.conflicts, ['flat']);
  });

  it('reports the same name in different districts as different', () => {
    const r = compareAddresses('Mirpur, Dhaka', 'Mirpur, Kushtia');
    assert.equal(r.verdict, 'different');
    assert.equal(r.conflicts[0], 'district');
  });

  it('gives same_area when only one side has street details', () => {
    const r = compareAddresses('Mirpur 10, Dhaka', 'House 5, Road 3, Mirpur 10, Dhaka');
    assert.equal(r.verdict, 'same_area');
    assert.equal(r.fields.find((f) => f.field === 'house')?.outcome, 'missing');
  });

  it('treats a missing section number as a partial match', () => {
    const r = compareAddresses('House 5, Road 3, Mirpur, Dhaka', 'House 5, Road 3, Mirpur 10, Dhaka');
    assert.equal(r.fields.find((f) => f.field === 'area')?.outcome, 'partial');
    assert.equal(r.verdict, 'same');
  });

  it('treats different sections as a mismatch', () => {
    const r = compareAddresses('Mirpur 10, Dhaka', 'Mirpur 2, Dhaka');
    assert.equal(r.fields.find((f) => f.field === 'area')?.outcome, 'mismatch');
    assert.ok(r.conflicts.includes('area'));
    assert.notEqual(r.verdict, 'same');
  });

  it('compares villages with spelling tolerance', () => {
    const base = 'Vill: Charpara, PO: Mallikbari, PS: Bhaluka, Dist: Mymensingh';
    const close = compareAddresses(base, 'Vill: Charpaara, PS: Bhaluka, Dist: Mymensingh');
    assert.equal(close.fields.find((f) => f.field === 'village')?.outcome, 'match');
    assert.notEqual(close.verdict, 'different');
    const other = compareAddresses(base, 'Vill: Kalia, PS: Bhaluka, Dist: Mymensingh');
    assert.equal(other.verdict, 'different');
    assert.deepEqual(other.conflicts, ['village']);
  });

  it('is unknown when nothing is recognised', () => {
    assert.equal(compareAddresses('hello', 'world').verdict, 'unknown');
    assert.equal(compareAddresses('', '').verdict, 'unknown');
    assert.equal(compareAddresses('', 'Dhanmondi, Dhaka').verdict, 'unknown');
  });

  it('does not count inferred thanas as a hard conflict', () => {
    // Both thanas are inferred from the area; neither was written.
    const r = compareAddresses('House 5, Road 3, Mirpur 10, Dhaka', 'House 5, Road 3, Mirpur 10, Pallabi, Dhaka');
    assert.notEqual(r.verdict, 'different');
  });

  it('ignores the phone unless asked', () => {
    const a = 'House 12, Road 5, Dhanmondi, Dhaka, 01712345678';
    const b = 'House 12, Road 5, Dhanmondi, Dhaka, 01812345678';
    assert.equal(compareAddresses(a, b).verdict, 'same');
    const r = compareAddresses(a, b, { comparePhone: true });
    assert.ok(r.conflicts.includes('phone'));
    assert.ok(r.score < 1);
    assert.equal(compareAddresses(a, a, { comparePhone: true }).fields.find((f) => f.field === 'phone')?.outcome, 'match');
  });

  it('accepts parse results and returns them', () => {
    const pa = parseAddress('House 12, Road 5, Dhanmondi, Dhaka');
    const r = compareAddresses(pa, 'H#12, Rd#5, Dhanmondi');
    assert.equal(r.a, pa);
    assert.equal(r.b.thana?.id, 'dhaka/dhanmondi');
    assert.equal(r.verdict, 'same');
  });

  it('passes parse options through', () => {
    const r = compareAddresses('Kaliganj', 'Kaliganj, Satkhira', { defaultDistrict: 'satkhira' });
    assert.equal(r.a.district?.id, 'satkhira');
    assert.equal(r.fields.find((f) => f.field === 'district')?.outcome, 'match');
  });

  it('never throws on odd input', () => {
    const odd: unknown[] = [null, undefined, 42, '\u0000​', ',,,;;;', 'x'.repeat(5000), '১২৩৪৫৬৭৮৯০'];
    for (const v of odd) {
      const r = compareAddresses(v as string, 'Dhanmondi, Dhaka');
      assert.ok(r.score >= 0 && r.score <= 1);
    }
  });
});

describe('addressKey', () => {
  it('gives the same key for spellings of one address', () => {
    const keys = new Set(
      ['House 23A, Road-7, Mirpur-10 Dhaka 1216', 'বাসা ২৩/এ, রোড ৭, মিরপুর ১০, ঢাকা', 'H 23/A, Rd 7, Mirpur 10, Dhaka'].map((a) => addressKey(a)),
    );
    assert.equal(keys.size, 1);
    assert.equal([...keys][0], 'dhaka|dhaka/mirpur-model|dhaka/mirpur:10|h23a|r7');
  });

  it('stops at the requested level', () => {
    const a = 'Flat 4B, House 23/A, Road 7, Sector 4, Uttara, Dhaka 1230';
    assert.equal(addressKey(a, { level: 'district' }), 'dhaka');
    assert.equal(addressKey(a, { level: 'thana' }), 'dhaka|dhaka/uttara-west');
    assert.equal(addressKey(a, { level: 'area' }), 'dhaka|dhaka/uttara-west|dhaka/uttara');
    assert.equal(addressKey(a), 'dhaka|dhaka/uttara-west|dhaka/uttara|h23a|r7|f4b|s4');
  });

  it('includes the village for rural addresses', () => {
    assert.equal(
      addressKey('Vill: Charpara, PO: Mallikbari, PS: Bhaluka, Dist: Mymensingh'),
      addressKey('Village Charpara, Bhaluka, Mymensingh'),
    );
  });

  it('is empty without a district', () => {
    assert.equal(addressKey('House 5, Road 3'), '');
    assert.equal(addressKey(''), '');
  });
});
