import { toBanglaDigits } from './digits.js';
import type { ParsedAddress } from './types.js';

export interface FormatOptions {
  /** `en` (default) or `bn`. Bangla output uses Bangla place names, labels and digits. */
  lang?: 'en' | 'bn';
  /** Include the division. Default `false`: couriers do not need it. */
  includeDivision?: boolean;
  /** Separator between parts. Default `", "`. */
  separator?: string;
}

const LABELS = {
  en: { house: 'House', road: 'Road', lane: 'Lane', flat: 'Flat', floor: 'Floor', block: 'Block', sector: 'Sector', village: 'Village', postOffice: 'PO', near: 'Near' },
  bn: { house: 'বাসা', road: 'রোড', lane: 'লেন', flat: 'ফ্ল্যাট', floor: 'তলা', block: 'ব্লক', sector: 'সেক্টর', village: 'গ্রাম', postOffice: 'ডাকঘর', near: 'নিকট' },
} as const;

const title = (s: string): string => s.replace(/(^|[\s/-])([a-z])/g, (_, p: string, c: string) => p + c.toUpperCase());

/**
 * Format a parse result as a clean one-line address, for example for a courier label:
 * `House 12, Road 5, Dhanmondi, Dhaka 1209`.
 */
export function formatAddress(parsed: ParsedAddress, options: FormatOptions = {}): string {
  const lang = options.lang ?? 'en';
  const L = LABELS[lang];
  const num = (v: string): string => (lang === 'bn' ? toBanglaDigits(v) : v.toUpperCase());
  const name = (p: { name: string; bn: string } | undefined): string | undefined => (p ? (lang === 'bn' ? p.bn : p.name) : undefined);
  const c = parsed.components;
  const parts: string[] = [];
  const labelled = (label: string, v: string | undefined): void => {
    if (!v) return;
    parts.push(/^\d/.test(v) ? `${label} ${num(v)}` : title(v));
  };

  labelled(L.house, c.house);
  if (c.flat) parts.push(`${L.flat} ${num(c.flat)}`);
  if (c.floor) parts.push(/^\d/.test(c.floor) ? `${L.floor} ${num(c.floor)}` : `${title(c.floor)} floor`);
  labelled(L.road, c.road);
  labelled(L.lane, c.lane);
  if (c.block) parts.push(`${L.block} ${num(c.block)}`);
  if (c.sector) parts.push(`${L.sector} ${num(c.sector)}`);
  if (c.street) parts.push(title(c.street));
  if (c.village) parts.push(`${L.village} ${title(c.village)}`);
  if (c.landmark) parts.push(`${L.near} ${title(c.landmark)}`);

  const area = name(parsed.area);
  if (area) parts.push(parsed.area?.section ? `${area} ${num(parsed.area.section)}` : area);
  const thana = name(parsed.thana);
  // An inferred thana adds nothing for a courier when the area is already written.
  const showThana = thana && thana !== area && !(parsed.area && parsed.thana?.source !== 'matched');
  if (showThana) parts.push(parsed.thana?.section ? `${thana} ${num(parsed.thana.section)}` : thana!);
  const sameName = (x: { name: string; bn: string } | undefined): boolean =>
    !!x && !!c.postOffice && (x.name.toLowerCase() === c.postOffice || x.bn === c.postOffice);
  if (c.postOffice && !sameName(parsed.thana) && !sameName(parsed.area) && !sameName(parsed.district)) {
    parts.push(`${L.postOffice} ${title(c.postOffice)}`);
  }
  const district = name(parsed.district);
  if (district) parts.push(parsed.postcode ? `${district} ${num(parsed.postcode)}` : district);
  else if (parsed.postcode) parts.push(num(parsed.postcode));
  if (options.includeDivision) {
    const division = name(parsed.division);
    if (division && division !== district) parts.push(division);
  }
  return parts.join(options.separator ?? ', ');
}
