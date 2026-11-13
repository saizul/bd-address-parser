import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseAddress, type ParsedAddress } from '../src/index.js';

interface Expect {
  area?: string;
  section?: string;
  thana?: string;
  district?: string;
  division?: string;
  postcode?: string;
  zone?: ParsedAddress['zone'];
  house?: string;
  road?: string;
  flat?: string;
  minConfidence?: number;
}

function check(input: string, e: Expect): void {
  const r = parseAddress(input);
  const ctx = `${input}\n${JSON.stringify({ area: r.area, thana: r.thana, district: r.district, c: r.components }, null, 1)}`;
  if (e.area !== undefined) assert.equal(r.area?.id, e.area, ctx);
  if (e.section !== undefined) assert.equal(r.area?.section ?? r.thana?.section, e.section, ctx);
  if (e.thana !== undefined) assert.equal(r.thana?.id, e.thana, ctx);
  if (e.district !== undefined) assert.equal(r.district?.id, e.district, ctx);
  if (e.division !== undefined) assert.equal(r.division?.id, e.division, ctx);
  if (e.postcode !== undefined) assert.equal(r.postcode, e.postcode, ctx);
  if (e.zone !== undefined) assert.equal(r.zone, e.zone, ctx);
  if (e.house !== undefined) assert.equal(r.components.house, e.house, ctx);
  if (e.road !== undefined) assert.equal(r.components.road, e.road, ctx);
  if (e.flat !== undefined) assert.equal(r.components.flat, e.flat, ctx);
  if (e.minConfidence !== undefined) assert.ok(r.confidence >= e.minConfidence, `${ctx}\nconfidence ${r.confidence}`);
}

const DHAKA_CITY: Array<[string, Expect]> = [
  ['House 12, Road 5, Dhanmondi, Dhaka-1209', { thana: 'dhaka/dhanmondi', district: 'dhaka', postcode: '1209', house: '12', road: '5', minConfidence: 0.9 }],
  ['House#45, Rd#27(old), Dhanmondi R/A', { thana: 'dhaka/dhanmondi', district: 'dhaka', house: '45', road: '27' }],
  ['Flat 4B, House 23/A, Road 7, Sector 4, Uttara, Dhaka 1230', { area: 'dhaka/uttara', district: 'dhaka', postcode: '1230', house: '23/a', flat: '4b', road: '7' }],
  ['Uttra sector 10, road 12', { area: 'dhaka/uttara', zone: 'inside_dhaka' }],
  ['Mirpur 10, Dhaka', { area: 'dhaka/mirpur', section: '10', district: 'dhaka', zone: 'inside_dhaka' }],
  ['mirpur-12, pallabi, dhaka 1216', { area: 'dhaka/mirpur', section: '12', thana: 'dhaka/pallabi', postcode: '1216' }],
  ['Mirpur DOHS, Dhaka', { area: 'dhaka/mirpur-dohs', thana: 'dhaka/pallabi' }],
  ['Gulshan 2, Dhaka 1212', { thana: 'dhaka/gulshan', section: '2', postcode: '1212' }],
  ['Gulsan-1, dhaka', { thana: 'dhaka/gulshan', section: '1' }],
  ['House 7, Road 11, Banani, Dhaka 1213', { thana: 'dhaka/banani', postcode: '1213', house: '7', road: '11' }],
  ['Bashundhara R/A, Block D, Road 5, House 120', { area: 'dhaka/bashundhara', thana: 'dhaka/bhatara', district: 'dhaka', house: '120', road: '5' }],
  ['Basundhara residential area block c', { area: 'dhaka/bashundhara' }],
  ['Merul Badda, Dhaka', { area: 'dhaka/merul-badda', thana: 'dhaka/badda' }],
  ['Uttar Badda, Dhaka 1212', { area: 'dhaka/uttar-badda', thana: 'dhaka/badda' }],
  ['Banasree, Block C, Road 3, Rampura', { area: 'dhaka/banasree', thana: 'dhaka/rampura' }],
  ['Mohakhali DOHS, Dhaka', { area: 'dhaka/mohakhali-dohs', thana: 'dhaka/cantonment' }],
  ['Mohakhali, Dhaka-1212', { area: 'dhaka/mohakhali' }],
  ['Farmgate, Tejgaon, Dhaka 1215', { area: 'dhaka/farmgate', thana: 'dhaka/tejgaon', postcode: '1215' }],
  ['Karwan Bazar, Dhaka', { area: 'dhaka/karwan-bazar', thana: 'dhaka/tejgaon' }],
  ['Kawran bazar', { area: 'dhaka/karwan-bazar' }],
  ['Lalmatia Block D, Mohammadpur', { area: 'dhaka/lalmatia', thana: 'dhaka/mohammadpur' }],
  ['Shyamoli, Adabor, Dhaka', { area: 'dhaka/shyamoli', thana: 'dhaka/adabor' }],
  ['Mohammadpur bus stand er pashe, Dhaka', { thana: 'dhaka/mohammadpur', district: 'dhaka' }],
  ['Kolabagan, Dhaka', { thana: 'dhaka/kalabagan' }],
  ['Panthapath, Dhaka', { area: 'dhaka/panthapath', thana: 'dhaka/kalabagan' }],
  ['Green Road, Dhaka 1205', { area: 'dhaka/green-road', postcode: '1205' }],
  ['Elephant road, New Market, Dhaka', { thana: 'dhaka/new-market' }],
  ['Azimpur, Lalbagh, Dhaka 1205', { area: 'dhaka/azimpur', thana: 'dhaka/lalbagh' }],
  ['Motijheel C/A, Dhaka 1000', { thana: 'dhaka/motijheel', postcode: '1000' }],
  ['Dilkusha, Motijheel', { area: 'dhaka/dilkusha', thana: 'dhaka/motijheel' }],
  ['Purana Paltan, Dhaka 1000', { area: 'dhaka/purana-paltan', thana: 'dhaka/paltan-model' }],
  ['Shantinagar, Dhaka', { area: 'dhaka/shantinagar', thana: 'dhaka/ramna-model' }],
  ['Moghbazar, Dhaka', { area: 'dhaka/moghbazar' }],
  ['Malibag chowdhury para, dhaka', { area: 'dhaka/malibagh' }],
  ['Khilgaon Taltola, Dhaka 1219', { thana: 'dhaka/khilgaon', postcode: '1219' }],
  ['Basabo, Sabujbag, Dhaka 1214', { area: 'dhaka/basabo', thana: 'dhaka/sabujbagh', postcode: '1214' }],
  ['Jatrabari, Dhaka', { thana: 'dhaka/jatrabari', zone: 'inside_dhaka' }],
  ['Shanir Akhra, Dhaka', { area: 'dhaka/shanir-akhra', thana: 'dhaka/kadamtali' }],
  ['Wari, Dhaka 1203', { thana: 'dhaka/wari', postcode: '1203' }],
  ['Sutrapur, Dhaka 1100', { thana: 'dhaka/sutrapur', postcode: '1100' }],
  ['Old Dhaka, Chawkbazar', { thana: 'dhaka/chawkbazar' }],
  ['Kamrangirchar, Dhaka', { thana: 'dhaka/kamrangirchar' }],
  ['Hazaribag, Dhaka', { thana: 'dhaka/hazaribagh' }],
  ['Khilkhet, Nikunja 2, Dhaka 1229', { area: 'dhaka/nikunja', thana: 'dhaka/khilkhet', postcode: '1229' }],
  ['Kuril, Dhaka', { area: 'dhaka/kuril', thana: 'dhaka/bhatara' }],
  ['near jamuna future park, kuril, dhaka', { area: 'dhaka/kuril' }],
  ['Dakkhinkhan, Dhaka 1230', { thana: 'dhaka/dakshinkhan' }],
  ['Uttarkhan, Dhaka', { thana: 'dhaka/uttar-khan' }],
  ['Airport, Dhaka', { thana: 'dhaka/bimanbandar' }],
  ['Dhaka Cantonment, Dhaka 1206', { thana: 'dhaka/cantonment', postcode: '1206' }],
  ['Agargaon, Sher-e-Bangla Nagar, Dhaka', { area: 'dhaka/agargaon', thana: 'dhaka/sher-e-bangla-nagar' }],
  ['Kazipara, Mirpur, Dhaka', { area: 'dhaka/kazipara', thana: 'dhaka/kafrul' }],
  ['Shewrapara, Mirpur', { area: 'dhaka/shewrapara' }],
  ['Demra, Dhaka 1360', { thana: 'dhaka/demra', postcode: '1360' }],
  ['Jurain, Dhaka', { area: 'dhaka/jurain', thana: 'dhaka/shyampur' }],
  ['Hatirjheel, Dhaka', { thana: 'dhaka/hatirjheel' }],
  ['Baridhara DOHS', { area: 'dhaka/baridhara-dohs' }],
  ['Niketan, Gulshan 1', { area: 'dhaka/niketan', thana: 'dhaka/gulshan' }],
  ['Aftabnagar, Dhaka', { area: 'dhaka/aftabnagar' }],
  ['Rampura TV center, Dhaka', { thana: 'dhaka/rampura' }],
];

const OUTSIDE_DHAKA: Array<[string, Expect]> = [
  ['Mirpur, Kushtia', { thana: 'kushtia/mirpur', district: 'kushtia', division: 'khulna', zone: 'outside_dhaka' }],
  ['Sherpur, Bogra', { thana: 'bogura/sherpur', district: 'bogura' }],
  ['Sherpur Sadar, Sherpur', { thana: 'sherpur/sherpur-sadar', district: 'sherpur' }],
  ['Agrabad, Chittagong', { area: 'chattogram/agrabad', district: 'chattogram', division: 'chattogram' }],
  ['Halishahar, Chattogram 4216', { thana: 'chattogram/halishahar', district: 'chattogram', postcode: '4216' }],
  ['GEC circle, ctg', { area: 'chattogram/gec', district: 'chattogram' }],
  ['Kotwali, Chittagong', { thana: 'chattogram/kotwali', district: 'chattogram' }],
  ['Hathazari, Chattogram', { thana: 'chattogram/hathazari' }],
  ['Sitakundu, Chittagong', { thana: 'chattogram/sitakunda' }],
  ['Comilla sadar', { thana: 'cumilla/adarsha-sadar', district: 'cumilla' }],
  ['Laksam, Cumilla', { thana: 'cumilla/laksam', district: 'cumilla' }],
  ['Feni Sadar, Feni', { thana: 'feni/feni-sadar', district: 'feni' }],
  ['Bogura sadar, bogura', { thana: 'bogura/bogura-sadar', district: 'bogura' }],
  ['Bogra Sadar', { thana: 'bogura/bogura-sadar', district: 'bogura' }],
  ['Sreemangal, Moulvi Bazar', { thana: 'moulvibazar/sreemangal', district: 'moulvibazar', division: 'sylhet' }],
  ["Cox's Bazar, Teknaf", { thana: 'coxs-bazar/teknaf', district: 'coxs-bazar' }],
  ['Ukhia, Coxsbazar', { thana: 'coxs-bazar/ukhia' }],
  ['Rangpur Sadar', { thana: 'rangpur/rangpur-sadar', district: 'rangpur' }],
  ['Kalia, Narail', { thana: 'narail/kalia', district: 'narail' }],
  ['Jessore', { district: 'jashore', division: 'khulna' }],
  ['Jashore Sadar, Jashore', { thana: 'jashore/jashore-sadar' }],
  ['Barisal', { district: 'barishal', division: 'barishal' }],
  ['Khulna', { district: 'khulna', zone: 'outside_dhaka' }],
  ['Rajshahi, Boalia', { district: 'rajshahi' }],
  ['Sylhet', { district: 'sylhet', division: 'sylhet' }],
  ['Chapai Nawabganj, Shibganj', { thana: 'chapainababganj/shibganj', district: 'chapainababganj' }],
  ['Shibganj, Bogura', { thana: 'bogura/shibganj', district: 'bogura' }],
  ['Kaliganj, Jhenaidah', { thana: 'jhenaidah/kaliganj', district: 'jhenaidah' }],
  ['Kaliganj, Gazipur', { thana: 'gazipur/kaliganj', district: 'gazipur' }],
  ['Kaliakoir, Gazipur', { thana: 'gazipur/kaliakair' }],
  ['Sripur, Gazipur', { thana: 'gazipur/sreepur' }],
  ['Bhaluka, Mymensingh', { thana: 'mymensingh/bhaluka', district: 'mymensingh', division: 'mymensingh' }],
  ['Netrokona sadar', { district: 'netrakona' }],
  ['Panchagar', { district: 'panchagarh', division: 'rangpur' }],
  ['Tangail Sadar, Tangail', { thana: 'tangail/tangail-sadar' }],
  ['Bandar, Narayanganj', { thana: 'narayanganj/bandar', district: 'narayanganj' }],
  ['Narayangonj', { district: 'narayanganj' }],
  ['Sonargaon, Narayanganj', { thana: 'narayanganj/sonargaon' }],
  ['Pabna sadar, Pabna', { thana: 'pabna/pabna-sadar' }],
  ['Ishwardi, Pabna', { district: 'pabna' }],
  ['Natore', { district: 'natore', division: 'rajshahi' }],
  ['Savar, Dhaka', { thana: 'dhaka/savar', district: 'dhaka', zone: 'dhaka_suburb' }],
  ['Saver EPZ, Dhaka', { thana: 'dhaka/savar', zone: 'dhaka_suburb' }],
  ['Keranigonj, Dhaka', { thana: 'dhaka/keraniganj', zone: 'dhaka_suburb' }],
  ['Ashulia, Savar', { area: 'dhaka-suburb/ashulia', thana: 'dhaka/savar', zone: 'dhaka_suburb' }],
  ['Tongi, Gazipur', { area: 'dhaka-suburb/tongi', district: 'gazipur', zone: 'dhaka_suburb' }],
  ['Fatullah, Narayanganj', { area: 'dhaka-suburb/fatullah', district: 'narayanganj', zone: 'dhaka_suburb' }],
  ['Dohar, Dhaka', { thana: 'dhaka/dohar', zone: 'outside_dhaka' }],
];

const POSTCODE_ONLY: Array<[string, Expect]> = [
  ['Dhaka 1207', { district: 'dhaka', thana: 'dhaka/mohammadpur', postcode: '1207' }],
  ['1216', { district: 'dhaka', area: 'dhaka/mirpur', postcode: '1216' }],
  ['Post code: 4000', { district: 'chattogram', postcode: '4000' }],
];

describe('parseAddress: Dhaka city', () => {
  for (const [input, e] of DHAKA_CITY) it(input, () => check(input, { zone: 'inside_dhaka', ...e }));
});

describe('parseAddress: outside Dhaka city', () => {
  for (const [input, e] of OUTSIDE_DHAKA) it(input, () => check(input, e));
});

describe('parseAddress: postcodes', () => {
  for (const [input, e] of POSTCODE_ONLY) it(input, () => check(input, e));

  it('reports postcode source for values read from the postcode', () => {
    const r = parseAddress('1216');
    assert.equal(r.district?.source, 'postcode');
    assert.equal(r.postcodeEntries[0]?.postOffice, 'Mirpur TSO');
  });

  it('warns when the postcode is unknown', () => {
    const r = parseAddress('Road 3, Dhanmondi, postcode 1299');
    assert.equal(r.postcode, '1299');
    assert.ok(r.warnings.some((w) => w.code === 'postcode_unknown'));
    assert.equal(r.thana?.id, 'dhaka/dhanmondi');
  });

  it('warns when the postcode belongs to another district', () => {
    const r = parseAddress('House 5, Laksam, Cumilla 1207');
    assert.equal(r.district?.id, 'cumilla');
    assert.ok(r.warnings.some((w) => w.code === 'postcode_mismatch'), JSON.stringify(r.warnings));
  });

  it('does not read a house number as a postcode', () => {
    const r = parseAddress('House 1207, Road 2, Mirpur, Dhaka');
    assert.equal(r.components.house, '1207');
    assert.equal(r.postcode, undefined);
  });

  it('does not read a phone number as a postcode', () => {
    const r = parseAddress('Gulshan 1, Dhaka, 01712 345678');
    assert.equal(r.phone, '01712345678');
    assert.equal(r.postcode, undefined);
  });
});

describe('parseAddress: result shape', () => {
  it('returns an empty result with a warning for empty input', () => {
    for (const input of ['', '   ', ',,,']) {
      const r = parseAddress(input);
      assert.equal(r.confidence, 0);
      assert.equal(r.zone, 'unknown');
      assert.equal(r.warnings[0]?.code, 'empty_input');
    }
  });

  it('tolerates non-string input', () => {
    const r = parseAddress(undefined as unknown as string);
    assert.equal(r.warnings[0]?.code, 'empty_input');
  });

  it('reports no location for text without places', () => {
    const r = parseAddress('House 5, Road 3');
    assert.equal(r.district, undefined);
    assert.equal(r.zone, 'unknown');
    assert.ok(r.warnings.some((w) => w.code === 'no_location_found'));
    assert.ok(r.confidence < 0.2);
  });

  it('marks inferred levels', () => {
    const r = parseAddress('Kazipara');
    assert.equal(r.area?.source, 'matched');
    assert.equal(r.thana?.source, 'inferred');
    assert.equal(r.district?.source, 'inferred');
    assert.equal(r.division?.source, 'inferred');
  });

  it('records match details', () => {
    const r = parseAddress('Narayangonj');
    assert.equal(r.district?.text, 'narayangonj');
    assert.ok(['phonetic', 'fuzzy', 'alias'].includes(r.district!.method!));
    assert.ok(r.matches.some((m) => m.id === 'narayanganj'));
  });

  it('flags fuzzy matches', () => {
    const r = parseAddress('Thakugaon');
    assert.equal(r.district?.id, 'thakurgaon');
    assert.equal(r.district?.method, 'fuzzy');
    assert.ok(r.warnings.some((w) => w.code === 'fuzzy_match'));
  });

  it('keeps the input and the normalized text', () => {
    const r = parseAddress('  বাসা ১২, ঢাকা ');
    assert.equal(r.input, '  বাসা ১২, ঢাকা ');
    assert.equal(r.normalized, 'house 12, ঢাকা');
  });

  it('extracts the phone number', () => {
    assert.equal(parseAddress('Mirpur 2, Dhaka. Mobile: +880 1812-345678').phone, '01812345678');
  });

  it('collects leftover street text', () => {
    const r = parseAddress('Rupayan Tower, 7th floor, Banani, Dhaka');
    assert.equal(r.components.floor, '7');
    assert.equal(r.components.street, 'rupayan');
  });

  it('honours defaultDistrict as a tie breaker', () => {
    assert.equal(parseAddress('Kaliganj', { defaultDistrict: 'satkhira' }).district?.id, 'satkhira');
  });

  it('honours disableFuzzy', () => {
    assert.equal(parseAddress('Thakugaon', { disableFuzzy: true }).district, undefined);
  });

  it('honours minScore', () => {
    assert.equal(parseAddress('Thakugaon', { minScore: 0.95 }).district, undefined);
  });

  it('is fast enough for batch use', () => {
    const start = process.hrtime.bigint();
    for (let i = 0; i < 300; i++) parseAddress('Flat 4B, House 23/A, Road 7, Sector 4, Uttara, Dhaka 1230');
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    assert.ok(ms < 3000, `${ms} ms`);
  });
});
