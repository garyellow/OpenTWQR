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
  { value: 0 },
  { value: 10_000 },
  { value: 60_000 },
  { value: 300_000 },
  { value: 3_600_000 },
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
      version: 2,
      storage: createJSONStorage(() => idbStorage),
      partialize: (state) => ({
        isEnabled: state.isEnabled,
        credentialId: state.credentialId,
        lockTimeout: state.lockTimeout,
      }),
      migrate: (persisted, fromVersion) => {
        const state = persisted as Partial<AuthState>;
        if (fromVersion < 2) {
          // The 30s option was removed. Reset any stale value to the default (10s).
          const validValues = LOCK_TIMEOUT_OPTIONS.map((o) => o.value as number);
          if (state.lockTimeout !== undefined && !validValues.includes(state.lockTimeout)) {
            state.lockTimeout = 10_000;
          }
        }
        return state;
      },
      onRehydrateStorage: () => () => {
        useAuthStore.setState({ isHydrated: true });
      },
    },
  ),
);
