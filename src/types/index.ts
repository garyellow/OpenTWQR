export interface Bank {
  code: string;
  name: string;
  /** Official institution website/homepage (used for favicon fallback, not transfer deep links). */
  url?: string;
}

export interface BankAccount {
  id: string;
  bankCode: string;
  accountNumber: string;
  label?: string;
  /** Optional user-defined icon URL (overrides the bank default). */
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

/** QR Code dot (module) shape */
export type QRDotStyle = 'square' | 'rounded' | 'dots';

/** QR Code finder-pattern (eye) shape */
export type QREyeStyle = 'square' | 'rounded';

/** QR Code error correction level */
export type QRErrorLevel = 'L' | 'M' | 'Q' | 'H';

export interface ShareOptions {
  expiry: ExpiryOption;
  password: string;
}

export type ParseShareResult =
  | { status: 'ok'; data: ShareData }
  | { status: 'need-password' }
  | { status: 'wrong-password' }
  | { status: 'expired' }
  | { status: 'unsupported-browser' }
  | { status: 'invalid' };
