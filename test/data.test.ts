import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getAreas,
  getDistricts,
  getDivisions,
  getMetroThanas,
  getPlace,
  getUpazilas,
  postcodesForDistrict,
  searchPlaces,
} from '../src/index.js';
import { POSTCODES } from '../src/data/postcodes.generated.js';

describe('bundled data', () => {
  it('has 8 divisions, 64 districts and 495 upazilas', () => {
    assert.equal(getDivisions().length, 8);
    assert.equal(getDistricts().length, 64);
    assert.equal(getUpazilas().length, 495);
  });

  it('has the district count per division', () => {
    const expected: Record<string, number> = {
      barishal: 6,
      chattogram: 11,
      dhaka: 13,
      khulna: 10,
      mymensingh: 4,
      rajshahi: 8,
      rangpur: 8,
      sylhet: 4,
    };
    for (const [division, n] of Object.entries(expected)) assert.equal(getDistricts(division).length, n, division);
  });

  it('gives every place a Bangla name and a BBS code', () => {
    for (const p of [...getDivisions(), ...getDistricts(), ...getUpazilas()]) {
      assert.match(p.bn, /[ঀ-৿]/, p.id);
      assert.match(p.code, /^BD\d{2,8}$/, p.id);
    }
  });

  it('links every district to a division and every upazila to a district', () => {
    const divisions = new Set(getDivisions().map((d) => d.id));
    const districts = new Set(getDistricts().map((d) => d.id));
    for (const d of getDistricts()) assert.ok(divisions.has(d.divisionId), d.id);
    for (const u of getUpazilas()) assert.ok(districts.has(u.districtId), u.id);
    for (const d of getDistricts()) assert.ok(getUpazilas(d.id).length > 0, `${d.id} has upazilas`);
  });

  it('lists the 50 DMP thanas and the CMP thanas', () => {
    assert.equal(getMetroThanas('dhaka').length, 50);
    assert.equal(getMetroThanas('chattogram').length, 15);
    assert.equal(new Set(getMetroThanas().map((t) => t.id)).size, 65);
  });

  it('maps every area to an existing thana or upazila', () => {
    for (const a of getAreas()) {
      assert.ok(a.thanaId, a.id);
      const thana = getPlace('metro-thana', a.thanaId!) ?? getPlace('upazila', a.thanaId!);
      assert.ok(thana, `${a.id} -> ${a.thanaId}`);
      for (const other of a.otherThanaIds ?? []) assert.ok(getPlace('metro-thana', other), `${a.id} -> ${other}`);
      assert.ok(getPlace('district', a.districtId), a.id);
    }
    assert.ok(getAreas('dhaka').length >= 60);
  });

  it('finds every district by English and Bangla name', () => {
    for (const d of getDistricts()) {
      assert.equal(searchPlaces(d.name, { kinds: ['district'] })[0]?.place.id, d.id, d.name);
      assert.equal(searchPlaces(d.bn, { kinds: ['district'] })[0]?.place.id, d.id, d.bn);
    }
  });

  it('finds every division by English and Bangla name', () => {
    for (const d of getDivisions()) {
      assert.equal(searchPlaces(d.name, { kinds: ['division'] })[0]?.place.id, d.id);
      assert.equal(searchPlaces(d.bn, { kinds: ['division'] })[0]?.place.id, d.id);
    }
  });

  it('resolves old and alternative spellings', () => {
    const cases: Array<[string, string]> = [
      ['Chittagong', 'chattogram'],
      ['Comilla', 'cumilla'],
      ['Bogra', 'bogura'],
      ['Barisal', 'barishal'],
      ['Jessore', 'jashore'],
      ['Chapai Nawabganj', 'chapainababganj'],
      ['Coxsbazar', 'coxs-bazar'],
      ['Jhalakathi', 'jhalokati'],
      ['Netrokona', 'netrakona'],
      ['Maulvibazar', 'moulvibazar'],
      ['Narsinghdi', 'narsingdi'],
      ['Laxmipur', 'lakshmipur'],
      ['Khagrachari', 'khagrachhari'],
      ['Mymensing', 'mymensingh'],
      ['B. Baria', 'brahmanbaria'],
    ];
    for (const [name, id] of cases) {
      const hit = searchPlaces(name, { kinds: ['district'] })[0];
      assert.equal(hit?.place.id, id, name);
      assert.ok(hit.method === 'alias' || hit.method === 'exact' || hit.method === 'phonetic', name);
    }
  });

  it('matches misspellings with edit distance', () => {
    const cases: Array<[string, string]> = [
      ['Kishorgonj', 'kishoreganj'],
      ['Narayangonj', 'narayanganj'],
      ['Mymensinh', 'mymensingh'],
      ['Chuadunga', 'chuadanga'],
      ['Thakugaon', 'thakurgaon'],
      ['Gaibanda', 'gaibandha'],
    ];
    for (const [name, id] of cases) assert.equal(searchPlaces(name, { kinds: ['district'] })[0]?.place.id, id, name);
  });

  it('does not fuzzy-match short words', () => {
    assert.equal(searchPlaces('Feno', { kinds: ['district'] }).length, 0);
    assert.equal(searchPlaces('xyzzy').length, 0);
  });

  it('respects disableFuzzy and limit', () => {
    assert.equal(searchPlaces('Mymensinh', { kinds: ['district'], disableFuzzy: true }).length, 0);
    assert.equal(searchPlaces('Kaliganj', { limit: 2 }).length, 2);
  });

  it('returns all upazilas that share a name', () => {
    const ids = searchPlaces('Kaliganj', { kinds: ['upazila'] }).map((h) => h.place.id).sort();
    assert.deepEqual(ids, ['gazipur/kaliganj', 'jhenaidah/kaliganj', 'lalmonirhat/kaliganj', 'satkhira/kaliganj']);
  });

  it('bundles a postcode list linked to districts', () => {
    assert.ok(POSTCODES.length > 1300);
    const districts = new Set(getDistricts().map((d) => d.id));
    for (const [code, , , district] of POSTCODES) {
      assert.match(code, /^\d{4}$/);
      assert.ok(districts.has(district), district);
    }
    assert.ok(postcodesForDistrict('dhaka').includes('1207'));
    assert.deepEqual(postcodesForDistrict('nowhere'), []);
  });
});
