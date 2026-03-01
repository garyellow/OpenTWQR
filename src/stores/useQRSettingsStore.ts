import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { safeGetItem, safeSetItem, safeRemoveItem } from '../utils/safeStorage';

export type QRLogoType = 'opentwqr' | 'bank';

interface QRSettingsState {
  /** Which logo to display in QR center: OpenTWQR brand or bank favicon. */
  logoType: QRLogoType;
  /** Whether to show masked account number above the QR image. */
  showAccount: boolean;
  /** Whether to show the official bank name on the QR card. */
  showBankName: boolean;
  /** Custom display name shown on the QR card (e.g. person's name). */
  customName: string;
  setLogoType: (type: QRLogoType) => void;
  setShowAccount: (show: boolean) => void;
  setShowBankName: (show: boolean) => void;
  setCustomName: (name: string) => void;
}

/**
 * Safe localStorage adapter — mirrors the pattern in useThemeStore.
 * Uses localStorage (synchronous) so QR settings are available immediately
 * without async hydration. Not sensitive data, so localStorage is fine.
 */
const safeLocalStorage: Storage = {
  get length() { try { return localStorage.length; } catch { return 0; } },
  key(index) { try { return localStorage.key(index); } catch { return null; } },
  clear() { try { localStorage.clear(); } catch { /* noop */ } },
  getItem: (key) => safeGetItem(key),
  setItem: (key, value) => { safeSetItem(key, value); },
  removeItem: (key) => { safeRemoveItem(key); },
};

export const useQRSettingsStore = create<QRSettingsState>()(
  persist(
    (set) => ({
      logoType: 'opentwqr',
      showAccount: false,
      showBankName: false,
      customName: '',
      setLogoType: (logoType) => set({ logoType }),
      setShowAccount: (showAccount) => set({ showAccount }),
      setShowBankName: (showBankName) => set({ showBankName }),
      setCustomName: (customName) => set({ customName }),
    }),
    {
      name: 'opentwqr-qr-settings',
      storage: createJSONStorage(() => safeLocalStorage),
    },
  ),
);
