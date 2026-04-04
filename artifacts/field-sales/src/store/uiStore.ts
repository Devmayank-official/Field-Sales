import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { secureStorage } from "@/lib/native/secureStorage";
import { zustandPrefsStorage } from "@/lib/native/preferences";

interface UserProfile {
  name: string;
  role: string;
  phone: string;
  territory: string;
  email: string;
}

interface UiState {
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  filterStatus: string | null;
  setFilterStatus: (status: string | null) => void;

  isCreateClientOpen: boolean;
  setCreateClientOpen: (isOpen: boolean) => void;

  isCreateFridgeOpen: boolean;
  createFridgeForClientId: string | null;
  openCreateFridge: (clientId: string) => void;
  closeCreateFridge: () => void;

  isDarkMode: boolean;
  toggleDarkMode: () => void;
  setDarkMode: (val: boolean) => void;

  profile: UserProfile;
  setProfile: (profile: Partial<UserProfile>) => void;

  lockEnabled: boolean;
  pinHash: string | null;
  pinLength: number;
  biometricCredId: string | null;
  isLocked: boolean;
  enableLock: (pinHash: string, pinLength: number, biometricCredId?: string) => void;
  disableLock: () => void;
  setLocked: (locked: boolean) => void;
  setBiometricCredId: (id: string | null) => void;
}

const defaultProfile: UserProfile = {
  name: "Sales Representative",
  role: "Field Sales Agent",
  phone: "",
  territory: "",
  email: "",
};

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      searchQuery: "",
      setSearchQuery: (query: string) => set({ searchQuery: query }),

      filterStatus: null,
      setFilterStatus: (status: string | null) => set({ filterStatus: status }),

      isCreateClientOpen: false,
      setCreateClientOpen: (isOpen: boolean) => set({ isCreateClientOpen: isOpen }),

      isCreateFridgeOpen: false,
      createFridgeForClientId: null,
      openCreateFridge: (clientId: string) =>
        set({ isCreateFridgeOpen: true, createFridgeForClientId: clientId }),
      closeCreateFridge: () =>
        set({ isCreateFridgeOpen: false, createFridgeForClientId: null }),

      isDarkMode: false,
      toggleDarkMode: () =>
        set((s) => {
          const next = !s.isDarkMode;
          document.documentElement.classList.toggle("dark", next);
          return { isDarkMode: next };
        }),
      setDarkMode: (val: boolean) => {
        document.documentElement.classList.toggle("dark", val);
        set({ isDarkMode: val });
      },

      profile: defaultProfile,
      setProfile: (profile: Partial<UserProfile>) =>
        set((s) => ({ profile: { ...s.profile, ...profile } })),

      lockEnabled: false,
      pinHash: null,
      pinLength: 4,
      biometricCredId: null,
      isLocked: false,
      enableLock: (pinHash, pinLength, biometricCredId) => {
        // Write PIN hash to native keychain / localStorage (web fallback)
        secureStorage.setPin(pinHash).catch(() => {});
        if (biometricCredId) {
          secureStorage.setBioCred(biometricCredId).catch(() => {});
        }
        set({
          lockEnabled: true,
          pinHash,
          pinLength,
          biometricCredId: biometricCredId ?? null,
          isLocked: false,
        });
      },
      disableLock: () => {
        secureStorage.clearPin().catch(() => {});
        secureStorage.clearBioCred().catch(() => {});
        set({ lockEnabled: false, pinHash: null, pinLength: 4, biometricCredId: null, isLocked: false });
      },
      setLocked: (locked) => set({ isLocked: locked }),
      setBiometricCredId: (id) => {
        if (id) secureStorage.setBioCred(id).catch(() => {});
        else secureStorage.clearBioCred().catch(() => {});
        set({ biometricCredId: id });
      },
    }),
    {
      name: "field-sales-ui",
      storage: createJSONStorage(() => zustandPrefsStorage),
      partialize: (s) => ({
        isDarkMode: s.isDarkMode,
        profile: s.profile,
        lockEnabled: s.lockEnabled,
        pinHash: s.pinHash,
        pinLength: s.pinLength,
        biometricCredId: s.biometricCredId,
      }),
    }
  )
);
