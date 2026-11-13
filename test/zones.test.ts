import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getDeliveryZone, isInsideDhaka, parseAddress } from '../src/index.js';

describe('delivery zones', () => {
  const inside = [
    'Mirpur 10',
    'Dhanmondi 27',
    'Uttara sector 4',
    'Gulshan 1, Dhaka',
    'Banasree, Rampura',
    'বনশ্রী, ঢাকা',
    'Dhaka',
    'Jatrabari',
    'Motijheel, Dhaka 1000',
    '1207',
  ];
  const suburb = ['Savar, Dhaka', 'Ashulia', 'Keraniganj', 'Tongi', 'Fatullah', 'Narayanganj', 'Gazipur', 'Hemayetpur, Savar'];
  const outside = ['Chittagong', 'Agrabad, Chattogram', 'Bogra', 'Sylhet', 'Mirpur, Kushtia', 'Dohar, Dhaka', 'Kapasia, Gazipur'];

  for (const a of inside) {
    it(`inside: ${a}`, () => {
      assert.equal(getDeliveryZone(a), 'inside_dhaka');
      assert.equal(isInsideDhaka(a), true);
    });
  }
  for (const a of suburb) {
    it(`suburb: ${a}`, () => {
      assert.equal(getDeliveryZone(a), 'dhaka_suburb');
      assert.equal(isInsideDhaka(a), false);
      assert.equal(isInsideDhaka(a, { includeSuburbs: true }), true);
    });
  }
  for (const a of outside) {
    it(`outside: ${a}`, () => {
      assert.equal(getDeliveryZone(a), 'outside_dhaka');
      assert.equal(isInsideDhaka(a, { includeSuburbs: true }), false);
    });
  }

  it('returns unknown when no place is found', () => {
    assert.equal(getDeliveryZone('House 5, Road 3'), 'unknown');
    assert.equal(isInsideDhaka('House 5, Road 3'), false);
  });

  it('accepts a parse result', () => {
    const parsed = parseAddress('Mirpur 10');
    assert.equal(isInsideDhaka(parsed), true);
    assert.equal(getDeliveryZone(parsed), 'inside_dhaka');
  });

  it('allows custom suburb lists', () => {
    assert.equal(getDeliveryZone('Dohar, Dhaka', { zones: { suburbUpazilas: ['dhaka/dohar'] } }), 'dhaka_suburb');
    assert.equal(getDeliveryZone('Savar', { zones: { suburbUpazilas: [] } }), 'outside_dhaka');
    assert.equal(getDeliveryZone('Gazipur', { zones: { suburbDistricts: [] } }), 'outside_dhaka');
  });

  it('can treat a bare "Dhaka" as unknown', () => {
    assert.equal(getDeliveryZone('Dhaka', { zones: { bareDhakaIsInside: false } }), 'unknown');
    assert.equal(getDeliveryZone('Mirpur, Dhaka', { zones: { bareDhakaIsInside: false } }), 'inside_dhaka');
  });
});
