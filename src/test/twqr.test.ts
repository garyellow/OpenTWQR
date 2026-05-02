import { describe, it, expect } from 'vitest';
import {
  generateTWQR,
  isValidAccount,
  isShortAccount,
  formatCurrency,
  formatAmount,
  maskAccount,
  formatAccountDisplay,
  removeInvisibleChars,
  stripCompanySuffix,
  normalizeAccountNumber,
} from '../utils/twqr';

describe('generateTWQR', () => {
  it('generates basic TWQR string', () => {
    const result = generateTWQR({
      bankCode: '812',
      accountNumber: '1234567890',
      amount: 0,
    });
    expect(result).toContain('TWQRP://');
    expect(result).toContain('D5=812');
    expect(result).toContain('D6=0000001234567890');
    expect(result).toContain('D10=901');
    expect(result).not.toContain('D1=');
  });

  it('includes D1 when amount is positive', () => {
    const result = generateTWQR({
      bankCode: '812',
      accountNumber: '1234567890',
      amount: 1000,
    });
    expect(result).toContain('D1=100000');
  });

  it('omits D1 when amount is 0', () => {
    const result = generateTWQR({
      bankCode: '812',
      accountNumber: '1234567890',
      amount: 0,
    });
    expect(result).not.toContain('D1=');
  });

  it('pads account to 16 chars', () => {
    const result = generateTWQR({
      bankCode: '812',
      accountNumber: '123',
      amount: 0,
    });
    expect(result).toContain('D6=0000000000000123');
  });

  it('normalizes pasted account number before padding', () => {
    const result = generateTWQR({
      bankCode: '812',
      accountNumber: '\uFEFF00-123 456 7890',
      amount: 0,
    });
    expect(result).toContain('D6=0000001234567890');
  });

  it('includes note when provided', () => {
    const result = generateTWQR({
      bankCode: '812',
      accountNumber: '1234567890',
      amount: 0,
      note: '午餐費',
    });
    expect(result).toContain('D9=');
  });
});

describe('isValidAccount', () => {
  it('accepts 10-digit account', () => {
    expect(isValidAccount('1234567890')).toBe(true);
  });

  it('accepts 16-digit account', () => {
    expect(isValidAccount('1234567890123456')).toBe(true);
  });

  it('rejects 9-digit account', () => {
    expect(isValidAccount('123456789')).toBe(false);
  });

  it('rejects 17-digit account', () => {
    expect(isValidAccount('12345678901234567')).toBe(false);
  });

  it('rejects non-digit chars', () => {
    expect(isValidAccount('12345678a0')).toBe(false);
  });
});

describe('isShortAccount', () => {
  it('accepts 1-digit', () => {
    expect(isShortAccount('5')).toBe(true);
  });

  it('accepts 9-digit', () => {
    expect(isShortAccount('123456789')).toBe(true);
  });

  it('rejects 10-digit', () => {
    expect(isShortAccount('1234567890')).toBe(false);
  });

  it('rejects empty', () => {
    expect(isShortAccount('')).toBe(false);
  });
});

describe('formatCurrency', () => {
  it('formats positive amount', () => {
    const result = formatCurrency(1000);
    expect(result).toContain('1,000');
  });

  it('formats zero', () => {
    const result = formatCurrency(0);
    expect(result).toContain('0');
  });
});

describe('formatAmount', () => {
  it('formats with thousand separator', () => {
    expect(formatAmount(1234567)).toBe('1,234,567');
  });
});

describe('maskAccount', () => {
  it('masks 10-digit account', () => {
    expect(maskAccount('1234567890')).toBe('•••• •••• 7890');
  });

  it('returns short account as-is', () => {
    expect(maskAccount('1234')).toBe('1234');
  });

  it('returns 3-digit as-is', () => {
    expect(maskAccount('123')).toBe('123');
  });
});

describe('formatAccountDisplay', () => {
  it('formats 10-digit account in groups of 4', () => {
    expect(formatAccountDisplay('1234567890')).toBe('0012 3456 7890');
  });

  it('returns empty for empty string', () => {
    expect(formatAccountDisplay('')).toBe('');
  });
});

describe('removeInvisibleChars', () => {
  it('removes zero-width spaces', () => {
    expect(removeInvisibleChars('abc\u200Bdef')).toBe('abcdef');
  });

  it('removes BOM', () => {
    expect(removeInvisibleChars('\uFEFF123')).toBe('123');
  });

  it('keeps normal text', () => {
    expect(removeInvisibleChars('hello world')).toBe('hello world');
  });
});

describe('normalizeAccountNumber', () => {
  it('removes invisible chars, non-digits, and leading zero padding', () => {
    expect(normalizeAccountNumber('\uFEFF00-123 456 7890')).toBe('1234567890');
  });

  it('caps normalized account numbers to 16 digits', () => {
    expect(normalizeAccountNumber('12345678901234567890')).toBe('1234567890123456');
  });
});

describe('stripCompanySuffix', () => {
  it('strips 股份有限公司', () => {
    expect(stripCompanySuffix('台新國際商業銀行股份有限公司')).toBe('台新國際商業銀行');
  });

  it('keeps names without suffix', () => {
    expect(stripCompanySuffix('中華郵政')).toBe('中華郵政');
  });

  it('keeps 信用合作社', () => {
    expect(stripCompanySuffix('第一信用合作社')).toBe('第一信用合作社');
  });
});
