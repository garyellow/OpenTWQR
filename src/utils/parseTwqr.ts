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
 *
 * Handles both raw (`TWQRP://...`) and URL-encoded (`TWQRP%3A%2F%2F...`)
 * input — the latter can occur when a QR code encodes a percent-encoded URL.
 */
export function parseTWQR(qrString: string): ParsedTWQR | null {
  if (!qrString) return null;

  // Decode URL-encoded input (e.g. TWQRP%3A%2F%2F...) before checking the prefix.
  let decoded = qrString;
  if (qrString.includes('%')) {
    try {
      decoded = decodeURIComponent(qrString);
    } catch {
      // If decoding fails keep the original string and let the prefix check below handle it.
    }
  }

  if (!decoded.startsWith('TWQRP://')) return null;

  try {
    // Replace custom TWQRP:// scheme with https:// so URL constructor can parse it
    const urlString = decoded.replace('TWQRP://', 'https://');
    const url = new URL(urlString);
    const params = url.searchParams;

    const bankCode = params.get('D5');
    const paddedAccount = params.get('D6');

    if (!bankCode || !paddedAccount) return null;

    // Strip leading zeros from the 16-char padded account
    const accountNumber = paddedAccount.replace(/^0+/, '') || '0';

    // D1 is amount in cents (amount × 100 per TWQR spec)
    const d1 = params.get('D1');
    const rawAmount = d1 ? parseInt(d1, 10) : 0;
    const amount = Number.isNaN(rawAmount) ? 0 : Math.round(rawAmount / 100);

    const note = params.get('D9') || undefined;

    return { bankCode, accountNumber, amount, note };
  } catch {
    return null;
  }
}

/** Check if a string looks like a TWQR code (raw or URL-encoded). */
export function isTWQR(value: string): boolean {
  if (typeof value !== 'string') return false;
  if (value.startsWith('TWQRP://')) return true;
  // Also accept URL-encoded variant (TWQRP%3A%2F%2F...)
  if (value.includes('%')) {
    try {
      return decodeURIComponent(value).startsWith('TWQRP://');
    } catch {
      return false;
    }
  }
  return false;
}
