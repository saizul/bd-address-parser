// Verifies the ESM build loads through the package "exports" map.
import assert from 'node:assert/strict';
import { parseAddress, isInsideDhaka, getDistricts, VERSION } from 'bd-address-parser';

assert.equal(parseAddress('বাসা ১২, মিরপুর ১০, ঢাকা').area.section, '10');
assert.equal(isInsideDhaka('Savar, Dhaka'), false);
assert.equal(getDistricts().length, 64);
assert.match(VERSION, /^\d+\.\d+\.\d+$/);
console.log('esm ok');
