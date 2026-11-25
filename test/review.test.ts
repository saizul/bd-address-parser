import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseAddress, reviewAddress } from '../src/index.js';

const codes = (input: string, options = {}): string[] => reviewAddress(input, options).reasons.map((r) => r.code);

describe('reviewAddress', () => {
  it('passes complete addresses in English and Bangla', () => {
    for (const a of ['House 12, Road 5, Dhanmondi, Dhaka-1209', 'বাসা ১২, মিরপুর ১০, ঢাকা 01711223344', 'House 5, Road 2, Savar, Dhaka']) {
      const r = reviewAddress(a);
      assert.equal(r.ok, true, `${a}: ${JSON.stringify(r.reasons)}`);
      assert.deepEqual(r.reasons, []);
    }
  });

  it('flags a bare area name', () => {
    assert.deepEqual(codes('Mirpur'), ['no_street_detail', 'low_confidence', 'ambiguous']);
  });

  it('flags text with no location', () => {
    const r = reviewAddress('hello world');
    assert.equal(r.ok, false);
    assert.deepEqual(r.reasons.map((x) => x.code), ['no_district', 'no_thana', 'low_confidence']);
    assert.equal(r.parsed.input, 'hello world');
  });

  it('flags a missing thana outside the cities', () => {
    assert.deepEqual(codes('Village Rampur, Kushtia'), ['no_thana']);
  });

  it('reports contradictions from the parser warnings', () => {
    const r = reviewAddress('House 12, Road 5, Dhanmondi, Dhaka 4000');
    assert.deepEqual(r.reasons.map((x) => x.code), ['conflict']);
    assert.match(r.reasons[0]!.message, /4000/);
    assert.deepEqual(codes('House 12, Mirpur 10, Dhaka, Sylhet district'), ['conflict']);
  });

  it('requirePhone, minConfidence and flagAmbiguous options', () => {
    assert.deepEqual(codes('House 12, Road 5, Dhanmondi, Dhaka-1209', { requirePhone: true }), ['no_phone']);
    assert.deepEqual(codes('বাসা ১২, মিরপুর ১০, ঢাকা 01711223344', { requirePhone: true }), []);
    assert.deepEqual(codes('House 3, Kaliganj'), ['ambiguous']);
    assert.deepEqual(codes('House 3, Kaliganj', { flagAmbiguous: false }), []);
    assert.deepEqual(codes('House 3, Kaliganj', { flagAmbiguous: false, minConfidence: 0.9 }), ['low_confidence']);
  });

  it('accepts a parse result and uses it as is', () => {
    const parsed = parseAddress('House 12, Road 5, Dhanmondi, Dhaka-1209');
    const r = reviewAddress(parsed);
    assert.equal(r.parsed, parsed);
    assert.equal(r.ok, true);
  });
});
