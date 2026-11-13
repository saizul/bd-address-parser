import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatAddress, parseAddress } from '../src/index.js';

const fmt = (a: string, o?: Parameters<typeof formatAddress>[1]) => formatAddress(parseAddress(a), o);

describe('formatAddress', () => {
  it('formats a Dhaka address', () => {
    assert.equal(fmt('house 12 road 5 dhanmondi dhaka 1209'), 'House 12, Road 5, Dhanmondi, Dhaka 1209');
  });
  it('keeps the section and drops an inferred thana next to the area', () => {
    assert.equal(fmt('mirpur-10, dhaka'), 'Mirpur 10, Dhaka');
  });
  it('keeps a written thana next to the area', () => {
    assert.equal(fmt('Banasree, Rampura, Dhaka'), 'Banasree, Rampura, Dhaka');
  });
  it('formats flats, floors and sectors', () => {
    assert.equal(
      fmt('flat 4b, 5th floor, house 23/a, road 7, sector 4, uttara, dhaka 1230'),
      'House 23/A, Flat 4B, Floor 5, Road 7, Sector 4, Uttara, Dhaka 1230',
    );
  });
  it('formats a village address and skips a post office equal to the thana', () => {
    assert.equal(fmt('Vill: Charpara, PO: Bhaluka, PS: Bhaluka, Dist: Mymensingh'), 'Village Charpara, Bhaluka, Mymensingh');
  });
  it('includes a different post office', () => {
    assert.equal(fmt('Vill: Charpara, PO: Mallikbari, PS: Bhaluka, Dist: Mymensingh'), 'Village Charpara, Bhaluka, PO Mallikbari, Mymensingh');
  });
  it('includes the division on request', () => {
    assert.equal(fmt('Laksam, Comilla', { includeDivision: true }), 'Laksam, Cumilla, Chattogram');
  });
  it('supports a custom separator', () => {
    assert.equal(fmt('Road 2, Gulshan 1', { separator: ' | ' }), 'Road 2 | Gulshan 1 | Dhaka');
  });
  it('formats named roads and landmarks', () => {
    assert.equal(fmt('House 3, Satmasjid Road, near Abahani field, Dhanmondi'), 'House 3, Satmasjid Road, Near Abahani Field, Dhanmondi, Dhaka');
  });
});
