// Verifies the CommonJS build loads through the package "exports" map.
const assert = require('node:assert/strict');
const lib = require('bd-address-parser');

const r = lib.parseAddress('House 12, Road 5, Dhanmondi, Dhaka-1209');
assert.equal(r.thana.name, 'Dhanmondi');
assert.equal(lib.isInsideDhaka('Mirpur 10'), true);
assert.equal(lib.getDistricts().length, 64);
assert.equal(lib.addressKey('House 12, Road 5, Dhanmondi, Dhaka-1209'), 'dhaka|dhaka/dhanmondi||h12|r5');
console.log('cjs ok');
