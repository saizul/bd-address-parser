import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { extractComponents } from '../src/components.js';
import { normalizeAddress, parseAddress } from '../src/index.js';

const comp = (input: string) => extractComponents(normalizeAddress(input)).components;

describe('component extraction', () => {
  const cases: Array<[string, Record<string, string>]> = [
    ['House 12, Road 5', { house: '12', road: '5' }],
    ['H# 7, R# 3', { house: '7', road: '3' }],
    ['House No. 23/A, Road No. 7', { house: '23/a', road: '7' }],
    ['house-15/2, road-4', { house: '15/2', road: '4' }],
    ['Holding 33/1, Lane 2', { house: '33/1', lane: '2' }],
    ['Plot 14, Block C', { house: '14', block: 'c' }],
    ['12 no house, 3 no road', { house: '12', road: '3' }],
    ['basa 10', { house: '10' }],
    ['Flat 4B', { flat: '4b' }],
    ['Flat-B2, Apt 5', { flat: 'b2' }],
    ['Apartment A-3', { flat: 'a-3' }],
    ['5th floor', { floor: '5' }],
    ['Level 9', { floor: '9' }],
    ['ground floor', { floor: 'ground' }],
    ['C Block', { block: 'c' }],
    ['Sector 7', { sector: '7' }],
    ['Sec-11', { sector: '11' }],
    ['Satmasjid Road', { road: 'satmasjid road' }],
    ['Kazi Nazrul Islam Avenue', { road: 'kazi nazrul islam avenue' }],
    ['Gulshan Avenue', { road: 'gulshan avenue' }],
    ['Vill: Charpara, PO: Bhaluka', { village: 'charpara', postOffice: 'bhaluka' }],
    ['Village Kalia PO Kalia', { village: 'kalia', postOffice: 'kalia' }],
    ['near City Bank, Mirpur', { landmark: 'city bank' }],
    ['opposite of Rifles Square', { landmark: 'of rifles square' }],
    ['house name: Shanti Villa, Road 2', { house: 'shanti villa', road: '2' }],
  ];
  for (const [input, expected] of cases) {
    it(input, () => {
      const c = comp(input);
      for (const [k, v] of Object.entries(expected)) assert.equal(c[k as keyof typeof c], v, `${k} in ${JSON.stringify(c)}`);
    });
  }

  it('keeps place names that end in "road"', () => {
    const r = extractComponents('green road, dhaka', { isPlaceName: (t) => t === 'green road' });
    assert.equal(r.components.road, undefined);
    assert.match(r.rest, /green road/);
  });

  it('splits a leading place word off a road name', () => {
    const r = extractComponents('mohammadpur tajmahal road', { isPlaceWord: (w) => w === 'mohammadpur' });
    assert.equal(r.components.road, 'tajmahal road');
    assert.match(r.rest, /mohammadpur/);
  });

  it('extracts phone numbers before house numbers', () => {
    const r = extractComponents(normalizeAddress('House 5, 01712-345678, Mirpur'));
    assert.equal(r.phone, '01712345678');
    assert.equal(r.components.house, '5');
    assert.doesNotMatch(r.rest, /0171/);
  });

  it('extracts a labelled postcode', () => {
    assert.equal(extractComponents(normalizeAddress('Zip code: 1207')).labelledPostcode, '1207');
    assert.equal(extractComponents(normalizeAddress('পোস্ট কোড ১২০৯')).labelledPostcode, '1209');
  });

  it('keeps only the first value of a field', () => {
    assert.equal(comp('House 1, House 2').house, '1');
  });

  it('builds a street from leftover text', () => {
    const r = parseAddress('Concord Tower, House 9, Banani');
    assert.equal(r.components.street, 'concord');
  });
});
