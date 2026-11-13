import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseAddress } from '../src/index.js';

describe('ambiguity and confidence', () => {
  it('reports an upazila name shared by four districts', () => {
    const r = parseAddress('Kaliganj');
    assert.equal(r.ambiguities.length, 1);
    const a = r.ambiguities[0]!;
    assert.equal(a.field, 'district');
    assert.equal(a.text, 'kaliganj');
    assert.deepEqual(a.candidates.map((c) => c.id).sort(), ['gazipur', 'jhenaidah', 'lalmonirhat', 'satkhira']);
    assert.equal(r.confidenceLevel, 'low');
  });

  it('resolves the shared name once the district is written', () => {
    const r = parseAddress('Kaliganj, Satkhira');
    assert.equal(r.thana?.id, 'satkhira/kaliganj');
    assert.deepEqual(r.ambiguities, []);
    assert.ok(r.confidence > parseAddress('Kaliganj').confidence);
  });

  it('prefers the Dhaka area for a bare "Mirpur" but reports Kushtia', () => {
    const r = parseAddress('Mirpur');
    assert.equal(r.area?.id, 'dhaka/mirpur');
    assert.ok(r.ambiguities.some((a) => a.candidates.some((c) => c.id === 'kushtia')), JSON.stringify(r.ambiguities));
  });

  it('a section number settles "Mirpur 10" as Dhaka', () => {
    const r = parseAddress('Mirpur 10');
    assert.equal(r.area?.id, 'dhaka/mirpur');
    assert.deepEqual(r.ambiguities, []);
  });

  it('reports Kotwali in Dhaka and Chattogram', () => {
    const r = parseAddress('Kotwali');
    assert.equal(r.district?.id, 'dhaka');
    assert.deepEqual(r.ambiguities[0]?.candidates.map((c) => c.id).sort(), ['chattogram', 'dhaka']);
  });

  it('warns about a district that contradicts the thana', () => {
    const r = parseAddress('Laksam, Cumilla, Rajshahi');
    assert.equal(r.thana?.id, 'cumilla/laksam');
    assert.ok(r.warnings.some((w) => w.code === 'conflicting_district'), JSON.stringify(r.warnings));
    assert.ok(r.confidence < parseAddress('Laksam, Cumilla').confidence);
  });

  it('accepts a matching division', () => {
    const r = parseAddress('Laksam, Cumilla, Chattogram Division');
    assert.equal(r.division?.source, 'matched');
    assert.deepEqual(
      r.warnings.filter((w) => w.code.startsWith('conflicting')),
      [],
    );
  });

  it('warns about a division that contradicts the district', () => {
    const r = parseAddress('Bogura, Khulna division');
    assert.equal(r.district?.id, 'bogura');
    assert.ok(r.warnings.some((w) => w.code === 'conflicting_division'), JSON.stringify(r.warnings));
  });

  it('uses labels to choose between readings', () => {
    // Sherpur is a district and an upazila of Bogura.
    assert.equal(parseAddress('Sherpur district').district?.id, 'sherpur');
    assert.equal(parseAddress('Sherpur thana, Bogura').thana?.id, 'bogura/sherpur');
  });

  it('ranks complete addresses above partial ones', () => {
    const full = parseAddress('House 12, Road 5, Dhanmondi, Dhaka 1209').confidence;
    const noStreet = parseAddress('Dhanmondi, Dhaka').confidence;
    const districtOnly = parseAddress('Dhaka').confidence;
    const nothing = parseAddress('House 5').confidence;
    assert.ok(full > noStreet && noStreet > districtOnly && districtOnly > nothing, `${full} ${noStreet} ${districtOnly} ${nothing}`);
    assert.equal(parseAddress('House 12, Road 5, Dhanmondi, Dhaka 1209').confidenceLevel, 'high');
  });

  it('keeps confidence between 0 and 1', () => {
    for (const a of ['Kaliganj', 'Laksam, Cumilla, Rajshahi, Khulna, Sylhet division', 'x', 'Dhaka Dhaka Dhaka 1207 1207']) {
      const c = parseAddress(a).confidence;
      assert.ok(c >= 0 && c <= 1, `${a}: ${c}`);
    }
  });
});
