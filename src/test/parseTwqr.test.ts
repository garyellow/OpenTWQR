import { describe, it, expect } from 'vitest';
import { parseTWQR, isTWQR } from '../utils/parseTwqr';

describe('parseTWQR', () => {
  const VALID_QR = 'TWQRP://xn--gmqw5ax42ad01c/158/02/V1?D5=812&D6=0000001234567890&D1=100000&D10=901&D9=test';

  it('parses valid TWQR string', () => {
    const result = parseTWQR(VALID_QR);
    expect(result).toEqual({
      bankCode: '812',
      accountNumber: '1234567890',
      amount: 1000,
      note: 'test',
    });
  });

  it('strips leading zeros from account number', () => {
    const qr = 'TWQRP://xn--gmqw5ax42ad01c/158/02/V1?D5=004&D6=0000001234567890';
    const result = parseTWQR(qr);
    expect(result?.accountNumber).toBe('1234567890');
  });

  it('returns "0" for all-zero account', () => {
    const qr = 'TWQRP://xn--gmqw5ax42ad01c/158/02/V1?D5=004&D6=0000000000000000';
    const result = parseTWQR(qr);
    expect(result?.accountNumber).toBe('0');
  });

  it('returns amount 0 when D1 is absent', () => {
    const qr = 'TWQRP://xn--gmqw5ax42ad01c/158/02/V1?D5=812&D6=0000001234567890';
    const result = parseTWQR(qr);
    expect(result?.amount).toBe(0);
  });

  it('returns amount 0 for malformed D1 (NaN guard)', () => {
    const qr = 'TWQRP://xn--gmqw5ax42ad01c/158/02/V1?D5=812&D6=0000001234567890&D1=abc';
    const result = parseTWQR(qr);
    expect(result?.amount).toBe(0);
  });

  it('rounds fractional amounts correctly', () => {
    const qr = 'TWQRP://xn--gmqw5ax42ad01c/158/02/V1?D5=812&D6=0000001234567890&D1=150';
    const result = parseTWQR(qr);
    expect(result?.amount).toBe(2); // Math.round(150/100) = 2
  });

  it('handles URL-encoded input', () => {
    const encoded = encodeURIComponent(VALID_QR);
    const result = parseTWQR(encoded);
    expect(result).not.toBeNull();
    expect(result?.bankCode).toBe('812');
  });

  it('returns null for empty string', () => {
    expect(parseTWQR('')).toBeNull();
  });

  it('returns null for non-TWQR string', () => {
    expect(parseTWQR('https://example.com')).toBeNull();
  });

  it('returns null for TWQR missing required fields', () => {
    const qr = 'TWQRP://xn--gmqw5ax42ad01c/158/02/V1?D5=812';
    expect(parseTWQR(qr)).toBeNull();
  });

  it('returns undefined note when D9 absent', () => {
    const qr = 'TWQRP://xn--gmqw5ax42ad01c/158/02/V1?D5=812&D6=0000001234567890';
    const result = parseTWQR(qr);
    expect(result?.note).toBeUndefined();
  });
});

describe('isTWQR', () => {
  it('returns true for valid TWQR prefix', () => {
    expect(isTWQR('TWQRP://xn--gmqw5ax42ad01c/158/02/V1?D5=812')).toBe(true);
  });

  it('returns true for URL-encoded TWQR', () => {
    expect(isTWQR('TWQRP%3A%2F%2Fxn--gmqw5ax42ad01c')).toBe(true);
  });

  it('returns false for non-TWQR string', () => {
    expect(isTWQR('https://example.com')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isTWQR('')).toBe(false);
  });
});
