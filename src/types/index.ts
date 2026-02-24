export interface Bank {
  code: string;
  name: string;
}

export interface BankAccount {
  id: string;
  bankCode: string;
  accountNumber: string;
  label?: string;
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
export type ExpiryOption = 0 | 3600 | 86400 | 604800;

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
