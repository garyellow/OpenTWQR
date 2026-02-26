import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { idbStorage } from './idbStorage';

interface AuthState {
  /** Whether app lock is enabled by the user (persisted). */
  isEnabled: boolean;
  /** Base64-encoded WebAuthn credential ID (persisted). */
  credentialId: string | null;
  /** Whether the store has been rehydrated from IndexedDB. */
  isHydrated: boolean;
  /** Whether the current session is unlocked (transient, not persisted). */
  isUnlocked: boolean;

  enable: (credentialId: string) => void;
  disable: () => void;
  unlock: () => void;
  lock: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isEnabled: false,
      credentialId: null,
      isHydrated: false,
      isUnlocked: false,

      enable: (credentialId) => set({ isEnabled: true, credentialId, isUnlocked: true }),
      disable: () => set({ isEnabled: false, credentialId: null, isUnlocked: true }),
      unlock: () => set({ isUnlocked: true }),
      lock: () => set({ isUnlocked: false }),
    }),
    {
      name: 'opentwqr-auth',
      version: 1,
      storage: createJSONStorage(() => idbStorage),
      partialize: (state) => ({
        isEnabled: state.isEnabled,
        credentialId: state.credentialId,
      }),
      onRehydrateStorage: () => () => {
        useAuthStore.setState({ isHydrated: true });
      },
    },
  ),
);
