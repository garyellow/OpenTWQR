import { stripCompanySuffix } from './twqr';

const PRESENTATION_NOISE_PATTERN = /[\s()（）【】「」『』·•・._-]+/g;
const BANK_SUFFIX_PATTERN = /(股份有限公司|商業銀行|銀行|信用合作社|農業金庫|票券金融公司)$/g;
const SAMPLE_LABEL_PATTERN = /(sample|範例)/gi;

function normalizePresentationText(value?: string) {
  return stripCompanySuffix(value || '')
    .replace(SAMPLE_LABEL_PATTERN, '')
    .replace(BANK_SUFFIX_PATTERN, '')
    .replace(/臺/g, '台')
    .replace(PRESENTATION_NOISE_PATTERN, '')
    .toLowerCase();
}

export function buildAccountCaption(titleLike?: string, bankName?: string, bankCode?: string) {
  if (!bankName) return undefined;

  const normalizedTitle = normalizePresentationText(titleLike);
  const normalizedBankName = normalizePresentationText(bankName);

  if (normalizedTitle && normalizedBankName && normalizedTitle.includes(normalizedBankName)) {
    return undefined;
  }

  return bankCode ? `(${bankCode}) ${bankName}` : bankName;
}

export function shouldShowSecondaryBankName(titleLike?: string, bankName?: string) {
  const normalizedTitle = normalizePresentationText(titleLike);
  const normalizedBankName = normalizePresentationText(bankName);

  if (!normalizedBankName) return false;
  return !normalizedTitle.includes(normalizedBankName);
}
