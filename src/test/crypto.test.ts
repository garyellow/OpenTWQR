import { describe, expect, it } from 'vitest';
import { fromBase64Url, toBase64Url } from '../utils/crypto';

describe('base64url helpers', () => {
  it('round-trips byte arrays across padding lengths', () => {
    const cases = [
      new Uint8Array([]),
      new Uint8Array([0]),
      new Uint8Array([0, 1]),
      new Uint8Array([0, 1, 2]),
      new Uint8Array([255, 254, 253, 252, 0, 1, 2, 3]),
    ];

    for (const bytes of cases) {
      expect(Array.from(fromBase64Url(toBase64Url(bytes)))).toEqual(Array.from(bytes));
    }
  });

  it('encodes large arrays without stack or string-concatenation issues', () => {
    const bytes = new Uint8Array(70_000);
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = i % 251;
    }

    const encoded = toBase64Url(bytes);
    expect(encoded).not.toContain('+');
    expect(encoded).not.toContain('/');
    expect(encoded).not.toContain('=');
    expect(Array.from(fromBase64Url(encoded))).toEqual(Array.from(bytes));
  });
});
