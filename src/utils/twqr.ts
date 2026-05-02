import type { TWQRParams } from '../types';

const BASE_URI = 'TWQRP://xn--gmqw5ax42ad01c/158/02/V1';

const TWD_CURRENCY_FORMATTER = new Intl.NumberFormat('zh-TW', {
  style: 'currency',
  currency: 'TWD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const TWD_AMOUNT_FORMATTER = new Intl.NumberFormat('zh-TW', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export const generateTWQR = (params: TWQRParams): string => {
  const { bankCode, accountNumber, amount, note } = params;

  const d6_paddedAccount = normalizeAccountNumber(accountNumber).padStart(16, '0');
  const d10_currency = '901';

  const queryParams = new URLSearchParams();
  queryParams.append('D5', bankCode);
  queryParams.append('D6', d6_paddedAccount);

  // Only include D1 when a positive, finite amount is specified.
  // Omitting D1 lets the payer's transfer app prompt for the amount.
  if (Number.isFinite(amount) && amount > 0) {
    const d1_amountCents = Math.round(amount * 100);
    queryParams.append('D1', d1_amountCents.toString());
  }

  queryParams.append('D10', d10_currency);

  if (note) {
    queryParams.append('D9', note);
  }

  return `${BASE_URI}?${queryParams.toString()}`;
};

export const isValidAccount = (account: string): boolean => {
  return /^\d{10,16}$/.test(account);
};

/**
 * Returns true for accounts that are valid digit strings but shorter than the
 * standard 10-digit minimum.  Used to show a soft confirmation warning rather
 * than a hard blocking error — e-payment accounts (e.g. JKOPay / 街口) may
 * legitimately have fewer digits.
 */
export const isShortAccount = (account: string): boolean => {
  return /^\d{1,9}$/.test(account);
};

export const formatCurrency = (amount: number): string => {
  return TWD_CURRENCY_FORMATTER.format(amount);
};

/**
 * 格式化金額數字部分（不含貨幣符號），用於獨立渲染數字。
 */
export const formatAmount = (amount: number): string => {
  return TWD_AMOUNT_FORMATTER.format(amount);
};

/**
 * 遮罩帳號：四個一組，位數不足四的倍數時補齊，僅顯示末 4 碼明文。
 * 例如：10 碼 → `•••• •••• 1234`，14 碼 → `•••• •••• •••• 1234`
 */
export const maskAccount = (accountNumber: string): string => {
  if (accountNumber.length <= 4) return accountNumber;
  const paddedLen = Math.ceil(accountNumber.length / 4) * 4;
  const maskedGroups = (paddedLen - 4) / 4;
  const parts = Array.from({ length: maskedGroups }, () => '••••');
  parts.push(accountNumber.slice(-4));
  return parts.join(' ');
};

/**
 * 顯示完整帳號（已揭露）：補齊至四的倍數後四個一組呈現。
 * 例如：10 碼 `1234567890` → `0012 3456 7890`
 */
export const formatAccountDisplay = (accountNumber: string): string => {
  if (!accountNumber) return '';
  const paddedLen = Math.ceil(accountNumber.length / 4) * 4;
  const padded = accountNumber.padStart(paddedLen, '0');
  return padded.replace(/(.{4})/g, '$1 ').trim();
};

/**
 * Remove invisible/control characters that may be pasted from external sources.
 * Prevents zero-width spaces, control chars, and directional overrides
 * from corrupting QR code data or account numbers.
 */
export const removeInvisibleChars = (str: string): string => {
  // eslint-disable-next-line no-control-regex
  return str.replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\uFEFF]/g, '');
};

/**
 * Canonical account-number input used across forms, duplicate detection, and
 * QR generation.  It removes invisible/control characters, keeps digits only,
 * strips leading zero padding used by TWQR D6, and caps to the TWQR max length.
 */
export const normalizeAccountNumber = (account: string): string =>
  removeInvisibleChars(account).replace(/\D/g, '').replace(/^0+/, '').slice(0, 16);

/**
 * Strip the legal entity suffix「股份有限公司」from the end of a bank name.
 * Preserves institution types like「信用合作社」,「農業金庫」, etc.
 * Returns the trimmed name, or the original if the suffix is absent.
 */
export const stripCompanySuffix = (name: string): string =>
  name.replace(/股份有限公司$/, '').trim();
