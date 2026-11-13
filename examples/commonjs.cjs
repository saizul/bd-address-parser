// The package also ships a CommonJS build.
// Run after `npm run build`: node examples/commonjs.cjs
const { parseAddress, isInsideDhaka, searchPlaces } = require('bd-address-parser');

console.log(parseAddress('Gulshan 2, Dhaka 1212').thana);
console.log('inside Dhaka:', isInsideDhaka('Banani DOHS'));
console.log(searchPlaces('Jessore', { kinds: ['district'] })[0].place);
