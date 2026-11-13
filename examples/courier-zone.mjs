// Pick a delivery charge from the address, the way most Bangladeshi shops price courier delivery.
// Run after `npm run build`: node examples/courier-zone.mjs
import { getDeliveryZone, parseAddress } from 'bd-address-parser';

const CHARGE = { inside_dhaka: 60, dhaka_suburb: 100, outside_dhaka: 120 };

export function deliveryCharge(address) {
  const parsed = parseAddress(address);
  const zone = getDeliveryZone(parsed);
  if (zone === 'unknown' || parsed.confidenceLevel === 'low') {
    // Ask the customer to pick the area instead of guessing the price.
    return { charge: undefined, zone, reason: parsed.ambiguities.length ? 'ambiguous address' : 'address not recognised' };
  }
  return { charge: CHARGE[zone], zone };
}

for (const a of ['Mirpur 10, Dhaka', 'Ashulia, Savar', 'Agrabad, Chittagong', 'Kaliganj', 'House 5, Road 3']) {
  console.log(a.padEnd(24), deliveryCharge(a));
}
