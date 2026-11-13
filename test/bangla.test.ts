import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatAddress, normalizeAddress, parseAddress } from '../src/index.js';

describe('Bangla addresses', () => {
  it('parses house, road, block, area, thana and postcode in Bangla', () => {
    const r = parseAddress('বাড়ি নং ৫৪, রোড নং ৩, ব্লক সি, বনশ্রী, রামপুরা, ঢাকা-১২১৯');
    assert.equal(r.components.house, '54');
    assert.equal(r.components.road, '3');
    assert.equal(r.components.block, 'সি');
    assert.equal(r.area?.id, 'dhaka/banasree');
    assert.equal(r.thana?.id, 'dhaka/rampura');
    assert.equal(r.district?.id, 'dhaka');
    assert.equal(r.postcode, '1219');
    assert.equal(r.zone, 'inside_dhaka');
    assert.ok(r.confidence >= 0.9);
  });

  it('reads Bangla digits in sections', () => {
    const r = parseAddress('বাসা ১২, মিরপুর ১০, ঢাকা');
    assert.equal(r.components.house, '12');
    assert.equal(r.area?.id, 'dhaka/mirpur');
    assert.equal(r.area?.section, '10');
  });

  it('parses a village address with labels', () => {
    const r = parseAddress('গ্রাম: চরপাড়া, ডাকঘর: ভালুকা, উপজেলা: ভালুকা, জেলা: ময়মনসিংহ');
    assert.equal(r.components.village, 'চরপাড়া'.normalize('NFC'));
    assert.equal(r.components.postOffice, 'ভালুকা');
    assert.equal(r.thana?.id, 'mymensingh/bhaluka');
    assert.equal(r.district?.id, 'mymensingh');
    assert.equal(r.division?.id, 'mymensingh');
    assert.equal(r.components.street, undefined);
  });

  it('handles the visarga colon (থানাঃ, জেলাঃ)', () => {
    const r = parseAddress('থানাঃ কালিয়া, জেলাঃ নড়াইল');
    assert.equal(r.thana?.id, 'narail/kalia');
    assert.equal(r.district?.id, 'narail');
  });

  it('strips Bangla case endings (ঢাকার, মিরপুরে)', () => {
    assert.equal(parseAddress('মিরপুরে থাকি, ঢাকার').district?.id, 'dhaka');
    assert.equal(parseAddress('খুলনাতে').district?.id, 'khulna');
  });

  it('accepts spelling variants in Bangla', () => {
    assert.equal(parseAddress('যাত্রাবাড়ি, ঢাকা').thana?.id, 'dhaka/jatrabari');
    assert.equal(parseAddress('ধানমণ্ডি ২৭').thana?.id, 'dhaka/dhanmondi');
    assert.equal(parseAddress('চট্রগ্রাম').district?.id, 'chattogram');
    assert.equal(parseAddress('বগুরা').district?.id, 'bogura');
  });

  it('parses Bangla district and upazila names', () => {
    const cases: Array<[string, string, string]> = [
      ['সাভার, ঢাকা', 'dhaka/savar', 'dhaka'],
      ['কালীগঞ্জ, গাজীপুর', 'gazipur/kaliganj', 'gazipur'],
      ['টেকনাফ, কক্সবাজার', 'coxs-bazar/teknaf', 'coxs-bazar'],
      ['শ্রীমঙ্গল, মৌলভীবাজার', 'moulvibazar/sreemangal', 'moulvibazar'],
      ['লাকসাম, কুমিল্লা', 'cumilla/laksam', 'cumilla'],
    ];
    for (const [input, thana, district] of cases) {
      const r = parseAddress(input);
      assert.equal(r.thana?.id, thana, input);
      assert.equal(r.district?.id, district, input);
    }
  });

  it('reads Bangla floor and flat labels', () => {
    const r = parseAddress('ফ্ল্যাট ৪বি, ৫ম তলা, বাসা ৮, রোড ২, গুলশান ১');
    assert.equal(r.components.flat, '4বি');
    assert.equal(r.components.floor, '5');
    assert.equal(r.thana?.id, 'dhaka/gulshan');
  });

  it('reads a Bangla landmark postposition (পাশে)', () => {
    const r = parseAddress('বায়তুল আমান মসজিদের পাশে, শ্যামলী, ঢাকা');
    assert.ok(r.components.landmark?.includes('মসজিদের'));
    assert.equal(r.area?.id, 'dhaka/shyamoli');
  });

  it('formats in Bangla', () => {
    const r = parseAddress('House 12, Road 5, Dhanmondi, Dhaka 1209');
    assert.equal(formatAddress(r, { lang: 'bn' }), 'বাসা ১২, রোড ৫, ধানমন্ডি, ঢাকা ১২০৯');
    const b = parseAddress('বাড়ি নং ৫৪, রোড নং ৩, ব্লক সি, বনশ্রী, রামপুরা, ঢাকা-১২১৯');
    assert.equal(formatAddress(b, { lang: 'bn' }), 'বাসা ৫৪, রোড ৩, ব্লক সি, বনশ্রী, রামপুরা, ঢাকা ১২১৯');
    assert.equal(formatAddress(b), 'House 54, Road 3, Block সি, Banasree, Rampura, Dhaka 1219');
  });
});

describe('mixed and Banglish addresses', () => {
  const cases: Array<[string, Record<string, string>]> = [
    ['basa 10, kolabagan, dhaka', { thana: 'dhaka/kalabagan', house: '10' }],
    ['Mirpur 1, shah ali market er samne', { area: 'dhaka/mirpur', thana: 'dhaka/shah-ali' }],
    ['Uttara sector 7 er kache, dhaka', { area: 'dhaka/uttara' }],
    ['Mohammadpur Tajmahal road, ঢাকা', { thana: 'dhaka/mohammadpur', district: 'dhaka' }],
    ['বাসা 5, road 3, Dhanmondi', { thana: 'dhaka/dhanmondi', house: '5', road: '3' }],
    ['gram: kalia, thana kalia, jela narail', { thana: 'narail/kalia', district: 'narail' }],
    ['Vill: Kalia, PO: Kalia, PS: Kalia, Dist: Narail', { thana: 'narail/kalia', district: 'narail' }],
    ['Upazila: Ullapara, Zila: Sirajgonj', { thana: 'sirajganj/ullapara', district: 'sirajganj' }],
    ['Chittagong er Agrabad', { area: 'chattogram/agrabad', district: 'chattogram' }],
    ['Narayangonj, Fotulla', { district: 'narayanganj' }],
    ['Bogra Sherpur', { thana: 'bogura/sherpur', district: 'bogura' }],
    ['Jinjira, Keranigonj', { thana: 'dhaka/keraniganj' }],
    ['Bashundhara, Vatara thana, Dhaka', { area: 'dhaka/bashundhara', thana: 'dhaka/bhatara' }],
  ];
  for (const [input, e] of cases) {
    it(input, () => {
      const r = parseAddress(input);
      const ctx = JSON.stringify({ area: r.area?.id, thana: r.thana?.id, district: r.district?.id, c: r.components });
      if (e.area) assert.equal(r.area?.id, e.area, ctx);
      if (e.thana) assert.equal(r.thana?.id, e.thana, ctx);
      if (e.district) assert.equal(r.district?.id, e.district, ctx);
      if (e.house) assert.equal(r.components.house, e.house, ctx);
      if (e.road) assert.equal(r.components.road, e.road, ctx);
    });
  }
});

describe('normalizeAddress', () => {
  it('rewrites labels, digits and separators', () => {
    assert.equal(normalizeAddress('H# 12; Rd# 5 | Dhanmondi\nDhaka-1209'), 'house 12, road 5, dhanmondi, dhaka-1209');
    assert.equal(normalizeAddress('Vill. Kalia, P.O. Kalia, P.S. Kalia, Dist. Narail'), 'village kalia, po kalia, ps kalia, district narail');
    assert.equal(normalizeAddress('জেলা: ঢাকা। থানা: সাভার'), 'district : ঢাকা, thana : সাভার');
    assert.equal(normalizeAddress('Post Code: ১২০৭'), 'postcode : 1207');
  });
  it('removes zero-width characters and diacritics', () => {
    assert.equal(normalizeAddress('Dha\u200bka Caf\u00e9'), 'dhaka cafe');
  });
});
