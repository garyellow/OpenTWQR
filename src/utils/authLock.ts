/**
 * WebAuthn-based local authentication utilities for PWA app lock.
 *
 * Uses the Web Authentication API purely client-side (no server required).
 * Verification data never leaves the device — WebAuthn only confirms that
 * the user verified their identity via the platform authenticator (Touch ID,
 * Face ID, Windows Hello, PIN, etc.).
 */

/** Generate cryptographically random bytes for use as a WebAuthn challenge. */
const generateChallenge = (): ArrayBuffer => {
  const buf = new ArrayBuffer(32);
  crypto.getRandomValues(new Uint8Array(buf));
  return buf;
};

/** Encode an ArrayBuffer to a URL-safe Base64 string for storage. */
const bufferToBase64 = (buffer: ArrayBuffer): string =>
  btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

/** Decode a URL-safe Base64 string back to an ArrayBuffer. */
const base64ToBuffer = (base64: string): ArrayBuffer => {
  const padded = base64.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded);
  const buf = new ArrayBuffer(binary.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < binary.length; i++) view[i] = binary.charCodeAt(i);
  return buf;
};

/**
 * Check whether the device supports WebAuthn with a built-in platform
 * authenticator that can verify the user (biometrics / screen lock).
 */
export const isWebAuthnSupported = async (): Promise<boolean> => {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
};

/**
 * Register a new WebAuthn credential using the platform authenticator.
 *
 * @returns The credential ID as a Base64 string, or `null` if the user
 *          cancelled or the operation failed.
 */
export const registerCredential = async (): Promise<string | null> => {
  try {
    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge: generateChallenge(),
        rp: { name: 'OpenTWQR' },
        user: {
          id: generateChallenge(),   // Random user ID (single-user local app)
          name: 'opentwqr-user',
          displayName: 'OpenTWQR 使用者',
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },   // ES256
          { alg: -257, type: 'public-key' },  // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'discouraged',
        },
        timeout: 60_000,
      },
    })) as PublicKeyCredential | null;

    return credential ? bufferToBase64(credential.rawId) : null;
  } catch {
    return null;
  }
};

/**
 * Authenticate using an existing WebAuthn credential.
 *
 * Prompts the user for biometric / screen-lock verification. No server
 * round-trip is needed — the ceremony succeeding is proof enough for a
 * local app-lock use-case.
 *
 * @returns `true` if authentication succeeded, `false` otherwise.
 */
export const authenticate = async (credentialId: string): Promise<boolean> => {
  try {
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: generateChallenge(),
        allowCredentials: [
          {
            id: base64ToBuffer(credentialId),
            type: 'public-key',
          },
        ],
        userVerification: 'required',
        timeout: 60_000,
      },
    });

    return assertion !== null;
  } catch {
    return false;
  }
};
