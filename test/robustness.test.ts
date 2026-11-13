import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatAddress, parseAddress } from '../src/index.js';

describe('robustness', () => {
  const odd = [
    '🙂🙂🙂',
    '((((((',
    '----,,,,;;;;',
    '1234567890',
    'a'.repeat(5000),
    'Dhaka '.repeat(500),
    'house house house road road road',
    'null',
    '\u200b\u200c\u200d',
    'ঢ',
    'Mirpur\u0000Dhaka',
    'P.O. P.S. Dist. Vill.',
  ];
  for (const input of odd) {
    it(`does not throw on ${JSON.stringify(input.slice(0, 30))}`, () => {
      const r = parseAddress(input);
      assert.ok(r.confidence >= 0 && r.confidence <= 1);
      assert.equal(typeof formatAddress(r), 'string');
    });
  }

  it('cuts very long input and says so', () => {
    for (const s of ['abc '.repeat(3000) + 'road', 'ঢাকা '.repeat(2000), 'village a b c d e f g '.repeat(300)]) {
      const start = Date.now();
      const r = parseAddress(s);
      assert.ok(Date.now() - start < 1000, `${Date.now() - start} ms`);
      assert.ok(r.warnings.some((w) => w.code === 'input_truncated'));
    }
    assert.equal(parseAddress('Mirpur 10, Dhaka', { maxLength: 6 }).area?.id, 'dhaka/mirpur');
  });

  it('parses a long address in reasonable time', () => {
    const long = Array.from({ length: 40 }, (_, i) => `House ${i}, Road ${i}, Mirpur ${i % 14}`).join(', ');
    const start = Date.now();
    const r = parseAddress(long, { maxLength: 5000 });
    assert.equal(r.area?.id, 'dhaka/mirpur');
    assert.ok(Date.now() - start < 2000);
  });

  it('is deterministic', () => {
    const a = JSON.stringify(parseAddress('Kaliganj'));
    for (let i = 0; i < 5; i++) assert.equal(JSON.stringify(parseAddress('Kaliganj')), a);
  });

  it('does not share state between results', () => {
    const r1 = parseAddress('Mirpur 10');
    r1.components.house = 'mutated';
    assert.equal(parseAddress('Mirpur 10').components.house, undefined);
  });
});
