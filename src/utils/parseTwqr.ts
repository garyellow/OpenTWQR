/**
 * Parse a scanned TWQR string into structured data.
 *
 * TWQR format:
 * TWQRP://xn--gmqw5ax42ad01c/158/02/V1?D5=bankCode&D6=paddedAccount&D1=amountCents&D10=currency&D9=note
 */

export interface ParsedTWQR {
  bankCode: string;
  accountNumber: string;
  /** Amount in TWD (integer). 0 means no amount specified. */
  amount: number;
  note?: string;
}

/**
 * Parse a TWQR protocol string into structured payment data.
 * Returns `null` if the string is not a valid TWQR format.
 */
export function parseTWQR(qrString: string): ParsedTWQR | null {
  if (!qrString || !qrString.startsWith('TWQRP://')) return null;

  try {
    // Replace custom TWQRP:// scheme with https:// so URL constructor can parse it
    const urlString = qrString.replace('TWQRP://', 'https://');
    const url = new URL(urlString);
    const params = url.searchParams;

    const bankCode = params.get('D5');
    const paddedAccount = params.get('D6');

    if (!bankCode || !paddedAccount) return null;

    // Strip leading zeros from the 16-char padded account
    const accountNumber = paddedAccount.replace(/^0+/, '') || '0';

    // D1 is amount in cents (amount × 100 per TWQR spec)
    const d1 = params.get('D1');
    const amount = d1 ? Math.round(parseInt(d1, 10) / 100) : 0;

    const note = params.get('D9') || undefined;

    return { bankCode, accountNumber, amount, note };
  } catch {
    return null;
  }
}

/** Check if a string looks like a TWQR code. */
export function isTWQR(value: string): boolean {
  return typeof value === 'string' && value.startsWith('TWQRP://');
}
