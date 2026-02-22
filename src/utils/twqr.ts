import type { TWQRParams } from '../types';

const BASE_URI = 'TWQRP://xn--gmqw5ax42ad01c/158/02/V1';

export const generateTWQR = (params: TWQRParams): string => {
  const { bankCode, accountNumber, amount, note } = params;

  const d1_amountCents = Math.round(amount * 100);
  const d6_paddedAccount = accountNumber.padStart(16, '0');
  const d10_currency = '901';

  const queryParams = new URLSearchParams();
  queryParams.append('D5', bankCode);
  queryParams.append('D6', d6_paddedAccount);
  queryParams.append('D1', d1_amountCents.toString());
  queryParams.append('D10', d10_currency);

  if (note) {
    queryParams.append('D9', note);
  }

  return `${BASE_URI}?${queryParams.toString()}`;
};

export const isValidAccount = (account: string): boolean => {
  return /^\d{10,16}$/.test(account);
};

export const isValidBank = (code: string): boolean => {
  return /^\d{3}$/.test(code);
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};
