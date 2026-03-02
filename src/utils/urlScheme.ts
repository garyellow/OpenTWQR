/**
 * URL Scheme / Universal Link / App Link utilities.
 *
 * Supported placeholder tokens in URL templates:
 *   - {account}        — raw account number
 *   - {paddedAccount}  — 16-char zero-padded account number
 *   - {bankCode}       — 3-digit bank code
 *   - {amount}         — amount in TWD (integer)
 *   - {amountCents}    — amount in cents (amount × 100)
 *   - {note}           — URL-encoded transaction note
 *
 * NOTE: Opening a bank URL requires a direct user gesture (tap on an <a> element).
 * Programmatic navigation via window.location.href from a timer / effect is blocked
 * by iOS for both custom URL schemes and HTTPS Universal Links.
 */

export interface UrlSchemeParams {
  bankCode: string;
  account: string;
  paddedAccount: string;
  amount: number;
  note?: string;
}

/**
 * Build a concrete URL from a user-defined template by replacing placeholders.
 */
export function buildBankUrl(template: string, params: UrlSchemeParams): string {
  return template
    .replace(/\{account\}/g, params.account)
    .replace(/\{paddedAccount\}/g, params.paddedAccount)
    .replace(/\{bankCode\}/g, params.bankCode)
    .replace(/\{amount\}/g, String(params.amount))
    .replace(/\{amountCents\}/g, String(params.amount * 100))
    .replace(/\{note\}/g, encodeURIComponent(params.note || ''));
}
