const BANGLA_ZERO = 0x09e6;

/** Convert Bangla digits (০-৯) to ASCII digits. Other characters are kept. */
export function toEnglishDigits(input: string): string {
  return input.replace(/[০-৯]/g, (d) => String(d.charCodeAt(0) - BANGLA_ZERO));
}

/** Convert ASCII digits to Bangla digits (০-৯). Other characters are kept. */
export function toBanglaDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => String.fromCharCode(BANGLA_ZERO + Number(d)));
}

/** True if the string contains at least one Bangla letter or digit. */
export function hasBangla(input: string): boolean {
  return /[ঀ-৿]/.test(input);
}
