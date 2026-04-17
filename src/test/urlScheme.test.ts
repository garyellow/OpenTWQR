import { describe, it, expect } from 'vitest';
import { buildBankUrl } from '../utils/urlScheme';
import type { UrlSchemeParams } from '../utils/urlScheme';

const baseParams: UrlSchemeParams = {
  bankCode: '812',
  account: '1234567890',
  paddedAccount: '0000001234567890',
  amount: 1000,
  note: '午餐費',
};

describe('buildBankUrl', () => {
  it('replaces {account} placeholder', () => {
    const url = buildBankUrl('https://bank.com/pay?acct={account}', baseParams);
    expect(url).toBe('https://bank.com/pay?acct=1234567890');
  });

  it('replaces {paddedAccount} placeholder', () => {
    const url = buildBankUrl('https://bank.com/pay?acct={paddedAccount}', baseParams);
    expect(url).toBe('https://bank.com/pay?acct=0000001234567890');
  });

  it('replaces {bankCode} placeholder', () => {
    const url = buildBankUrl('https://bank.com/pay?bank={bankCode}', baseParams);
    expect(url).toBe('https://bank.com/pay?bank=812');
  });

  it('replaces {amount} placeholder', () => {
    const url = buildBankUrl('https://bank.com/pay?amt={amount}', baseParams);
    expect(url).toBe('https://bank.com/pay?amt=1000');
  });

  it('replaces {amountCents} placeholder', () => {
    const url = buildBankUrl('https://bank.com/pay?cents={amountCents}', baseParams);
    expect(url).toBe('https://bank.com/pay?cents=100000');
  });

  it('replaces {note} with URL-encoded value', () => {
    const url = buildBankUrl('https://bank.com/pay?note={note}', baseParams);
    expect(url).toContain('note=');
    expect(url).not.toContain('午餐費');
  });

  it('replaces multiple placeholders', () => {
    const url = buildBankUrl(
      'https://bank.com/pay?bank={bankCode}&acct={account}&amt={amount}',
      baseParams,
    );
    expect(url).toBe('https://bank.com/pay?bank=812&acct=1234567890&amt=1000');
  });

  it('returns template unchanged when no placeholders', () => {
    const url = buildBankUrl('https://bank.com/pay', baseParams);
    expect(url).toBe('https://bank.com/pay');
  });
});
