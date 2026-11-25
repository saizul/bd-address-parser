// Verifies the ESM build loads through the package "exports" map.
import assert from 'node:assert/strict';
import { parseAddress, isInsideDhaka, getDistricts, compareAddresses, reviewAddress, VERSION } from 'bd-address-parser';

assert.equal(parseAddress('বাসা ১২, মিরপুর ১০, ঢাকা').area.section, '10');
assert.equal(isInsideDhaka('Savar, Dhaka'), false);
assert.equal(getDistricts().length, 64);
assert.equal(compareAddresses('H#12, Rd#5, Dhanmondi, Dhaka', 'House 12, Road 5, Dhanmondi').verdict, 'same');
assert.match(VERSION, /^\d+\.\d+\.\d+$/);
assert.equal(reviewAddress('House 12, Road 5, Dhanmondi, Dhaka-1209').ok, true);
console.log('esm ok');
