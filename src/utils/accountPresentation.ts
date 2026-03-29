/**
 * Formats the institution line shown under an account title.
 * Keeps the real bank / institution visible across selectors, cards, and QR flows.
 */
export function formatBankCaption(bankName?: string, bankCode?: string) {
  if (bankName && bankCode) return `(${bankCode}) ${bankName}`;
  if (bankName) return bankName;
  if (bankCode) return `(${bankCode})`;
  return undefined;
}
