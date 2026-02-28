export interface Bank {
  code: string;
  name: string;
}

export interface BankAccount {
  id: string;
  bankCode: string;
  accountNumber: string;
  label?: string;
  /**
   * Optional icon for visual identification.
   *
   * Accepted formats:
   * - **Direct image URL** — an absolute URL ending in a common image extension
   *   (`.ico`, `.png`, `.jpg`, `.svg`, `.webp`) is used as-is.
   * - **Website URL** — any other `https://…` URL is treated as a bank homepage;
   *   the resolved favicon is derived as `${origin}/favicon.ico` at display time.
   */
  iconUrl?: string;
}

export interface TWQRParams {
  bankCode: string;
  accountNumber: string;
  amount: number;
  note?: string;
}

export interface ShareData {
  bankCode: string;
  accountNumber: string;
  amount?: number;
  note?: string;
}

/** Expiry duration in seconds; 0 means no expiration */
export type ExpiryOption = 0 | 600 | 3600 | 86400;

export interface ShareOptions {
  expiry: ExpiryOption;
  password: string;
}

export type ParseShareResult =
  | { status: 'ok'; data: ShareData }
  | { status: 'need-password' }
  | { status: 'wrong-password' }
  | { status: 'expired' }
  | { status: 'invalid' };
