import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { idbStorage } from './idbStorage';

interface AuthState {
  /** Whether app lock is enabled by the user (persisted). */
  isEnabled: boolean;
  /** Base64-encoded WebAuthn credential ID (persisted). */
  credentialId: string | null;
  /** Auto-lock timeout in milliseconds when app goes to background (persisted). */
  lockTimeout: number;
  /** Whether the store has been rehydrated from IndexedDB. */
  isHydrated: boolean;
  /** Whether the current session is unlocked (transient, not persisted). */
  isUnlocked: boolean;

  enable: (credentialId: string) => void;
  disable: () => void;
  unlock: () => void;
  lock: () => void;
  setLockTimeout: (ms: number) => void;
}

/** Available lock timeout presets (milliseconds). */
export const LOCK_TIMEOUT_OPTIONS = [
  { value: 0, label: '立即' },
  { value: 10_000, label: '10 秒' },
  { value: 30_000, label: '30 秒' },
  { value: 60_000, label: '1 分鐘' },
  { value: 300_000, label: '5 分鐘' },
] as const;

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isEnabled: false,
      credentialId: null,
      lockTimeout: 10_000,
      isHydrated: false,
      isUnlocked: false,

      enable: (credentialId) => set({ isEnabled: true, credentialId, isUnlocked: true }),
      disable: () => set({ isEnabled: false, credentialId: null, isUnlocked: true }),
      unlock: () => set({ isUnlocked: true }),
      lock: () => set({ isUnlocked: false }),
      setLockTimeout: (ms) => set({ lockTimeout: ms }),
    }),
    {
      name: 'opentwqr-auth',
      version: 1,
      storage: createJSONStorage(() => idbStorage),
      partialize: (state) => ({
        isEnabled: state.isEnabled,
        credentialId: state.credentialId,
        lockTimeout: state.lockTimeout,
      }),
      onRehydrateStorage: () => () => {
        useAuthStore.setState({ isHydrated: true });
      },
    },
  ),
);
