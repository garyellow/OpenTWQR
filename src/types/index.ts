export interface Bank {
  code: string;
  name: string;
}

export interface BankAccount {
  id: string;
  bankCode: string;
  accountNumber: string;
  note?: string;
}

export interface TWQRParams {
  bankCode: string;
  accountNumber: string;
  amount: number;
  note?: string;
}
