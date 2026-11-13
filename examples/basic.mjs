// Parse a few addresses and print the structured result.
// Run after `npm run build`: node examples/basic.mjs
import { parseAddress, formatAddress } from 'bd-address-parser';

for (const input of [
  'House 12, Road 5, Dhanmondi, Dhaka-1209',
  'বাসা ১২, মিরপুর ১০, ঢাকা',
  'Vill: Kalia, PO: Kalia, PS: Kalia, Dist: Narail',
]) {
  const r = parseAddress(input);
  console.log(input);
  console.log('  components:', r.components);
  console.log('  area:', r.area?.name ?? '-', r.area?.section ? `(section ${r.area.section})` : '');
  console.log('  thana:', r.thana ? `${r.thana.name} [${r.thana.type}, ${r.thana.source}]` : '-');
  console.log('  district:', r.district?.name ?? '-', ' division:', r.division?.name ?? '-');
  console.log('  postcode:', r.postcode ?? '-', ' zone:', r.zone, ' confidence:', r.confidence, r.confidenceLevel);
  console.log('  label:', formatAddress(r));
  console.log('  Bangla label:', formatAddress(r, { lang: 'bn' }));
  console.log();
}
