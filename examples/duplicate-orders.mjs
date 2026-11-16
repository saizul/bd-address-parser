// Group orders that go to the same household and flag likely duplicates.
// Run after `npm run build`: node examples/duplicate-orders.mjs
import { addressKey, compareAddresses, parseAddress } from 'bd-address-parser';

const orders = [
  { id: 1001, address: 'House 23A, Road-7, Mirpur-10 Dhaka 1216' },
  { id: 1002, address: 'বাসা ২৩/এ, রোড ৭, মিরপুর ১০, ঢাকা' },
  { id: 1003, address: 'House 25, Road 7, Mirpur 10, Dhaka' },
  { id: 1004, address: 'Mirpur 10, Dhaka' },
  { id: 1005, address: 'Vill: Charpara, PO: Mallikbari, PS: Bhaluka, Dist: Mymensingh' },
];

const parsed = orders.map((o) => ({ ...o, parsed: parseAddress(o.address) }));

// 1. Exact grouping by key: cheap, good for counting orders per household.
const groups = new Map();
for (const o of parsed) {
  const key = addressKey(o.parsed) || `unknown:${o.id}`;
  groups.set(key, [...(groups.get(key) ?? []), o.id]);
}
console.log('Households:');
for (const [key, ids] of groups) console.log(`  ${key}  orders ${ids.join(', ')}`);

// 2. Pairwise comparison: tolerant, explains why two addresses differ.
console.log('\nPairs:');
for (let i = 0; i < parsed.length; i++) {
  for (let j = i + 1; j < parsed.length; j++) {
    const r = compareAddresses(parsed[i].parsed, parsed[j].parsed);
    if (r.verdict === 'different' && r.conflicts.includes('district')) continue;
    const why = r.conflicts.length ? ` (differs: ${r.conflicts.join(', ')})` : '';
    console.log(`  ${parsed[i].id} vs ${parsed[j].id}: ${r.verdict}, score ${r.score}${why}`);
  }
}
